/* 爬虫原型拓展   --功能  --功能 */

import { BoostedPartData } from "@/constant/BoostConstant";
import { isInArray, getDistance1 } from "@/utils";


export default class CreepFunctionExtension extends Creep {
    /**
     * 
     * working状态
     */
    public workstate(rType: ResourceConstant = RESOURCE_ENERGY): void {
        if (!this.memory.working) this.memory.working = false;
        if (this.memory.working && this.store[rType] == 0) {
            this.memory.working = false;
        }
        if (!this.memory.working && this.store.getFreeCapacity() == 0) {
            this.memory.working = true;
        }
    }

    public harvest_(source_: Source | Mineral): void {
        if (this.harvest(source_) == ERR_NOT_IN_RANGE) {
            this.goTo(source_.pos, 1)
            this.memory.standed = false
        }
        else this.memory.standed = true

    }

    public transfer_(distination: Structure, rType: ResourceConstant = RESOURCE_ENERGY): ScreepsReturnCode {
        let a = this.transfer(distination, rType);
        if (a == ERR_NOT_IN_RANGE) this.goTo(distination.pos, 1);
        this.memory.standed = false
        return a;
    }

    public upgrade_(): void {
        if (this.room.controller) {
            if (this.upgradeController(this.room.controller) == ERR_NOT_IN_RANGE) {
                this.goTo(this.room.controller.pos, 1)
                this.memory.standed = false
            }
            else this.memory.standed = true
        }
    }

    // 考虑到建筑和修复有可能造成堵虫，所以解除钉扎状态
    public build_(distination: ConstructionSite): void {
        if (this.build(distination) == ERR_NOT_IN_RANGE) {
            this.goTo(distination.pos, 1)
            this.memory.standed = false
        }
        else
            this.memory.standed = true
    }

    public repair_(distination: Structure): void {
        if (this.repair(distination) == ERR_NOT_IN_RANGE) {
            this.goTo(distination.pos, 1)
            this.memory.standed = false
        }
        else
            this.memory.standed = true
    }

    public withdraw_(distination: Structure | Ruin, rType: ResourceConstant = RESOURCE_ENERGY): ScreepsReturnCode {
        let a = this.withdraw(distination, rType);
        if (a == ERR_NOT_IN_RANGE) this.goTo(distination.pos, 1);
        this.memory.standed = false
        return a;
    }

    // 确认是否boost了,并进行相应Boost
    public BoostCheck(boostBody: string[]): boolean {
        for (var body in this.memory.boostData) {
            if (!isInArray(boostBody, body)) continue
            if (!this.memory.boostData[body].boosted) {
                var tempID: string
                var thisRoomMisson = Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)
                if (!thisRoomMisson) return false

                LoopB:
                for (var j in thisRoomMisson.LabBind) {
                    if (BoostedPartData[thisRoomMisson.LabBind[j]] && body == BoostedPartData[thisRoomMisson.LabBind[j]]) {
                        tempID = j
                        break LoopB
                    }
                }
                if (!tempID) continue
                var disLab = Game.getObjectById(tempID) as StructureLab
                if (!disLab) continue
                // 计算body部件
                let s = 0
                for (var b of this.body) {
                    if (b.type == body) s++
                }
                if (!disLab.mineralType) return false
                if (!this.pos.isNearTo(disLab)) this.goTo(disLab.pos, 1)
                else {
                    for (var i of this.body) {
                        if (i.type == body && i.boost != thisRoomMisson.LabBind[tempID]) { disLab.boostCreep(this); return false }
                    }
                    this.memory.boostData[body] = { boosted: true, num: s, type: thisRoomMisson.LabBind[tempID] as ResourceConstant }
                }
                return false
            }
        }
        return true
    }

    //清除boost 
    public unBoost(): boolean {
        if (this.room.name != this.memory.belong) { this.goTo(new RoomPosition(25, 25, this.memory.belong), 23); return true }
        let unBody = 0
        for (let body of this.body) {
            if (body.boost) unBody++;
        }
        if (!unBody) return false
        //找到挨着的小罐子和lab
        if (this.store.getUsedCapacity()) this.transfer_(this.room.storage ? this.room.storage : this.room.terminal, Object.keys(this.store)[0] as ResourceConstant);
        if (!this.memory.unBoostContainer) {
            let container = this.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function (object) {
                    return object.structureType == STRUCTURE_CONTAINER &&
                        object.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: function (object) { return object.structureType == STRUCTURE_LAB; } }).length
                }
            }) as StructureContainer;
            if (container) this.memory.unBoostContainer = container.id;
        }
        else {
            let container = Game.getObjectById(this.memory.unBoostContainer);
            if (!container) { delete this.memory.unBoostContainer; return true }
            if (container.store.getUsedCapacity() >= 1000) {
                let a = this.room.storage ? this.room.storage : this.room.terminal;
                let thisTask = this.room.Public_Carry({ 'transport': { num: 2, bind: [] } }, 50, this.name, container.pos.x, container.pos.y, this.name, a.pos.x, a.pos.y, Object.keys(container.store)[0] as ResourceConstant, container.store[Object.keys(container.store)[0]])
                this.room.AddMission(thisTask)
            }
            if (getDistance1(this.pos, container.pos) == 0) {
                let creep_ = this;
                let lab = this.pos.findClosestByRange(FIND_MY_STRUCTURES, { filter: function (object) { return object.structureType == STRUCTURE_LAB && object.cooldown < creep_.ticksToLive - 4 && getDistance1(object.pos, container.pos) <= 1; } }) as StructureLab
                if (lab && lab.unboostCreep(this) == OK) this.suicide();
                else { this.suicide(); }
            }
            else {
                if (!this.store.getUsedCapacity())
                    this.goTo(container.pos, 0);
            }
        }
        return true;
    }

    // 召唤所有房间内的防御塔治疗/攻击 自己/爬虫 [不一定成功]
    public optTower(otype: 'heal' | 'attack', creep: Creep): void {
        if (this.room.name != this.memory.belong || Game.shard.name != this.memory.shard) return
        for (var i of Game.rooms[this.memory.belong].memory.StructureIdData.AtowerID) {
            let tower_ = Game.getObjectById(i) as StructureTower
            if (!tower_) continue
            if (otype == 'heal') {
                tower_.heal(creep)
            }
            else {
                tower_.attack(creep)
            }
        }
    }

    public isInDefend(creep: Creep): boolean {
        for (var i in Game.rooms[this.memory.belong].memory.enemy) {
            for (var id of Game.rooms[this.memory.belong].memory.enemy[i])
                if (creep.id == id) return true
        }
        return false
    }
}