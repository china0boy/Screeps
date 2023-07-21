import structure from "@/mount/structure";
import { isOPWR } from "./constant"

export default class PowerCreepMissonAction extends PowerCreep {
    //躲避核弹
    public handle_nuke(): boolean {
        if (this.memory.nuke == undefined) this.memory.nuke = {};
        let myroom = Game.rooms[this.memory.belong]
        if (!myroom || myroom.memory.nukeID.length <= 0) return false
        //检测核弹落地时间
        if (Game.time % 50 == 0) {
            let nukeTime = 50000;
            for (let i of myroom.memory.nukeID) {
                let nuke = Game.getObjectById(i) as Nuke;
                if (!nuke) continue
                if (nuke.timeToLand <= nukeTime) nukeTime = nuke.timeToLand;
            }
            if (nukeTime <= 200) this.memory.nuke.on = true;
            else this.memory.nuke.on = false;
        }
        if (!this.memory.nuke.on) return false
        //去等待房间
        if (this.memory.nuke.exitRoom) {
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
                this.goTo(new RoomPosition(this.memory.nuke.exitPos.x, this.memory.nuke.exitPos.y, this.memory.nuke.exitPos.roomName), 0)
                if (this.pos.roomName != myroom.name) {
                    delete this.memory.nuke.exitPos;
                    this.memory.nuke.exitRoom = this.pos.roomName
                }
            }
        }
        return true
    }

    // 操作仓库
    public handle_pwr_storage(): void {
        var storage_ = Game.rooms[this.memory.belong].storage
        if (this.powers[PWR_OPERATE_STORAGE].cooldown || !storage_) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(storage_.pos, 3)) {
            this.goTo(storage_.pos, 3)
            return
        }
        else {
            let a = this.usePower(PWR_OPERATE_STORAGE, storage_)
            if (a == OK) {
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
            }
            else console.log(`${this} : ${a} `)
        }
    }

    // 操作tower
    public handle_pwr_tower(): void {
        if (this.powers[PWR_OPERATE_TOWER].cooldown) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        for (var id of this.memory.MissionData.Data.tower) {
            var tower_ = Game.getObjectById(id) as StructureTower
            if (!isOPWR(tower_)) {
                if (!this.pos.inRangeTo(tower_.pos, 3)) {
                    this.goTo(tower_.pos, 3)
                }
                else {
                    if (this.usePower(PWR_OPERATE_TOWER, tower_) == OK)
                        if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                            Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                            this.memory.MissionData = {}
                        }
                        else this.memory.MissionData = {}
                }
                return
            }
        }
    }

    // 操作lab
    public handle_pwr_lab(): void {
        if (this.powers[PWR_OPERATE_LAB] && this.powers[PWR_OPERATE_LAB].cooldown) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else
                this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        for (var id of this.memory.MissionData.Data.lab) {
            var lab_ = Game.getObjectById(id) as StructureTower
            if (!isOPWR(lab_)) {
                if (!this.pos.inRangeTo(lab_.pos, 3)) {
                    this.goTo(lab_.pos, 3)
                }
                else {
                    if (this.usePower(PWR_OPERATE_LAB, lab_) == OK)
                        if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                            Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                            this.memory.MissionData = {}
                        }
                        else this.memory.MissionData = {}
                }
                return
            }
        }
    }

    // 操作拓展
    public handle_pwr_extension(): void {
        var storage_ = Game.rooms[this.memory.belong].storage
        var terminal_ = Game.rooms[this.memory.belong].terminal
        let structure = storage_ ? (terminal_ ? (storage_.store.energy >= terminal_.store.energy ? storage_ : terminal_) : storage_) : terminal_ ? terminal_ : null
        if (this.powers[PWR_OPERATE_EXTENSION].cooldown || !structure) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(structure.pos, 3)) {
            this.goTo(structure.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_OPERATE_EXTENSION, structure) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

    /* 操作孵化 */
    public handle_pwr_spawn(): void {
        if (this.powers[PWR_OPERATE_SPAWN].cooldown) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        var spawningSpawn = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (stru) => {
                return stru.structureType == 'spawn'
            }
        })
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(spawningSpawn.pos, 3)) {
            this.goTo(spawningSpawn.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_OPERATE_SPAWN, spawningSpawn) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

    /* 操作工厂 */
    public handle_pwr_factory(): void {
        var factory_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.FactoryId) as StructureFactory
        if (this.powers[PWR_OPERATE_FACTORY].cooldown || !factory_) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(factory_.pos, 3)) {
            this.goTo(factory_.pos, 3)
            return
        }
        else {
            let a = this.usePower(PWR_OPERATE_FACTORY, factory_)
            if (a == OK) {
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
            }
            else console.log(`${this} : ${a} `)
        }
    }

    /* 操作powerspawn */
    public handle_pwr_powerspawn(): void {
        var powerspawn_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.PowerSpawnID) as StructurePowerSpawn
        if (this.powers[PWR_OPERATE_POWER].cooldown || !powerspawn_) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(powerspawn_.pos, 3)) {
            this.goTo(powerspawn_.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_OPERATE_POWER, powerspawn_) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

    // 操作source
    public handle_pwr_source(): void {
        if (this.powers[PWR_REGEN_SOURCE].cooldown) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        for (var id of this.memory.MissionData.Data.source_) {
            var source = Game.getObjectById(id) as Source
            if (!this.pos.inRangeTo(source.pos, 3)) {
                this.goTo(source.pos, 3)
                return
            }
            else {
                if (this.usePower(PWR_REGEN_SOURCE, source) == OK)
                    if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                        Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                        this.memory.MissionData = {}
                    }
                    else this.memory.MissionData = {}
            }
        }
    }

    // 操作mineral
    public handle_pwr_mineral(): void {
        let mineral = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.mineralID) as Mineral;
        if (this.powers[PWR_REGEN_MINERAL].cooldown || !mineral) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
            return
        }
        if (!this.pos.inRangeTo(mineral.pos, 3)) {
            this.goTo(mineral.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_REGEN_MINERAL, mineral) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

}