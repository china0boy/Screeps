/* 爬虫原型拓展   --功能  --功能 */

import { BoostedPartData } from "@/constant/BoostConstant";
import { isInArray, getDistance1, minDistanceRoom } from "@/utils";


export default class CreepFunctionExtension extends Creep {
    //躲避核弹
    public handle_nuke(): boolean {
        if (this.memory.nuke == undefined) this.memory.nuke = {};
        let myroom = Game.rooms[this.memory.belong]
        if (!myroom || !myroom.memory.nukeID || myroom.memory.nukeID.length <= 0) return false
        //检测核弹落地时间
        if (Game.time % 10 == 0) {
            let nukeTime = 50000;
            for (let i of myroom.memory.nukeID) {
                let nuke = Game.getObjectById(i) as Nuke;
                if (!nuke) continue
                if (nuke.timeToLand <= nukeTime) nukeTime = nuke.timeToLand;
            }
            if (nukeTime <= 200) this.memory.nuke.on = true;
            else this.memory.nuke.on = false;
        }
        if (!this.memory.nuke.on || Game.rooms[this.memory.belong].memory.state == 'war') return false
        if (this.store.getUsedCapacity() && this.pos.roomName == myroom.name) {
            let structure = this.room.storage ? this.room.storage : this.room.terminal ? this.room.terminal : null
            if (!structure) this.suicide();
            this.transfer_(structure, Object.keys(this.store)[0] as ResourceConstant)
            return true
        }
        //去等待房间F
        if (this.memory.nuke.exitRoom) {
            this.say(`核弹来咯，溜溜球`, true)
            this.goTo(new RoomPosition(24, 24, this.memory.nuke.exitRoom), 15)
        }
        else {
            //获取出口
            if (!this.memory.nuke.exitPos && this.pos.roomName == myroom.name) {
                let exit = this.pos.findClosestByPath(FIND_EXIT, { filter: function (object) { return !object.lookFor(LOOK_STRUCTURES).length } })
                if (exit) this.memory.nuke.exitPos = { x: exit.x, y: exit.y, roomName: exit.roomName }
            }
            if (!this.memory.nuke.exitPos) return false//还没有就不在本房间就不管了
            //获取等待房间
            if (this.memory.nuke.exitPos) {
                this.say(`核弹来咯，溜溜球`, true)
                this.goTo(new RoomPosition(this.memory.nuke.exitPos.x, this.memory.nuke.exitPos.y, this.memory.nuke.exitPos.roomName), 0)
                if (this.pos.roomName != myroom.name) {
                    delete this.memory.nuke.exitPos;
                    this.memory.nuke.exitRoom = this.pos.roomName
                }
            }
        }
        return true
    }

    /* working状态 */
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
            //    this.memory.standed = false
        }
        //else
        //    this.memory.standed = true
    }

    public repair_(distination: Structure): void {
        if (this.repair(distination) == ERR_NOT_IN_RANGE) {
            this.goTo(distination.pos, 3)
            this.memory.standed = false
        }
        //else
        //    this.memory.standed = true
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
                let s = this.getActiveBodyparts(body as BodyPartConstant)
                if (!disLab.mineralType) return false
                if (thisRoomMisson.LabBind[tempID] != disLab.mineralType) return false
                //计算lab资源是否够boost
                let energyNum = s * 20
                let typeNum = s * 30
                if (disLab.store.getUsedCapacity('energy') < energyNum || disLab.store.getUsedCapacity(disLab.mineralType) < typeNum) return false
                //去boost
                if (!this.pos.isNearTo(disLab)) { this.goTo(disLab.pos, 1); return false }
                else {
                    for (var i of this.body) {
                        if (i.type == body && i.boost != thisRoomMisson.LabBind[tempID]) {
                            disLab.boostCreep(this);
                            this.memory.boostData[body] = { boosted: true, num: s, type: thisRoomMisson.LabBind[tempID] as ResourceConstant }
                            //return false
                        }
                    }
                }
                //return false
            }
        }
        return true
    }

    //清除boost 
    public unBoost(): boolean {
        if (this.memory.unBoostRoom) {
            if (this.room.name != this.memory.unBoostRoom) { this.goTo(new RoomPosition(25, 25, this.memory.unBoostRoom), 23); return true }
        }
        else this.memory.unBoostRoom = minDistanceRoom(this.pos.roomName, 6)
        let unBody = 0
        for (let body of this.body) {
            if (body.boost) unBody++;
        }
        if (!unBody) return false
        if (this.store.getUsedCapacity()) this.transfer_(this.room.storage ? this.room.storage : this.room.terminal, Object.keys(this.store)[0] as ResourceConstant);
        if (Game.rooms[this.memory.unBoostRoom].memory.StructureIdData.UnBoostId) {//找到挨着的小罐子和lab
            let container = Game.getObjectById(Game.rooms[this.memory.unBoostRoom].memory.StructureIdData.UnBoostId) as StructureContainer;
            if (!container) { delete Game.rooms[this.memory.unBoostRoom].memory.StructureIdData.UnBoostId; return true }
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
        else return false
        return true;
    }

    // 召唤房间内的所有防御塔治疗/攻击 自己/爬虫 [不一定成功]
    public optTower(otype: 'heal' | 'attack', creep: Creep): void {
        if (!Memory.RoomControlData[this.pos.roomName] || !Game.rooms[this.pos.roomName].memory.StructureIdData || !Game.rooms[this.pos.roomName].memory.StructureIdData.AtowerID) return
        for (var i of Game.rooms[this.pos.roomName].memory.StructureIdData.AtowerID) {
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

    // 寻找数组里距离自己最近的爬虫 hurt为true则去除没有攻击部件的爬
    public closestCreep(creep: Creep[], hurt?: boolean): Creep {
        if (creep.length <= 0) return null
        let result = creep[0]
        // 计算距离
        for (var i of creep) {
            // 距离
            if (hurt) {
                if (!i.getActiveBodyparts('attack') && !i.getActiveBodyparts('ranged_attack')) continue
            }
            let distance0 = Math.max(Math.abs(this.pos.x - result.pos.x), Math.abs(this.pos.y - result.pos.y))
            let distance1 = Math.max(Math.abs(this.pos.x - i.pos.x), Math.abs(this.pos.y - i.pos.y))
            if (distance1 < distance0)
                result = i
        }
        return result
    }
}