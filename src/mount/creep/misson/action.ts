import structure from "@/mount/structure"
import { filter_structure, GenerateAbility, generateID, isInArray, unzipPosition, zipPosition } from "@/utils"
import { filter } from "lodash"

/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonActionExtension extends Creep {
    // 刷墙 未完成
    public handle_repair(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!id) return
        let storage_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.storageID) as StructureStorage
        // if (!storage_){delete Game.rooms[this.memory.belong].memory.StructureIdData.storageID;return}
        this.workstate('energy')
        /* boost检查 暂缺 */
        if (mission.LabBind) {
            // 需要boost检查，必要情况下可以不检查
            let boo = false
            for (var ids in mission.LabBind) {
                var lab_ = Game.getObjectById(ids) as StructureLab
                if (!lab_ || !lab_.mineralType || lab_.store.getUsedCapacity(lab_.mineralType) < 500)
                    boo = true
            }
            if (!boo) {
                if (!this.BoostCheck(['work'])) return
            }
        }
        if (mission.Data.RepairType == 'global') {
            if (this.memory.working) {
                if (this.memory.targetID) {
                    this.say("🛠️")
                    var target_ = Game.getObjectById(this.memory.targetID) as StructureRampart
                    if (!target_) { delete this.memory.targetID; return }
                    this.repair_(target_)
                }
                else {
                    var leastRam = this.room.getListHitsleast([STRUCTURE_RAMPART, STRUCTURE_WALL], 3)
                    if (!leastRam) return
                    this.memory.targetID = leastRam.id
                }
                delete this.memory.containerID
            }
            else {
                /* 寻找hits最小的墙 */
                var leastRam = this.room.getListHitsleast([STRUCTURE_RAMPART, STRUCTURE_WALL], 3)
                if (!leastRam) return
                this.memory.targetID = leastRam.id
                if (!this.memory.containerID) {
                    var tank = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                        filter: (stru) => {
                            return stru.structureType == 'storage' ||
                                (stru.structureType == 'link' && isInArray(Game.rooms[this.memory.belong].memory.StructureIdData.comsume_link, stru.id) && stru.store.getUsedCapacity('energy') > this.store.getCapacity())
                        }
                    })
                    if (tank) this.memory.containerID = tank.id
                    else {
                        let closestStore = this.pos.findClosestByRange(FIND_STRUCTURES, { filter: (stru) => { return (stru.structureType == 'container' || stru.structureType == 'tower') && stru.store.getUsedCapacity('energy') >= this.store.getFreeCapacity() } })
                        if (closestStore) this.withdraw_(closestStore, 'energy')
                        return
                    }

                }
                let tank_ = Game.getObjectById(this.memory.containerID) as StructureStorage
                this.withdraw_(tank_, 'energy')
                // if(storage_)
                // this.withdraw_(storage_,'energy')
                // else
                // {
                //     let closestStore = this.pos.findClosestByRange(FIND_STRUCTURES,{filter:(stru)=>{return (stru.structureType == 'container' || stru.structureType == 'tower') && stru.store.getUsedCapacity('energy') >= this.store.getFreeCapacity()}})
                //     if (closestStore)this.withdraw_(closestStore,'energy')
                // }
            }
        }
        else if (mission.Data.RepairType == 'nuker') {
            // 核弹防御
            /* 防核函数  测试成功！*/
            if (!Game.rooms[this.memory.belong].memory.nukeData) return
            if (Object.keys(Game.rooms[this.memory.belong].memory.nukeData.damage).length <= 0) {
                Game.rooms[this.memory.belong].DeleteMission(id)
                return
            }
            /* 优先修spawn和terminal */
            if (!this.memory.targetID) {
                for (var dmgPoint in Game.rooms[this.memory.belong].memory.nukeData.damage) {
                    if (Game.rooms[this.memory.belong].memory.nukeData.damage[dmgPoint] <= 0) continue
                    var position_ = unzipPosition(dmgPoint)
                    if (!position_.GetStructure('rampart')) {
                        position_.createConstructionSite('rampart')
                        if (!this.memory.working) this.withdraw_(storage_, 'energy')
                        else this.build_(position_.lookFor(LOOK_CONSTRUCTION_SITES)[0])
                        return
                    }
                    this.memory.targetID = position_.GetStructure('rampart').id
                    return
                }
                if (!Game.rooms[this.memory.belong].DeleteMission(id)) this.memory.MissionData = {}
                return
            }
            else {
                if (!this.memory.working) {
                    this.memory.standed = false
                    this.withdraw_(storage_, 'energy')
                }
                else {
                    this.memory.standed = false
                    if (this.memory.crossLevel > 10) this.memory.crossLevel = 10 - Math.ceil(Math.random() * 10)
                    var wall_ = Game.getObjectById(this.memory.targetID) as StructureRampart
                    var strPos = zipPosition(wall_.pos)
                    if (!wall_ || wall_.hits >= Game.rooms[this.memory.belong].memory.nukeData.damage[strPos] + Game.rooms[this.memory.belong].memory.nukeData.rampart[strPos] + 500000) {
                        delete this.memory.targetID
                        Game.rooms[this.memory.belong].memory.nukeData.damage[strPos] = 0
                        Game.rooms[this.memory.belong].memory.nukeData.rampart[strPos] = 0
                        return
                    }
                    if (this.repair(wall_) == ERR_NOT_IN_RANGE) {
                        this.goTo(wall_.pos, 3)
                    }

                }
                return
            }
        }
    }

    // C计划
    public handle_planC(): void {
        let mission = this.memory.MissionData
        // if (Game.rooms[mission.Data.disRoom] && !Game.rooms[mission.Data.disRoom].controller.safeMode) Game.rooms[mission.Data.disRoom].controller.activateSafeMode()
        if (this.memory.role == 'cclaim') {
            if (this.room.name != mission.Data.disRoom || Game.shard.name != mission.Data.shard) {
                this.arriveTo(new RoomPosition(25, 25, mission.Data.disRoom), 20, mission.Data.shard)
                return
            }
            else {
                if (!this.pos.isNearTo(this.room.controller))
                    this.goTo(this.room.controller.pos, 1)
                else {
                    if (!this.room.controller.owner) this.claimController(this.room.controller)
                    this.signController(this.room.controller, 'better to rua BB cat at home!')
                }
            }
            // if (Game.rooms[mission.Data.disRoom].controller.level && Game.rooms[mission.Data.disRoom].controller.owner)
            // {
            //     mission.CreepBind[this.memory.role].num = 0
            // }
        }
        else {
            this.workstate('energy')
            if (this.room.name == this.memory.belong && !this.memory.working) {
                let store = this.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return (stru.structureType == 'container' ||
                            stru.structureType == 'tower' ||
                            stru.structureType == 'storage') && stru.store.getUsedCapacity('energy') >= this.store.getFreeCapacity()
                    }
                })
                if (store) {
                    this.withdraw_(store, 'energy')
                }
                return
            }
            if (!Game.rooms[mission.Data.disRoom]) {
                this.goTo(new RoomPosition(25, 25, mission.Data.disRoom), 20)
                return
            }
            if (Game.rooms[mission.Data.disRoom].controller.level >= 2) {
                global.SpecialBodyData[this.memory.belong]['cupgrade'] = GenerateAbility(1, 1, 1, 0, 0, 0, 0, 0)
            }
            if (this.memory.working) {
                if (this.room.name != mission.Data.disRoom) {
                    this.goTo(Game.rooms[mission.Data.disRoom].controller.pos, 1)
                    return
                }
                let cons = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
                if (cons) this.build_(cons)
                else { this.upgrade_(); this.say("cupgrade") }
            }
            else {
                let source = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
            }
        }
    }

    // 扩张援建
    public handle_expand(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (this.room.name != mission.Data.disRoom) {
            this.goTo(new RoomPosition(25, 25, mission.Data.disRoom), 20)
            return
        }
        this.workstate('energy')
        if (this.memory.role == 'claim') {
            if (!this.pos.isNearTo(Game.rooms[mission.Data.disRoom].controller))
                this.goTo(Game.rooms[mission.Data.disRoom].controller.pos, 1)
            else {
                this.claimController(Game.rooms[mission.Data.disRoom].controller)
                this.say("claim")
            }
            if (Game.rooms[mission.Data.disRoom].controller.level && Game.rooms[mission.Data.disRoom].controller.owner) {
                mission.CreepBind[this.memory.role].num = 0
            }
        }
        else if (this.memory.role == 'Ebuild') {
            if (this.memory.working) {
                /* 优先遭建筑 */
                let cons = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
                if (cons) {
                    this.build_(cons)
                    return
                }
                let roads = this.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return (stru.structureType == 'road' || stru.structureType == 'container') && stru.hits < stru.hitsMax
                    }
                })
                if (roads) {
                    this.repair_(roads)
                    return
                }
                let tower = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'tower' && stru.store.getFreeCapacity('energy') > 0
                    }
                })
                if (tower) {
                    this.transfer_(tower, 'energy')
                    return
                }
                let store = this.pos.getClosestStore()
                if (store) {
                    this.transfer_(store, 'energy')
                    return
                }

            }
            else {
                let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
                if (this.ticksToLive < 120 && this.store.getUsedCapacity('energy') <= 20) this.suicide()
            }
        }
        else if (this.memory.role == 'Eupgrade') {
            if (this.memory.working) {
                this.upgrade_()
            }
            else {
                let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
                if (this.ticksToLive < 120 && this.store.getUsedCapacity('energy') <= 20) this.suicide()
            }
        }
    }

    public handle_dismantle(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = missionData.Data
        if (mission.boost) {
            /* boost检查 暂缺 */
        }
        if (this.room.name != mission.disRoom) { this.goTo(new RoomPosition(25, 25, mission.disRoom), 20); return }
        /* 黄灰旗 */
        let disFlag = this.pos.findClosestByPath(FIND_FLAGS, {
            filter: (flag) => {
                return flag.color == COLOR_YELLOW && flag.secondaryColor == COLOR_GREY
            }
        })
        if (!disFlag) {
            var clostStructure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
                filter: (struc) => {
                    return !isInArray([STRUCTURE_CONTROLLER, STRUCTURE_WALL], struc.structureType)
                }
            })
            if (clostStructure) {
                clostStructure.pos.createFlag(generateID(), COLOR_YELLOW, COLOR_GREY)
                return
            }
            else
                return
        }
        let stru = disFlag.pos.lookFor(LOOK_STRUCTURES)[0]
        if (stru) {
            if (this.dismantle(stru) == ERR_NOT_IN_RANGE) {
                this.goTo(stru.pos, 1)
                return
            }
        }
        else { disFlag.remove() }
    }

    public handle_control(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let data = missionData.Data
        if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard)

        }
        else {
            let control = this.room.controller
            if (!this.pos.isNearTo(control)) this.goTo(control.pos, 1)
            else {
                if (control.owner) this.attackController(control)
                else this.reserveController(control)
            }
        }
    }
    // 急速冲级
    public handle_quickRush(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!mission) return
        // boost检查
        if (mission.LabBind && !this.BoostCheck(['work'])) return
        this.workstate('energy')
        var terminal_ = global.Stru[this.memory.belong]['terminal'] as StructureTerminal
        if (!terminal_) { this.say("找不到terminal!"); return }
        if (this.memory.working) {
            this.upgrade_()
            if (this.store.getUsedCapacity('energy') < 35 && terminal_.pos.isNearTo(this))
                this.withdraw_(terminal_, 'energy')
        }
        else {
            this.withdraw_(terminal_, 'energy')
        }
        this.memory.standed = mission.Data.standed
    }

    public handle_support(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let data = missionData.Data
        if (!missionData) return
        var roomName = data.disRoom
        if (this.room.name == this.memory.belong) {
            if (this.memory.role == 'double-attack') {
                if (!this.BoostCheck(['attack', 'move', 'tough'])) return
            }
            else if (this.memory.role == 'double-heal') {
                if (!this.BoostCheck(['heal', 'move', 'tough'])) return
            }
        }
        if (!this.memory.double) {
            if (this.memory.role == 'double-heal') {
                /* 由heal来进行组队 */
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return creep.memory.role == 'double-attack' && !creep.memory.double
                        }
                    })
                    if (disCreep) {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                        this.memory.captain = false
                        disCreep.memory.captain = true
                    }
                }
            }
            return
        }
        if (this.memory.role == 'double-attack') {
            if (!Game.creeps[this.memory.double]) return
            if (this.fatigue || Game.creeps[this.memory.double].fatigue) return
            if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
                return
            /* 去目标房间 */
            if (this.room.name != roomName) {
                this.goTo(new RoomPosition(24, 24, roomName), 23)
            }
            else {
                let flag = this.pos.findClosestByRange(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.color == COLOR_BLUE
                    }
                })
                if (flag) {
                    let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
                        filter: (creep) => {
                            return !isInArray(Memory.whitesheet, creep.owner.username)
                        }
                    })
                    if (creeps[0]) this.attack(creeps[0])
                    this.goTo(flag.pos, 0)
                    return
                }
                let creeps = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                if (creeps) {
                    if (this.attack(creeps) == ERR_NOT_IN_RANGE) this.goTo(creeps.pos, 1)
                }
                else {

                }
            }
        }
        else {
            if (this.memory.role == 'double-heal') {
                this.moveTo(Game.creeps[this.memory.double])
                if (Game.creeps[this.memory.double]) this.heal(Game.creeps[this.memory.double])
                else this.heal(this)
                if (!Game.creeps[this.memory.double]) { this.suicide(); return }
                else {
                    if (this.pos.isNearTo(Game.creeps[this.memory.double])) {
                        var caption_hp = Game.creeps[this.memory.double].hits
                        var this_hp = this.hits
                        if (this_hp == this.hitsMax && caption_hp == Game.creeps[this.memory.double].hitsMax) this.heal(Game.creeps[this.memory.double])
                        if (caption_hp < this_hp) {
                            this.heal(Game.creeps[this.memory.double])
                        }
                        else {

                            this.heal(this)
                        }
                        let otherCreeps = this.pos.findInRange(FIND_MY_CREEPS, 3, { filter: (creep) => { return creep.hits < creep.hitsMax - 300 } })
                        if (otherCreeps[0] && this.hits == this.hitsMax && Game.creeps[this.memory.double].hits == Game.creeps[this.memory.double].hitsMax) {
                            if (otherCreeps[0].pos.isNearTo(this))
                                this.heal(otherCreeps[0])
                            else this.rangedHeal(otherCreeps[0])
                        }
                    }
                    else {
                        this.heal(this)
                        this.moveTo(Game.creeps[this.memory.double])
                    }
                }
            }
        }
    }

    // 紧急援建
    public handle_helpBuild(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let data = missionData.Data
        if (!missionData) return
        if (this.room.name == this.memory.belong && Game.shard.name == this.memory.shard) {
            if (!this.BoostCheck(['move', 'work', 'heal', 'tough', 'carry'])) return
            if (this.store.getUsedCapacity('energy') <= 0) {
                let stroge_ = global.Stru[this.memory.belong]['storage'] as StructureStorage
                if (stroge_) {
                    this.withdraw_(stroge_, 'energy')
                    return
                }
            }
        }
        if ((this.room.name != data.disRoom || Game.shard.name != data.shard) && !this.memory.swith) {
            this.heal(this)
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard)
        }
        else {

            this.memory.swith = true
            let runFlag = this.pos.findClosestByRange(FIND_FLAGS, {
                filter: (flag) => {
                    return flag.color == COLOR_BLUE
                }
            })
            if (runFlag) {
                this.goTo(runFlag.pos, 0)
                return
            }
            this.workstate('energy')
            if (this.memory.working) {
                if (this.hits < this.hitsMax) {
                    this.heal(this)
                }
                if (this.room.name != data.disRoom) { this.goTo(new RoomPosition(24, 24, data.disRoom), 23); return }
                let cons = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES)
                if (cons) this.build_(cons)
            }
            else {
                // 以withdraw开头的旗帜  例如： withdraw_0
                let withdrawFlag = this.pos.findClosestByPath(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.name.indexOf('withdraw') == 0
                    }
                })
                if (withdrawFlag) {
                    let tank_ = withdrawFlag.pos.GetStructureList(['storage', 'terminal', 'container', 'tower'])
                    if (tank_.length > 0) { this.withdraw_(tank_[0], 'energy'); return }
                }
                let harvestFlag = Game.flags[`${this.memory.belong}/HB/harvest`]
                if (harvestFlag) {
                    if (this.hits < this.hitsMax) {
                        this.heal(this)
                    }
                    if (!this.pos.isNearTo(harvestFlag)) { this.goTo(harvestFlag.pos, 1) }
                    else {
                        let source = harvestFlag.pos.lookFor(LOOK_SOURCES)
                        if (source.length > 0) { this.harvest(source[0]) }
                    }
                    return
                }
                let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
            }
        }
    }

    //房间签名
    public handle_sig(): void {
        let missionData = this.memory.MissionData;
        if (!missionData) return;
        let id = missionData.id;
        let data = missionData.Data;
        if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard)
        }
        else {
            let control = this.room.controller;
            if (control) {
                if (!this.pos.isNearTo(control)) { this.goTo(control.pos, 1); }
                else { this.signController(control, data.text) }
            }
        }

    }
}