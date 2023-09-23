import structure from "@/mount/structure"
import { filter_structure, GenerateAbility, generateID, isInArray, unzipPosition, zipPosition, getDistance, posFindClosestByRange, getDistance1, AttackNum, ToughNum } from "@/utils"
import { filter } from "lodash"
import creep from ".."
import { DEPOSIT_MAX_COOLDOWN } from '@/mount/structure/observer'
/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonActionExtension extends Creep {
    // 刷墙
    public handle_repair(): void {
        if (this.ticksToLive <= 50) {
            if (this.store.energy) { this.transfer_(this.room.storage ? this.room.storage : this.room.terminal, 'energy'); return }
            if (!this.unBoost()) this.suicide()
            return
        }
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!id) return
        let storage_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.storageID) as StructureStorage
        this.workstate('energy')
        // boost检查
        if (mission.LabMessage && !this.BoostCheck(['work'])) return
        if (this.pos.roomName != this.memory.belong) {
            this.goTo(new RoomPosition(24, 24, this.memory.belong), 20);
            return
        }
        if (this.hits < this.hitsMax) {
            let hostileCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, {
                filter: (creep) => {
                    return creep.getActiveBodyparts('ranged_attack') > 0
                }
            })
            if (hostileCreep.length > 0) this.goTo(hostileCreep[0].pos, 5, true)
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
                // 如果shard不为3就搜索有没有地上的能量
                if (Game.shard.name != 'shard3') {
                    let dropped = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                        filter: (res) => {
                            return res.resourceType == 'energy' && res.amount >= this.store.getFreeCapacity()
                        }
                    })
                    if (dropped) {
                        if (this.pickup(dropped) == ERR_NOT_IN_RANGE) this.goTo(dropped.pos, 1)
                        return
                    }
                }
                if (!this.memory.containerID) {
                    var tank = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                        filter: (stru) => {
                            return stru.structureType == 'storage' ||
                                (stru.structureType == 'link' && isInArray(Game.rooms[this.memory.belong].memory.StructureIdData.comsume_link, stru.id) && stru.store.getUsedCapacity('energy'))
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
                if (tank_ && tank_.store.getUsedCapacity('energy')) {
                    this.withdraw_(tank_, 'energy')
                }
                else {
                    delete this.memory.containerID
                }

            }
        }
        else if (mission.Data.RepairType == 'nuker') {
            // 没有仓库和终端就不防了
            if (!storage_) {
                delete Game.rooms[this.memory.belong].memory.StructureIdData.storageID;
                storage_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.terminalID) as StructureStorage
                return;
            }
            if (!storage_) return
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
        else if (mission.Data.RepairType == 'special') {
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
                /* 寻找插了旗子的hits最小的墙 */
                var flags = this.room.find(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.name.indexOf('repair') == 0
                    }
                })
                if (flags.length <= 0) return
                let disWall = null
                for (var f of flags) {
                    let fwall = f.pos.GetStructureList(['rampart', 'constructedWall'])[0]
                    if (!fwall) f.remove()
                    else {
                        if (!disWall || fwall.hits < disWall.hits) disWall = fwall
                    }
                }
                if (!disWall) {
                    // 没有旗子就删除任务
                    Game.rooms[this.memory.belong].DeleteMission(id)
                    return
                }
                this.memory.targetID = disWall.id
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
            }
        }
    }

    // C计划
    public handle_planC(): void {
        let mission = this.memory.MissionData
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
        if (!missionData) return
        let id = missionData.id
        if (this.getActiveBodyparts('heal') && this.hits < this.hitsMax) this.heal(this)
        if (this.room.name != missionData.Data.disRoom || Game.shard.name != missionData.Data.shard) {
            this.arriveTo(new RoomPosition(24, 24, missionData.Data.disRoom), 20, missionData.Data.shard, missionData.Data.shardData)
            return
        }
        let GoFalg = Game.flags[`${this.memory.belong}/expand`]
        if (GoFalg) {
            if (!this.pos.isEqualTo(GoFalg)) this.goTo(GoFalg.pos, 0)
            return
        }
        this.workstate('energy')
        if (this.memory.role == 'claim') {
            if (!this.pos.isNearTo(Game.rooms[missionData.Data.disRoom].controller))
                this.goTo(Game.rooms[missionData.Data.disRoom].controller.pos, 1)
            else { this.claimController(Game.rooms[missionData.Data.disRoom].controller) }
            if (missionData.Data.shard == this.memory.shard) {
                if (Game.rooms[missionData.Data.disRoom].controller.level && Game.rooms[missionData.Data.disRoom].controller.owner) {
                    if (!Game.rooms[this.memory.belong]) return
                    let mission = Game.rooms[this.memory.belong].GainMission(id)
                    if (!mission) return
                    mission.CreepBind[this.memory.role].num = 0
                }
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
                if (Game.rooms[this.room.name] && Game.rooms[this.room.name].memory.StructureIdData && Game.rooms[this.room.name].memory.StructureIdData.AtowerID) {
                    let towers = []
                    Game.rooms[this.room.name].memory.StructureIdData.AtowerID.forEach((tower: Id<StructureTower>) => { if (Game.getObjectById(tower).store.getFreeCapacity('energy') > 100) towers.push(Game.getObjectById(tower)) })
                    if (towers.length && towers[0]) {
                        this.transfer_(towers[0], 'energy')
                        return
                    }
                }
                let store = this.pos.getClosestStore()
                if (store) {
                    this.transfer_(store, 'energy')
                    return
                }
                let Falg = Game.flags[`${this.pos.roomName}/build`]
                if (Falg) {
                    let rampart = Falg.pos.findClosestByRange(FIND_MY_STRUCTURES, { filter: function (structure) { return structure.structureType == 'rampart' && structure.hits < structure.hitsMax - 1000 } })
                    if (rampart) {
                        this.repair_(rampart);
                        return
                    }
                }
                this.upgrade_()
            }
            else {
                let runFlag = this.pos.findClosestByRange(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.color == COLOR_BLUE//蓝色旗子
                    }
                })
                if (runFlag) {
                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) {
                        this.withdraw_(structure, 'energy');
                        return
                    }
                    else {
                        let res = runFlag.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                            filter: function (object) {
                                return object.resourceType == 'energy'
                            }
                        })
                        if (res) {
                            if (this.pickup(res) == -9)
                                this.goTo(res.pos, 1);
                            return
                        }
                        if (this.room.terminal && this.room.terminal.store.energy) { this.withdraw_(this.room.terminal, 'energy'); return }
                    }
                }

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

                if (Game.time % 10 == 0 || this.pos.x == 0 || this.pos.x == 49 || this.pos.y == 0 || this.pos.y == 49) {
                    let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                    if (source) missionData.sourceId = source.id
                    else delete missionData.sourceId
                }
                if (missionData.sourceId) {
                    let source = Game.getObjectById(missionData.sourceId) as Source
                    this.harvest_(source)
                }
                else {
                    let harvestFlag = Game.flags[`${this.memory.belong}/HB/harvest`]
                    if (harvestFlag) {
                        if (this.hits < this.hitsMax) {
                            this.heal(this)
                        }
                        if (!this.pos.isEqualTo(harvestFlag)) {
                            this.goTo(harvestFlag.pos, 0)
                        }
                        else {
                            let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                            if (source) missionData.sourceId = source.id
                            else delete missionData.sourceId
                        }
                        return
                    }

                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) this.withdraw_(structure, 'energy');
                }
                if (this.ticksToLive < 80 && this.store.getUsedCapacity('energy') <= 0) this.suicide()
            }
        }
        else if (this.memory.role == 'Eupgrade') {
            if (this.memory.working) {
                if (this.room.controller.my && this.room.controller.upgradeBlocked) {
                    let cons = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
                    if (cons) this.build_(cons)
                }
                let Falg = Game.flags[`${this.pos.roomName}/build`]
                if (Falg) {
                    let rampart = Falg.pos.findClosestByRange(FIND_MY_STRUCTURES, { filter: function (structure) { return structure.structureType == 'rampart' } })
                    if (rampart) {
                        this.repair_(rampart);
                        return
                    }
                }
                else this.upgrade_()
            }
            else {
                let runFlag = this.pos.findClosestByRange(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.color == COLOR_BLUE//蓝色旗子
                    }
                })
                if (runFlag) {
                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) {
                        this.withdraw_(structure, 'energy');
                        return
                    }
                    else {
                        let res = runFlag.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                            filter: function (object) {
                                return object.resourceType == 'energy'
                            }
                        })
                        if (res) {
                            if (this.pickup(res) == -9)
                                this.goTo(res.pos, 1);
                            return
                        }
                        if (this.room.terminal && this.room.terminal.store.energy) { this.withdraw_(structure, 'energy'); return }
                    }
                }

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

                if (Game.time % 10 == 0 || this.pos.x == 0 || this.pos.x == 49 || this.pos.y == 0 || this.pos.y == 49) {
                    let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                    if (source) missionData.sourceId = source.id
                    else delete missionData.sourceId
                }
                if (missionData.sourceId) {
                    let source = Game.getObjectById(missionData.sourceId) as Source
                    this.harvest_(source)
                }
                else {
                    let harvestFlag = Game.flags[`${this.memory.belong}/HB/harvest`]
                    if (harvestFlag) {
                        if (this.hits < this.hitsMax) {
                            this.heal(this)
                        }
                        if (!this.pos.isEqualTo(harvestFlag)) {
                            this.goTo(harvestFlag.pos, 0)
                        }
                        else {
                            let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                            if (source) missionData.sourceId = source.id
                            else delete missionData.sourceId
                        }
                        return
                    }
                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) this.withdraw_(structure, 'energy');
                }
                if (this.ticksToLive < 80 && this.store.getUsedCapacity('energy') <= 0) this.suicide()
            }
        }
    }

    // 普通冲级
    public handle_normalRush(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!mission || this.ticksToLive <= 100) { if (!this.unBoost()) this.suicide(); return }
        var link_ = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.upgrade_link) as StructureLink
        if (!link_) { this.say("找不到冲级link!"); return }
        // boost检查
        if (mission.LabMessage && !this.BoostCheck(['work'])) return
        this.workstate('energy')
        if (this.memory.working) {
            this.upgrade_()
            if (this.store.getUsedCapacity('energy') < 35 && link_.pos.isNearTo(this))
                this.withdraw_(link_, 'energy')
        }
        else {
            this.withdraw_(link_, 'energy')
        }
    }

    // 急速冲级
    public handle_quickRush(): void {
        if (this.room.controller.my && this.room.controller.level >= 8 && this.unBoost()) { return; }//清除boost
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!mission) return
        // boost检查
        if (mission.LabMessage && !this.BoostCheck(['work'])) return
        this.workstate('energy')
        var terminal_ = Game.rooms[this.memory.belong].terminal
        if (!terminal_) { this.say("找不到terminal!"); return }
        if (this.memory.working) {
            this.upgrade_()
            if (this.store.getUsedCapacity('energy') < 35) this.withdraw_(terminal_, 'energy')
        }
        else {
            this.withdraw_(terminal_, 'energy')
        }
        this.memory.standed = mission.Data.standed
    }

    //外矿红球防守
    public handle_out_attack(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        let disRoom = data.disRoom
        if (!disRoom) {
            //删除外矿红球防守任务
            Game.rooms[this.memory.belong].DeleteMission(id);
            return
        }
        //如果不在目标房间，先去目标房间
        if (this.pos.roomName != disRoom) {
            this.goTo(new RoomPosition(24, 24, disRoom), 23)
            return
        }
        if (data.attack) {
            let attack = Game.getObjectById(data.attack) as Creep
            if (attack) {
                this.attack(attack)
                this.goTo(attack.pos, 1)
            }
            else delete data.attack
            return
        }
        else {
            let attack = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } })
            if (attack) {
                this.attack(attack)
                this.goTo(attack.pos, 1)
                data.attack = attack.id
                return
            }
            let attackStructure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } })
            if (attackStructure) {
                this.attack(attackStructure)
                this.goTo(attackStructure.pos, 1)
                data.attack = attackStructure.id
                return
            }
            //删除红球外矿防守任务
            Game.rooms[this.memory.belong].DeleteMission(id);
            return
        }
    }

    //外矿蓝球防守
    public handle_out_range(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        let disRoom = data.disRoom
        if (!disRoom) {
            //删除外矿蓝球防守任务
            Game.rooms[this.memory.belong].DeleteMission(id);
            return
        }
        if (this.hits < this.hitsMax) this.heal(this)
        //如果不在目标房间，先去目标房间
        if (this.pos.roomName != disRoom) {
            this.goTo(new RoomPosition(24, 24, disRoom), 23)
            return
        }
        if (data.attack) {
            let attack = Game.getObjectById(data.attack) as Creep
            if (attack) {
                //如果attack的类型为建筑
                if (attack instanceof Structure) {
                    this.rangedAttack(attack)
                    this.goTo(attack.pos, 2)
                }
                else {
                    this.handle_ranged_attack(attack)
                }
            }
            else delete data.attack
            return
        }
        else {
            let attack = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } })
            if (attack) {
                this.handle_ranged_attack(attack)
                data.attack = attack.id
                return
            }
            let attackStructure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) && creep.structureType != "rampart" } })
            if (attackStructure) {
                data.attack = attackStructure.id
                return
            }
            //寻找我的残血爬治疗
            let creep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: (creep) => {
                    return creep.hits < creep.hitsMax
                }
            })
            if (creep) {
                this.handle_heal(creep, false)
                this.goTo(creep.pos, 1)
                return
            }
            //删除蓝球外矿防守任务
            Game.rooms[this.memory.belong].DeleteMission(id);
            return
        }
    }

    //双人小队
    public handle_doubleDismantle(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        if (this.room.name == this.memory.belong) {
            if (this.memory.role == 'double-attack') {
                if (!this.BoostCheck(['attack', 'move', 'tough', 'ranged_attack'])) return
            }
            else if (this.memory.role == 'double-heal') {
                if (!this.BoostCheck(['heal', 'move', 'tough'])) return
            }
            else if (this.memory.role == 'double-work') {
                if (!this.BoostCheck(['work', 'move', 'tough'])) return
            }
        }
        if ((Game.shard.name != data.shard || data.shardData) && (!this.memory.shardAffirm || !this.memory.shardAffirm[this.memory.shardAffirm.length - 1].affirm)) {//先到同shard
            this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 23, data.shard, data.shardData)//这个房间名我也不知道怎么填，跨shard前搜不到旗子，先跨shard
            return;
        }
        var Flag = Game.flags[data.FlagName]
        if (!Flag) { this.say('找不到旗子'); return; }
        //配对
        if (!this.memory.double) {
            if (this.memory.role == 'double-heal') {
                /* 由heal来进行组队 */
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return (creep.memory.role == 'double-attack' || creep.memory.role == 'double-work') && !creep.memory.double
                        }
                    })
                    if (disCreep) {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                    }
                }
            }
            return
        }
        this.memory.crossLevel = 15;
        if (this.pos.roomName != Flag.pos.roomName) data.runRoom = this.pos.roomName

        if (this.memory.role == 'double-attack') {
            if (!Game.creeps[this.memory.double]) {
                let Attack: Creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (!Attack) return
                if (getDistance1(Attack.pos, this.pos) > 1) {
                    this.goTo(Attack.pos, 1)
                    this.memory.standed = false
                }
                else {
                    this.attack(Attack);
                    this.move(this.pos.getDirectionTo(Attack))
                    this.memory.standed = true
                }
                return
            }
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (this.getActiveBodyparts('tough') <= 6 && data.runRoom) {
                this.goTo(new RoomPosition(24, 24, data.runRoom), 22)
                return
            }
            if (this.pos.roomName != Flag.pos.roomName) {
                if (this.hits < this.hitsMax) {
                    let Attack: Creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (Attack && getDistance1(Attack.pos, this.pos) < 5) missionData.Attackid = Attack.id;
                }
                if (Game.shard.name != "shard3") {
                    // 搜索半径3内的敌人
                    let attackcreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (attackcreep.length) {
                        missionData.Attackid = attackcreep[0].id
                    }
                }
                if (missionData.Attackid) {
                    let attackcreep = Game.getObjectById(missionData.Attackid) as Creep;
                    if (!attackcreep || getDistance1(attackcreep.pos, this.pos) >= 5) delete missionData.Attackid;
                    else {
                        if (getDistance1(this.pos, creep_.pos) <= 1)
                            this.handle_attack(attackcreep)
                        this.memory.standed = true
                        return;
                    }
                }
                if (getDistance1(this.pos, creep_.pos) <= 1 || this.pos.roomName != creep_.pos.roomName)
                    this.goTo(Flag.pos, 1);
                else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); }
                this.memory.standed = false
                return;
            }
            if (creep_) {
                let a = !(this.fatigue || creep_.fatigue)//爬的体力
                let b = !(getDistance1(this.pos, creep_.pos) > 1 && this.pos.roomName == creep_.pos.roomName)//是否相邻
                let attack_structure_flag = Flag.pos.lookFor('structure')
                if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
                    let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    let sum = 0;
                    for (let creep of creeps) {//计算伤害
                        if (creep.getActiveBodyparts('attack'))
                            sum += AttackNum(creep);
                    }
                    if (sum >= ToughNum(this)) {
                        //边跑边攻击范围为1内的东西
                        let attacks = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } }) as any
                        if (!attacks.length) attacks = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && !Memory.whitesheet.includes(object.owner.username) } })
                        if (attacks.length) this.attack(attacks[0])
                        this.goTo(creep[0].pos, 8, true)
                        this.memory.standed = true
                    }
                    else {
                        if (this.attack(attack_structure_flag[0]) == ERR_NOT_IN_RANGE && a && b) { this.goTo(attack_structure_flag[0].pos, 1); this.memory.standed = false }
                        else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); this.memory.standed = true }
                    }
                }
                else {
                    let Flagto = Game.flags[`${data.FlagName}to`];
                    if (Flagto) {
                        //有to旗子就去to旗子下
                        if (getDistance1(this.pos, Flagto.pos) > 0) {
                            if (a && b) this.goTo(Flagto.pos, 0);
                            else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1) }
                            //检测攻击范围1内的敌人
                            let attackcreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                            if (attackcreep.length) {
                                this.attack(attackcreep[0]);
                            }
                            else {
                                //检测攻击范围1内敌人的powerCreep
                                let powerCreep = this.pos.findInRange(FIND_HOSTILE_POWER_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                                if (powerCreep.length) {
                                    this.attack(powerCreep[0]);
                                }
                            }
                            this.memory.standed = true
                        }
                        else {
                            //检测攻击范围1内的敌人
                            let attackcreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                            if (attackcreep.length) {
                                this.attack(attackcreep[0]);
                            }
                            else {
                                //检测攻击范围1内敌人的powerCreep
                                let powerCreep = this.pos.findInRange(FIND_HOSTILE_POWER_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                                if (powerCreep.length) {
                                    this.attack(powerCreep[0]);
                                }
                            }
                        }
                        return
                    }
                    if (data.wall) {
                        let wall = Game.getObjectById(data.wall) as any
                        if (wall) {
                            if (this.attack(wall) == ERR_NOT_IN_RANGE && a && b) { this.goTo(wall.pos, 1); this.memory.standed = false }
                            else this.memory.standed = true
                        }
                        else delete data.wall
                        let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                        let sum = 0;
                        for (let creep of creeps) {//计算伤害
                            if (creep.getActiveBodyparts('attack'))
                                sum += AttackNum(creep);
                        }
                        if (sum >= ToughNum(this)) {
                            //边跑边攻击范围为1内的东西
                            let attacks = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } }) as any
                            if (!attacks.length) attacks = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && !Memory.whitesheet.includes(object.owner.username) } })
                            if (attacks.length) this.attack(attacks[0])
                            this.goTo(creeps[0].pos, 8, true)
                            this.memory.standed = true
                        }
                        if (Game.time % 50 == 0) delete data.wall;
                    }
                    else {
                        // 判断周围3格除了自己以外有没有我方红球
                        let myCreeps = this.pos.findInRange(FIND_MY_CREEPS, 3, { filter: function (creep) { return creep.memory.role == 'double-attack' } });
                        if (myCreeps.length && myCreeps.length <= 1) {
                            let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                            let sum = 0;
                            for (let creep of creeps) {//计算伤害
                                if (creep.getActiveBodyparts('attack'))
                                    sum += AttackNum(creep);
                            }
                            if (sum >= ToughNum(this)) {
                                //边跑边攻击范围为1内的东西
                                let attacks = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } }) as any
                                if (!attacks.length) attacks = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && !Memory.whitesheet.includes(object.owner.username) } })
                                if (attacks.length) this.attack(attacks[0])
                                this.goTo(creeps[0].pos, 8, true)
                                this.memory.standed = true
                                return;
                            }
                        }
                        let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                        if (Attack_creep) {
                            if (this.PathFinders(Attack_creep.pos, 1, true)) {
                                if (a && b) {
                                    this.handle_attack(Attack_creep)
                                    this.memory.standed = true
                                }
                                else { if (!this.fatigue && creep_.fatigue) { this.goTo(creep_.pos, 1); this.memory.standed = false } }
                            }
                            else data.wall = this.handle_wall_rampart(Attack_creep, 1);
                        }
                        else {
                            if (Game.flags[`${data.FlagName}Stop`] || Game.flags[`${data.FlagName}stop`]) {
                                let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && structure.structureType != 'storage' && structure.structureType != 'terminal' && !Memory.whitesheet.includes(structure.owner.username) } });
                                if (Attack_structure) {
                                    if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE && a && b) { this.goTo(Attack_structure.pos, 1); this.memory.standed = false }
                                    else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); this.memory.standed = true }
                                }
                                else {
                                    this.say('没有发现敌人');
                                    this.goTo(Flag.pos, 1);
                                }
                            }
                            else {
                                let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && !Memory.whitesheet.includes(structure.owner.username) } });
                                if (Attack_structure) {
                                    if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE && a && b) { this.goTo(Attack_structure.pos, 1); this.memory.standed = false }
                                    else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); this.memory.standed = true }
                                }
                                else {
                                    this.say('没有发现敌人');
                                    this.goTo(Flag.pos, 1);
                                }
                            }
                        }
                    }
                }
            }
            else {
                let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (Attack_creep) { if (this.attack(Attack_creep) == ERR_NOT_IN_RANGE) this.goTo(Attack_creep[0].pos, 1) }
                else {
                    if (Game.flags[`${data.FlagName}Stop`] || Game.flags[`${data.FlagName}stop`]) {
                        let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && structure.structureType != 'storage' && structure.structureType != 'terminal' && !Memory.whitesheet.includes(structure.owner.username) } });
                        if (Attack_structure) {
                            if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE) this.goTo(Attack_structure.pos, 1)
                        }
                        else {
                            this.say('没有发现敌人');
                            this.goTo(Flag.pos, 1);
                        }
                    }
                    else {
                        let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && !Memory.whitesheet.includes(structure.owner.username) } });
                        if (Attack_structure) {
                            if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE) this.goTo(Attack_structure.pos, 1)
                        }
                        else {
                            this.say('没有发现敌人');
                            this.goTo(Flag.pos, 1);
                        }
                    }
                }
            }
        }
        if (this.memory.role == 'double-work') {
            if (!Game.creeps[this.memory.double]) return
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (this.getActiveBodyparts('tough') <= 6 && data.runRoom) {//残血就跑
                this.goTo(new RoomPosition(24, 24, data.runRoom), 22)
                this.memory.standed = true
                return
            }
            if (this.pos.roomName != Flag.pos.roomName) {
                if (!creep_) return
                if (getDistance1(this.pos, creep_.pos) <= 1 || this.pos.roomName != creep_.pos.roomName)
                    this.goTo(Flag.pos, 1);
                this.memory.standed = false
                return;
            }
            let a = creep_ ? !(this.fatigue || creep_.fatigue) : true//爬的体力
            let b = creep_ ? !(this.pos.roomName == creep_.pos.roomName && getDistance1(this.pos, creep_.pos) > 1) : true//是否相邻
            let attack_structure_flag = Flag.pos.lookFor('structure')
            if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
                if (this.dismantle(attack_structure_flag[0]) == ERR_NOT_IN_RANGE && a && b) { this.goTo(attack_structure_flag[0].pos, 1); this.memory.standed = false }
                else this.memory.standed = true
            }
            else {
                if (data.wall) {
                    let wall = Game.getObjectById(data.wall) as any
                    if (wall) {
                        if (this.dismantle(wall) == ERR_NOT_IN_RANGE && a && b) { this.goTo(wall.pos, 1); this.memory.standed = false }
                        else this.memory.standed = true
                    }
                    else delete data.wall
                    if (Game.time % 20 == 0) delete data.wall;
                }
                else {
                    if (Game.flags[`${data.FlagName}Stop`] || Game.flags[`${data.FlagName}stop`]) {
                        let dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && object.structureType != 'rampart' && object.structureType != 'storage' && object.structureType != 'terminal' && !Memory.whitesheet.includes(object.owner.username) } });
                        if (!dis) dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && object.structureType != 'storage' && object.structureType != 'terminal' && !Memory.whitesheet.includes(object.owner.username) } });
                        if (!dis) { this.goTo(Flag.pos, 0); this.say(`没有可以拆的建筑了`) }
                        if (dis) {
                            if (this.PathFinders(dis.pos, 1, true)) {
                                if (this.dismantle(dis) == ERR_NOT_IN_RANGE && a && b) { this.goTo(dis.pos, 1); this.memory.standed = false }
                                else this.memory.standed = true
                            }
                            else data.wall = this.handle_wall_rampart(dis, 1);
                        }
                    }
                    else {
                        let dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && object.structureType != 'rampart' && !Memory.whitesheet.includes(object.owner.username) } });
                        if (!dis) dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (object) { return object.structureType != 'controller' && object.structureType != 'keeperLair' && !Memory.whitesheet.includes(object.owner.username) } });
                        if (!dis) { this.goTo(Flag.pos, 0); this.say(`没有可以拆的建筑了`) }
                        if (dis) {
                            if (this.PathFinders(dis.pos, 1, true)) {
                                if (this.dismantle(dis) == ERR_NOT_IN_RANGE && a && b) { this.goTo(dis.pos, 1); this.memory.standed = false }
                                else this.memory.standed = true
                            }
                            else data.wall = this.handle_wall_rampart(dis, 1);
                        }
                    }
                }
            }
        }
        if (this.memory.role == 'double-heal') {
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (creep_) {
                this.handle_heal(creep_)
                if (creep_.pos.roomName == this.pos.roomName && Flag.pos.roomName == this.pos.roomName && getDistance1(this.pos, creep_.pos) <= 1 && getDistance1(this.pos, Flag.pos) <= 2 && (this.pos.x == 0 || this.pos.x == 49 || this.pos.y == 0 || this.pos.y == 49)) {
                    let pos = creep_.pos.getVoid()
                    //console.log(pos)
                    if (pos.length) { this.goTo(pos[0], 0); return }
                }
                if (creep_.pos.roomName == this.pos.roomName && getDistance1(this.pos, creep_.pos) >= 2) this.goTo(creep_.pos, 1);
                else this.move(this.pos.getDirectionTo(creep_))
            }
            else {
                let healCreep = this.pos.findClosestByRange(FIND_MY_CREEPS);
                if (healCreep) {
                    this.handle_heal(healCreep)
                    if (healCreep.pos.roomName == this.pos.roomName && getDistance1(this.pos, healCreep.pos) >= 3) this.goTo(healCreep.pos, 1);
                    else this.move(this.pos.getDirectionTo(creep_))
                }
                else this.heal(this)
            }
        }
    }

    /**红球的攻击行为*/
    public handle_attack(attackCreeps: Creep): boolean {
        if (attackCreeps) {
            let a = getDistance1(this.pos, attackCreeps.pos)//红球与敌人距离
            if (a > 1) {
                if (attackCreeps.getActiveBodyparts('attack') && a == 3) {
                    //等一手先打heal在舔脸 
                    this.memory.standed = true;
                }
                else {
                    this.goTo(attackCreeps.pos, 1);
                    this.memory.standed = false
                }
            }
            else {//贴脸追的打
                this.attack(attackCreeps);
                this.move(this.pos.getDirectionTo(attackCreeps))
                this.memory.standed = true;
            }
            if (a <= 3) {
                //搜索敌方爬半径为1有heal的敌人
                let healCreeps = attackCreeps.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (object) { return object.getActiveBodyparts('heal') && !Memory.whitesheet.includes(object.owner.username) } });
                if (healCreeps.length) {
                    if (getDistance1(this.pos, healCreeps[0].pos) <= 3) {
                        this.rangedAttack(healCreeps[0]);
                    }
                }
            }
        }
        return false
    }

    //紧急援建
    public handle_helpBuild(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        if (this.room.name == this.memory.belong && Game.shard.name == this.memory.shard) {
            if (!this.BoostCheck(['move', 'work', 'heal', 'tough', 'carry'])) return
            if (this.store.getUsedCapacity('energy') <= 0) {
                let stroge_ = Game.rooms[this.memory.belong].storage
                if (stroge_) {
                    this.withdraw_(stroge_, 'energy')
                    return
                }
            }
        }
        if ((this.room.name != data.disRoom || Game.shard.name != data.shard) && !this.memory.swith) {
            if (this.hits < this.hitsMax) this.heal(this)
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard, data.shardData)
        }
        else {

            this.memory.swith = true
            let runFlag = this.pos.findClosestByRange(FIND_FLAGS, {
                filter: (flag) => {
                    return flag.color == COLOR_BLUE//蓝色旗子
                }
            })
            if (runFlag) {
                this.goTo(runFlag.pos, 0)
                return
            }
            this.workstate('energy')
            if (this.memory.working) {
                if (this.room.name != data.disRoom) { this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard); return }
                if (this.hits < this.hitsMax) {
                    this.heal(this)
                }
                if (this.room.name != data.disRoom) { this.goTo(new RoomPosition(24, 24, data.disRoom), 23); return }
                if (Game.flags[`${this.memory.belong}/first_build`]) {
                    let fcon = Game.flags[`${this.memory.belong}/first_build`].pos.lookFor(LOOK_CONSTRUCTION_SITES)
                    if (fcon.length > 0) {
                        this.build_(fcon[0])
                    }
                    else {
                        Game.flags[`${this.memory.belong}/first_build`].remove()
                    }
                    return
                }
                let cons = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES)
                if (cons) { this.build_(cons); return }
                let store = this.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return (stru.structureType == 'extension' || stru.structureType == 'spawn') && stru.store.getFreeCapacity('energy') > 0
                    }
                })
                if (store) {
                    this.transfer_(store, 'energy')
                    return
                }
                let tower = this.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'tower' && stru.store.getFreeCapacity('energy') > 0
                    }
                })
                if (tower) {
                    this.transfer_(tower, 'energy')
                    return
                }
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
                    if (this.room.name != harvestFlag.pos.roomName) {
                        this.goTo(harvestFlag.pos, 1)
                    }
                    else {
                        let source = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                        if (source) { this.harvest_(source) }
                    }
                    return
                }
                let resources = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: (res) => {
                        return res.amount > 200 && res.resourceType == 'energy'
                    }
                })
                if (resources) {
                    if (!this.pos.isNearTo(resources)) this.goTo(resources.pos, 1)
                    else this.pickup(resources)
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
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard, data.shardData)
        }
        else {
            let control = this.room.controller;
            if (control) {
                if (!this.pos.isNearTo(control)) { this.goTo(control.pos, 1); }
                else { this.signController(control, data.text) }
            }
        }

    }

    //掠夺者
    public handle_loot(): void {
        let missionData = this.memory.MissionData;
        if (!missionData) return;
        let id = missionData.id;
        let data = missionData.Data;
        let myRoom = Game.rooms[data.myroomname];//我的房间
        let target = Game.getObjectById(data.targetStructureId) as any;//要放入建筑的id
        let Flags = Game.flags[data.sourceFlagName];//要掠夺的旗子
        if (this.store.getUsedCapacity() == 0) data.storedeta = 0;//0为空，1为满
        if (this.store.getFreeCapacity() == 0) data.storedeta = 1;
        if (data.creeptime == undefined || data.creeptime >= 1300) data.creeptime = 0;
        if (data.Gametime == undefined) data.Gametime = 0
        if (this.ticksToLive <= data.creeptime && !this.store.getUsedCapacity()) { this.suicide(); return; }
        if (Flags) {
            if (data.storedeta) {
                if (target && target.store.getFreeCapacity()) {
                    if (this.transfer_(target, Object.keys(this.store)[0] as ResourceConstant) == OK && data.Gametime) {
                        data.creeptime = Game.time - data.Gametime;
                    }
                }
            }
            else {
                if (this.room != Flags.room) this.goTo(Flags.pos, 1);
                else {//到房间后
                    if (data.sourceId) {
                        let source = Game.getObjectById(data.sourceId) as Ruin | StructureWithStore;
                        if (source && source.store && source.store.getUsedCapacity()) {
                            if (this.withdraw_(source, Object.keys(source.store)[0] as ResourceConstant) == OK) data.Gametime = Game.time;
                            if (!source.store.getUsedCapacity()) delete data.sourceId;
                        }
                        else delete data.sourceId;
                    }
                    else {
                        var targetStructure: StructureWithStore | Ruin = Flags.pos.lookFor(LOOK_STRUCTURES).find(s => 'store' in s) as StructureWithStore
                        if (targetStructure && !targetStructure.store.getUsedCapacity()) targetStructure = null;
                        if (!targetStructure) {
                            // 查找废墟，如果有包含 store 的废墟就设为目标
                            const ruins = Flags.pos.lookFor(LOOK_RUINS)
                            if (ruins) {
                                for (const ruin of ruins) {
                                    if ('store' in ruin && ruin.store.getUsedCapacity() > 0) {
                                        targetStructure = ruin
                                        break
                                    }
                                }
                            }
                            if (!targetStructure) {//找不到旗子下的废墟就搜地图上最近的建筑
                                targetStructure = posFindClosestByRange(this.pos);
                            }
                        }
                        if (targetStructure) {//有就存id，没有就找这个房间的容器
                            this.withdraw_(targetStructure, Object.keys(targetStructure.store)[0] as ResourceConstant)
                            data.sourceId = targetStructure.id
                        }
                        else {
                            this.say('没找到建筑啊');
                            //没写完
                        }
                    }
                }
            }
        }
        else {//没有旗子就删除任务
            myRoom.DeleteMission(id);
        }
    }

    //一体机
    public handle_AIO(): void {
        let missionData = this.memory.MissionData;
        if (!missionData) return;
        let id = missionData.id;
        let data = missionData.Data;
        let Falg = Game.flags[data.FlagName];
        if (this.room.name == this.memory.belong && Game.shard.name == this.memory.shard) {
            if (!this.BoostCheck(['move', 'ranged_attack', 'heal', 'tough'])) return
        }
        if (!this.memory.standed) this.memory.standed = true;
        if (Game.shard.name != data.shard || !Falg || this.room.name != Falg.pos.roomName) {//先到房间
            //搜索除了白名单并且有攻击部件的爬
            if (this.hits < this.hitsMax) {
                let Attack: Creep | AnyOwnedStructure = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (!Attack) Attack = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && !Memory.whitesheet.includes(structure.owner.username) } });
                if (Attack) missionData.Attackid = Attack.id;
                this.handle_heal();
            }
            if (missionData.Attackid) {
                let attackcreep = Game.getObjectById(missionData.Attackid) as Creep | AnyOwnedStructure;
                if (!attackcreep) delete missionData.Attackid;
                else {
                    if (getDistance1(attackcreep.pos, this.pos) >= 5) { this.handle_heal(); this.arriveTo(new RoomPosition(24, 24, Falg ? Falg.pos.roomName : this.memory.belong), 1, data.shard, data.shardData); return; }
                    if (attackcreep instanceof Creep) this.handle_ranged_attack(attackcreep);
                    else { this.goTo(attackcreep.pos, 1); this.rangedMassAttack(); }
                    this.handle_heal(); return;
                }
            }
            if (Falg) {
                if (this.room.name != Falg.pos.roomName) {
                    this.arriveTo(new RoomPosition(24, 24, Falg.pos.roomName), 1, data.shard, data.shardData)
                    return
                }
            }
            this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 1, data.shard, data.shardData)
            return;
        }
        //逃跑房间
        if (this.pos.roomName != Falg.pos.roomName) data.runRoom = this.pos.roomName
        if (this.getActiveBodyparts('tough') < 3 && data.runRoom) {
            this.goTo(new RoomPosition(24, 24, data.runRoom), 22)
            this.heal(this);
            this.rangedMassAttack();
            return
        }
        let attack_structure_flag = Falg.pos.lookFor('structure')
        if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
            if (getDistance1(this.pos, attack_structure_flag[0].pos) > 3) {
                this.goTo(attack_structure_flag[0].pos, 3);
                this.rangedMassAttack();
            }
            else {
                if (getDistance1(this.pos, attack_structure_flag[0].pos) <= 1) this.rangedMassAttack();
                else {
                    this.rangedAttack(attack_structure_flag[0]);
                    if (this.PathFinders(attack_structure_flag[0].pos, 1, true))
                        this.goTo(attack_structure_flag[0].pos, 1);
                    else this.goTo(attack_structure_flag[0].pos, 3);
                }
            }
        }
        else {
            let Flagto = Game.flags[`${data.FlagName}to`];
            if (Flagto) {
                //有to旗子就去to旗子下
                if (getDistance1(this.pos, Flagto.pos) > 0) {
                    this.goTo(Flagto.pos, 0);
                    //检测攻击范围3内的敌人
                    let attackcreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (attackcreep.length) {
                        this.rangedAttack(attackcreep[0]);
                    }
                }
                else {
                    //检测攻击范围3内的敌人
                    let attackcreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (attackcreep.length) {
                        this.rangedAttack(attackcreep[0]);
                    }
                    else {
                        //检测攻击范围3内敌人的powerCreep
                        let powerCreep = this.pos.findInRange(FIND_HOSTILE_POWER_CREEPS, 3, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                        if (powerCreep.length) {
                            this.rangedAttack(powerCreep[0]);
                        }
                    }
                }
                this.handle_heal();
                return
            }
            if (this.handle_ranged_attacks()) return
            let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
            if (Attack_creep) {
                this.say('打爬')
                if (this.PathFinders(Attack_creep.pos, 3, true)) {//有完整路径就攻击爬 没有就找最近的墙
                    this.handle_ranged_attack(Attack_creep);
                }
                else {
                    //检测攻击范围1内敌人的powerCreep
                    let powerCreep = this.pos.findClosestByRange(FIND_HOSTILE_POWER_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (powerCreep && this.PathFinders(Attack_creep.pos, 3, true)) {
                        this.rangedAttack(powerCreep);
                        this.goTo(powerCreep.pos, 3);
                    }
                    else {
                        if (data.wall) {
                            let Wall = Game.getObjectById(data.wall) as any;
                            if (!Wall) delete data.wall;
                        }
                        if (!data.wall) {
                            let structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && !Memory.whitesheet.includes(structure.owner.username) } })
                            if (structure && getDistance1(this.pos, structure.pos) <= 3) data.wall = structure.id
                            else data.wall = this.handle_wall_rampart(Attack_creep);
                        }
                        if (data.wall) {
                            let Wall = Game.getObjectById(data.wall) as any;
                            if (!Wall) delete data.wall;
                            else {
                                this.say("打墙")
                                if (Wall instanceof StructureWall) {
                                    if (this.rangedAttack(Wall) == ERR_NOT_IN_RANGE) { this.goTo(Wall.pos, 3); this.rangedMassAttack() };
                                } else {
                                    if (Wall) {
                                        if (getDistance1(this.pos, Wall.pos) >= 2) {
                                            this.rangedAttack(Wall);
                                            if (this.PathFinders(Wall.pos, 1, true)) this.goTo(Wall.pos, 1);
                                            else this.goTo(Wall.pos, 3);
                                        }
                                        else this.rangedMassAttack()
                                    }
                                }
                            }
                            if (Game.time % 10 == 0) delete data.wall;
                        }
                    }
                }
            }
            else {
                if (Game.flags[`${data.FlagName}Stop`] || Game.flags[`${data.FlagName}stop`]) {
                    let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && structure.structureType != 'storage' && structure.structureType != 'terminal' && !Memory.whitesheet.includes(structure.owner.username) } });
                    if (Attack_structure) {
                        this.goTo(Attack_structure.pos, 3);
                        this.rangedAttack(Attack_structure)
                    }
                    else {
                        //搜索自己残血的爬
                        let Heal_creep = this.pos.findClosestByRange(FIND_MY_CREEPS, { filter: function (creep) { return creep.hits < creep.hitsMax } });
                        if (Heal_creep) {
                            this.say('治疗')
                            this.goTo(Heal_creep.pos, 1);
                            this.handle_heal(Heal_creep);
                            return
                        }
                        else {
                            this.say('没有发现敌人');
                            this.goTo(Falg.pos, 0);
                        }
                    }
                }
                else {
                    let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && !Memory.whitesheet.includes(structure.owner.username) } });
                    if (Attack_structure) {
                        let a = getDistance1(Attack_structure.pos, this.pos)
                        if (this.PathFinders(Attack_structure.pos, 1, true))
                            this.goTo(Attack_structure.pos, 1);
                        else this.goTo(Attack_structure.pos, 3);
                        if (a > 3) this.rangedMassAttack();
                        else if (a >= 2) this.rangedAttack(Attack_structure)
                        else this.rangedMassAttack()
                    }
                    else {
                        //搜索自己残血的爬
                        let Heal_creep = this.pos.findClosestByRange(FIND_MY_CREEPS, { filter: function (creep) { return creep.hits < creep.hitsMax } });
                        if (Heal_creep) {
                            this.say('治疗')
                            this.goTo(Heal_creep.pos, 1);
                            this.handle_heal(Heal_creep);
                            return
                        }
                        else {
                            this.say('没有发现敌人');
                            this.goTo(Falg.pos, 0);
                        }
                    }
                }
            }
        }
        this.handle_heal();
    }

    /**风筝单个有attack敌人，没有就贴脸攻击 true远程治疗*/
    public handle_ranged_attack(attackcreep: Creep, bool: boolean = true): boolean {
        if (!attackcreep) return false;
        if (bool) this.handle_heal()
        else this.handle_heal(null, false);
        let distance = getDistance1(this.pos, attackcreep.pos);
        if (attackcreep.getActiveBodyparts('attack') && AttackNum(attackcreep) >= ToughNum(this)) {
            if (distance > 3) { this.goTo(attackcreep.pos, 3); if (bool) this.rangedMassAttack(); this.say('😈', true); }
            else {
                if (distance <= 3) { this.goTo(attackcreep.pos, 5, true); this.say('👀', true); }
                this.rangedAttack(attackcreep);
            }
        }
        else {
            if (distance >= 1) {
                let range = this.PathFinders(attackcreep.pos, 1, true) ? 1 : 3;
                this.goTo(attackcreep.pos, range);
            }
            else this.move(this.pos.getDirectionTo(attackcreep))
            if (distance > 1 && distance <= 3) this.rangedAttack(attackcreep);
            else this.rangedMassAttack();
        }
        return true;
    }

    /**风筝多个有attack敌人，没有就贴脸攻击*/
    public handle_ranged_attacks(): boolean {
        let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
        if (creeps.length > 1) {
            let attackCreeps = [];
            //伤害总和
            let sum = 0;
            let r = 2;//半径
            if (creeps.length >= 2) r = 3
            if (creeps.length >= 4) r = 4
            for (let creep of creeps) {//计算逃跑线路
                if (getDistance1(this.pos, creep.pos) <= r && creep.getActiveBodyparts('attack')) attackCreeps.push({ x: creep.pos.x, y: creep.pos.y })
                sum += AttackNum(creep);
            }

            if (sum >= ToughNum(this)) {//有危险爬就逃跑，没有就攻击
                this.say('看不见走位走位👀', true)
                let x = 0, y = 0;//算中点
                for (let pos of attackCreeps) {
                    x += pos.x;
                    y += pos.y;

                }
                if (x != 0 && y != 0) {//有就逃跑
                    x /= attackCreeps.length;
                    y /= attackCreeps.length;
                    let run = new RoomPosition(x, y, this.pos.roomName)
                    this.goTo(run, r + 5, true);
                    for (let i = 0; i < creeps.length; i++) {
                        if (this.rangedAttack(creeps[i]) == OK)
                            break
                    }
                    this.handle_heal();
                    return true
                }
            }
            else {
                this.handle_ranged_attack(this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } }))
                this.handle_heal();
                return true
            }
        }
        return false
    }

    /**计算我和目标中点里的可攻击到得到最近的墙或者ra*/
    public handle_wall_rampart(target, range: number = 3) {
        let x_ = (this.pos.x + target.pos.x) / 2;
        let y_ = (this.pos.y + target.pos.y) / 2;
        let Wall = new RoomPosition(x_, y_, this.pos.roomName)
        let attackWall = Wall.findClosestByRange(FIND_STRUCTURES, {
            filter: function (structure) {
                return (structure.structureType == 'constructedWall' ||
                    structure.structureType == 'rampart')
            }
        });
        if (attackWall) {
            if (this.PathFinders(attackWall.pos, range, true)) {
                return attackWall.id
            }
            else return this.handle_wall_rampart(attackWall)
        }
        else return null
    }

    /**优先治疗参数爬 */
    public handle_heal(healcreep?: Creep, bool: boolean = true): boolean {
        if (healcreep) {
            if (this.hits >= this.hitsMax - 200) {
                let distance = getDistance1(this.pos, healcreep.pos);
                if (distance <= 1) this.heal(healcreep);
                else {
                    if (distance <= 3) this.rangedHeal(healcreep);
                    else this.heal(this);
                }
            }
            else {
                //先比一下谁的血量更少，优先治疗血量更少的
                if (this.hits > healcreep.hits) {
                    let distance = getDistance1(this.pos, healcreep.pos);
                    if (distance <= 1) this.heal(healcreep);
                    else {
                        if (distance <= 3) this.rangedHeal(healcreep);
                        else this.heal(this);
                    }
                } else this.heal(this);
            }
        }
        else {
            if (this.hits >= this.hitsMax - 100) {
                let healcreep = this.pos.findInRange(FIND_MY_CREEPS, bool ? 1 : 3, { filter: function (creep) { return creep.hits != creep.hitsMax; } });
                if (healcreep.length) {
                    if (getDistance1(this.pos, healcreep[0].pos) <= 1) this.heal(healcreep[0]);
                    else this.rangedHeal(healcreep[0])
                }
                else this.heal(this);
            }
            else this.heal(this);
        }
        return true;
    }

    //挖dp
    public handle_dp(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let myroom = Game.rooms[this.memory.belong];
        let id = missionData.id
        let data = missionData.Data
        let flag = Game.flags[data.FlagName];
        if (!flag) { this.say(`找不到旗子:${data.FlagName}`); if (myroom.GainMission(id)) myroom.DeleteMission(id); }
        if (data.boost && !this.BoostCheck(['work'])) return//检查boost

        if (this.memory.role == 'dp_transfer') {
            if (data.creeptime == undefined) data.creeptime = 100;//记录路程时间
            else if (data.creeptimebool) data.creeptime++;
            if (this.ticksToLive <= data.creeptime && !this.store.getUsedCapacity()) { this.suicide(); return; }
            if (this.ticksToLive <= data.creeptime || !this.store.getFreeCapacity() || (!flag && this.store.getUsedCapacity()))//回家放资源
            { this.transfer_(myroom.storage ? myroom.storage : myroom.terminal, Object.keys(this.store)[0] as ResourceConstant); return; }
        }
        //先去房间
        if (flag && this.pos.roomName != flag.pos.roomName) {
            this.goTo(flag.pos, 2); return;
        }
        if (!flag) {
            if (this.store.getUsedCapacity()) this.transfer_(myroom.storage ? myroom.storage : myroom.terminal, Object.keys(this.store)[0] as ResourceConstant);
            else this.suicide()
            return;
        }
        //绑定爬死了就清空
        let doubleCreep = Game.creeps[this.memory.double];
        if (!doubleCreep || doubleCreep.pos.roomName != this.pos.roomName) {
            if (doubleCreep) {
                delete Game.creeps[this.memory.double].memory.double
            }
            delete this.memory.double;
        }

        if (this.memory.role == 'dp_harvest') {
            if (!this.memory.standed) this.memory.standed = true;
            //获取dp
            if (!data.dpId) {
                let look = flag.pos.lookFor(LOOK_DEPOSITS)[0];
                data.dpId = look ? look.id : null;
            }
            let dp = Game.getObjectById(data.dpId) as Deposit;
            if (dp) {
                //大于冷却时间就删任务
                if (dp.lastCooldown >= DEPOSIT_MAX_COOLDOWN && flag) {
                    flag.remove();
                }
                //快满了就不装
                if (this.store.getFreeCapacity() - this.getActiveBodyparts('work') >= 0)
                    if (this.harvest(dp) == ERR_NOT_IN_RANGE) this.goTo(dp.pos, 1);
            }
            if (doubleCreep && this.store.getUsedCapacity()) this.transfer(doubleCreep, Object.keys(this.store)[0] as ResourceConstant);
            if (Game.time % 10 == 0) {
                let targets = this.pos.findInRange(FIND_TOMBSTONES, 1, { filter: function (object) { return object.store.getUsedCapacity(); } });
                if (targets.length > 0) {
                    if (this.withdraw(targets[0], Object.keys(targets[0].store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) this.goTo(targets[0].pos, 1);//creep.moveTo(targets[0]);
                }
            }
        }
        if (this.memory.role == 'dp_transfer') {
            if (!this.memory.standed) this.memory.standed = true;
            data.creeptimebool = false;//停止计时
            if (!this.memory.double) {
                /* 绑定 */
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return creep != this && creep.memory.MissionData && creep.memory.MissionData.Data && creep.memory.MissionData.Data.transferCreepName == data.transferCreepName && !creep.memory.double
                        }
                    })
                    if (disCreep) {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                    }
                }
            }
            if (doubleCreep) {
                this.goTo(doubleCreep.pos, 1);
            }
            else if (flag) this.goTo(flag.pos, 2);

            if (Game.time % 10 == 0) {
                let targets = this.pos.findInRange(FIND_TOMBSTONES, 3, { filter: function (object) { return object.store.getUsedCapacity(); } });
                if (targets.length > 0) {
                    if (this.withdraw(targets[0], Object.keys(targets[0].store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) this.goTo(targets[0].pos, 1);//creep.moveTo(targets[0]);
                }
            }
        }
    }

    //挖pb
    public handle_pb(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        let myroom = Game.rooms[this.memory.belong];
        let flag = Game.flags[data.FlagName];
        if (!flag) { this.say(`找不到旗子:${data.FlagName}`); if (myroom.GainMission(id)) myroom.DeleteMission(id); }
        if (data.boost && !this.BoostCheck(['attack', 'heal'])) return//检查boost
        if (this.memory.role == 'pb_transfer') {
            if (this.store.getUsedCapacity()) {
                let storage = myroom.storage ? myroom.storage : myroom.terminal;
                if (this.transfer_(storage, Object.keys(this.store)[0] as ResourceConstant) == OK) this.suicide();
                return;
            }
        }
        else {
            if (!flag) this.suicide();
        }
        //先去房间
        if (flag && this.pos.roomName != flag.pos.roomName) {
            this.goTo(flag.pos, 3); return;
        }
        //绑定爬死了就清空
        let doubleCreep = Game.creeps[this.memory.double];
        if (!doubleCreep || doubleCreep.pos.roomName != this.pos.roomName) {
            if (doubleCreep) {
                delete Game.creeps[this.memory.double].memory.double
            }
            delete this.memory.double;
        }

        if (this.memory.role == 'pb_attack') {
            if (!this.memory.standed) this.memory.standed = true;
            if (!data.pbId && flag) {
                let look = flag.pos.lookFor(LOOK_STRUCTURES)[0];
                data.pbId = look ? look.id : null;
            }
            let pb = Game.getObjectById(data.pbId) as StructurePowerBank;
            if (pb) {
                if (this.attack(pb) == ERR_NOT_IN_RANGE) this.goTo(pb.pos, 1);
                if (Game.time % 10 == 0 && !myroom.RoleMissionNum('pb_transfer', 'pb')) {//出运输power
                    let a = myroom.GainMission(id);
                    let b = 1;
                    if (a) b = a.CreepBind.pb_attack.num;
                    let time = b * 600 * 800;
                    let num = Math.ceil(pb.power / 1600);
                    if (pb.hits <= time) {
                        myroom.AddMission(myroom.public_pb_transfer(data.myroomname, data.FlagName, pb.pos.roomName, pb.pos.x, pb.pos.y, num, 100000))
                    }
                }
            }
            else {
                if (flag) { flag.remove(); }
            }
        }

        if (this.memory.role == 'pb_heal') {
            if (!this.memory.double) {
                /* 绑定 */
                if (flag) this.goTo(flag.pos, 2)
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return creep != this && !creep.getActiveBodyparts('heal') && creep.memory.MissionData && creep.memory.MissionData.Data && creep.memory.MissionData.Data.healerCreepName == data.healerCreepName && !creep.memory.double
                        }
                    })
                    if (disCreep) {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                    }
                }
            }
            if (doubleCreep) {
                this.handle_heal(doubleCreep);
                if (getDistance(this.pos, doubleCreep.pos) >= 2)
                    this.goTo(doubleCreep.pos, 1);
            }
        }

        if (this.memory.role == 'pb_transfer') {
            if (!this.memory.standed) this.memory.standed = true;
            let newpb = new RoomPosition(data.pbx, data.pby, data.pbroomname);
            if (this.pos.roomName != data.pbroomname) {
                this.goTo(newpb, 3);
            } else {
                if (flag) this.goTo(flag.pos, 3);
                else {
                    let pbRuin = newpb.lookFor(LOOK_RUINS)[0];//查看废墟
                    if (pbRuin) { this.withdraw_(pbRuin, RESOURCE_POWER) }
                    else {
                        let power = newpb.lookFor(LOOK_RESOURCES)[0];
                        if (power) { if (this.pickup(power) == -9) this.goTo(newpb, 1); }
                        else if (!this.store.getUsedCapacity()) this.suicide();// 地上没了身上也没有那就上天堂
                    }
                }
            }

        }
    }

    //跨shard运输
    public handle_carry_shard(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        if (!data) return
        if (data.biao === undefined) data.biao = 0;//0为拿，1为放,3为unboost自杀
        let level = data.level;
        if (data.biao == 3) {
            if (!this.unBoost()) this.suicide()
            return
        }
        if (this.memory.role == 'carryShard') {
            switch (level) {
                case 1: if (!this.BoostCheck(['move', 'carry'])) return; break;
                case 2: if (!this.BoostCheck(['move', 'carry', 'heal', 'tough'])) return; break;
                case 3: if (!this.BoostCheck(['move', 'carry', 'tough'])) return; break;
            }
        } else if (this.memory.role == 'double-heal') {
            if (!this.BoostCheck(['move', 'heal', 'tough'])) return;
        }
        //配对
        if (level >= 3 && !this.memory.double) {
            if (this.memory.role == 'double-heal') {
                /* 由heal来进行组队 */
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return creep.memory.role == 'carryShard' && !creep.memory.double
                        }
                    })
                    if (disCreep) {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                    }
                }
            }
            return
        }
        if (this.memory.double) {
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (creep_) {
                let a = (this.fatigue || creep_.fatigue)//爬的体力
                let b = (getDistance1(this.pos, creep_.pos) > 1 && this.pos.roomName == creep_.pos.roomName)//是否相邻
                if (this.memory.role == 'carryShard') {
                    if (a || b) return
                }
                if (this.memory.role == 'double-heal') {
                    data.biao = creep_.store.getUsedCapacity() ? 1 : 0;//有资源就1，没资源0 在跨sahrd时候用
                    if (creep_.pos.roomName == this.pos.roomName && getDistance1(this.pos, creep_.pos) >= 2) this.goTo(creep_.pos, 1);
                    else this.move(this.pos.getDirectionTo(creep_))
                    this.handle_heal(creep_)
                    return;
                }
            }
            else {//没有的话有可能在跨shard或者是死了
                if (this.memory.role == 'carryShard') {
                    let a = data.time ? data.time : 500;
                    if (this.ticksToLive >= a) return
                }
                if (this.memory.role == 'double-heal') {
                    if (this.hits < this.hitsMax) this.heal(this)
                    if (data.biao) {
                        this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 23, data.toshardName, data.shardData)//这个房间名我也不知道怎么填，跨shard前搜不到旗子，先跨shard
                        return;
                    }
                    else {
                        this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 23, data.nashardName, data.shardData)//这个房间名我也不知道怎么填，跨shard前搜不到旗子，先跨shard
                        return;
                    }
                }
            }
        }
        if (this.memory.role == 'carryShard') {
            if (!this.store.getUsedCapacity()) data.biao = 0;
            else data.biao = 1;
            this.heal(this);
            if (data.biao == 1) {//状态机
                if (Game.shard.name != data.toshardName) {
                    this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 23, data.toshardName, data.shardData)//跨shard前搜不到旗子，先跨shard
                    return
                }
                let toFlag = Game.flags[data.toFlagName];
                if (!toFlag) { this.say(`找不到放资源的Flag`); return }
                if (this.pos.roomName != toFlag.pos.roomName) {
                    this.arriveTo(toFlag.pos, 5, data.toshardName, data.shardData)
                    return
                }
                let structure = toFlag.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: function (obj) {
                        return obj.structureType == STRUCTURE_STORAGE || obj.structureType == STRUCTURE_TERMINAL
                    }
                })
                if (!structure) { this.say(`找不到罐子和终端`); return }
                if (this.transfer_(structure, data.type) == OK || !this.store.getUsedCapacity()) {
                    data.biao = 0;
                    data.totime = this.ticksToLive;
                    data.time = data.natime - data.totime + 20;
                    if (this.ticksToLive <= 2 * data.time) {
                        data.biao = 3;
                        if (this.memory.double) {
                            let creep_ = Game.creeps[this.memory.double];//配对爬
                            if (creep_ && creep_.memory.MissionData && creep_.memory.MissionData.Data) creep_.memory.MissionData.Data.biao = 3;
                        }
                    }
                }
            }
            else if (data.biao == 0) {
                if (data.num <= 0) {
                    if (!this.unBoost()) this.suicide()
                    if (this.memory.double) {
                        let creep_ = Game.creeps[this.memory.double];//配对爬
                        if (creep_ && creep_.memory.MissionData && creep_.memory.MissionData.Data) creep_.memory.MissionData.Data.biao = 3;
                    }
                    return
                }
                if (Game.shard.name != data.nashardName) {
                    this.arriveTo(new RoomPosition(24, 24, this.memory.belong), 23, data.nashardName, data.shardData)//跨shard前搜不到旗子，先跨shard
                    return
                }
                let naFlag = Game.flags[data.naFlagName];
                if (!naFlag) { this.say(`找不到拿资源的Flag`); return }
                if (this.pos.roomName != naFlag.pos.roomName) {
                    this.arriveTo(naFlag.pos, 5, data.nashardName, data.shardData)
                    return
                }
                let store = data.num >= this.store.getFreeCapacity() ? this.store.getFreeCapacity() : data.num;//需要拿取的数量
                let structure = naFlag.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: function (obj) {
                        return (obj.structureType == STRUCTURE_STORAGE || obj.structureType == STRUCTURE_TERMINAL) && obj.store && obj.store[data.type] >= store;
                    }
                })
                if (!structure) { this.say(`无法找到资源充足的建筑`); }
                if (this.withdraw_(structure, data.type) == OK) {
                    let mission = Game.rooms[this.memory.belong]?.GainMission(id)
                    if (mission) {
                        mission.Data.num -= this.store.getCapacity();//更新房间任务数据
                        data.num = mission.Data.num
                        if (mission.Data.num <= 0) Game.rooms[this.memory.belong].DeleteMission(id);//删除任务
                    }
                    data.biao = 1;
                    data.natime = this.ticksToLive;//记录拿取资源的生命
                }
            }
        }
    }
}