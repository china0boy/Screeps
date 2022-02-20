/* 爬虫原型拓展   --功能  --功能 */

import { BoostedPartData } from "@/constant/BoostConstant";
import { isInArray } from "@/utils";


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

    public harvest_(source_: Source): void {
        if (this.harvest(source_) == ERR_NOT_IN_RANGE) {
            this.goTo(source_.pos, 1)
            this.memory.standed = false
        }
        else this.memory.standed = true

    }

    public transfer_(distination: Structure, rType: ResourceConstant = RESOURCE_ENERGY): void {
        if (this.transfer(distination, rType) == ERR_NOT_IN_RANGE) {
            this.goTo(distination.pos, 1)
        }
        this.memory.standed = false
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

    public withdraw_(distination: Structure, rType: ResourceConstant = RESOURCE_ENERGY): void {
        if (this.withdraw(distination, rType) == ERR_NOT_IN_RANGE) {
            this.goTo(distination.pos, 1)
        }
        this.memory.standed = false
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
}