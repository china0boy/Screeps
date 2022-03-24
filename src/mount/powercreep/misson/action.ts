import { isOPWR } from "./constant"

export default class PowerCreepMissonAction extends PowerCreep {
    // 操作仓库
    public handle_pwr_storage(): void {
        var storage_ = global.Stru[this.memory.belong]['storage'] as StructureStorage
        if (!storage_) return
        if (!this.OpsPrepare()) return
        if (isOPWR(storage_)) {
            Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
            this.memory.MissionData = {}
        }
        if (!this.pos.inRangeTo(storage_.pos, 3)) {
            this.goTo(storage_.pos, 3)
            return
        }
        else {
            if(this.usePower(PWR_OPERATE_STORAGE, storage_)==OK)
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id))
            {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else this.memory.MissionData = {}
        }
    }

    // 操作tower
    public handle_pwr_tower(): void {
        if (!this.OpsPrepare()) return
        for (var id of this.memory.MissionData.data.tower) {
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
        if (!this.OpsPrepare()) return
        for (var id of this.memory.MissionData.data.lab) {
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
        var storage_ = global.Stru[this.memory.belong]['storage'] as StructureStorage
        if (!storage_) return
        var a: StructureStorage | StructureTerminal;
        var terminal_ = global.Stru[this.memory.belong]['terminal'] as StructureTerminal
        if (storage_ && terminal_) a = storage_.store.energy >= terminal_.store.energy ? storage_ : terminal_
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(a.pos, 3)) {
            this.goTo(a.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_OPERATE_EXTENSION, a) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

    /* 操作孵化 */
    public handle_pwr_spawn(): void {
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
        var factory_ = global.Stru[this.memory.belong]['factory'] as StructureStorage
        if (!factory_) return
        if (this.powers[PWR_OPERATE_FACTORY] && this.powers[PWR_OPERATE_FACTORY].cooldown) {
            if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                this.memory.MissionData = {}
            }
            else
                this.memory.MissionData = {}
            return
        }
        if (!this.OpsPrepare()) return
        if (!this.pos.inRangeTo(factory_.pos, 3)) {
            this.goTo(factory_.pos, 3)
            return
        }
        else {
            if (this.usePower(PWR_OPERATE_FACTORY, factory_) == OK)
                if (Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)) {
                    Game.rooms[this.memory.belong].DeleteMission(this.memory.MissionData.id)
                    this.memory.MissionData = {}
                }
                else this.memory.MissionData = {}
        }
    }

    /* 操作powerspawn */
    public handle_pwr_powerspawn(): void {
        var powerspawn_ = global.Stru[this.memory.belong]['powerspawn'] as StructureStorage
        if (!powerspawn_) return
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
}