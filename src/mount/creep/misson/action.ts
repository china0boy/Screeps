import structure from "@/mount/structure"
import { filter_structure, GenerateAbility, generateID, isInArray, unzipPosition, zipPosition, getDistance, posFindClosestByRange, getDistance1, AttackNum } from "@/utils"
import { filter } from "lodash"
import creep from ".."
import { DEPOSIT_MAX_COOLDOWN } from '@/mount/structure/observer'
/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonActionExtension extends Creep {
    // 刷墙 未完成
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
        if (!missionData) return
        let id = missionData.id
        let mission = Game.rooms[this.memory.belong].GainMission(id)
        if (!mission) return;
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
                this.upgrade_()
            }
            else {
                let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
                else {
                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) this.withdraw_(structure, 'energy');
                }
                if (this.ticksToLive < 50 && this.store.getUsedCapacity('energy') <= 20) this.suicide()
            }
        }
        else if (this.memory.role == 'Eupgrade') {
            if (this.memory.working) {
                if (this.room.controller.my && this.room.controller.upgradeBlocked) {
                    let cons = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
                    if (cons) this.build_(cons)
                }
                else this.upgrade_()
            }
            else {
                let source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                if (source) this.harvest_(source)
                else {
                    let structure = posFindClosestByRange(this.pos, 'energy');
                    if (structure) this.withdraw_(structure, 'energy');
                }
                if (this.ticksToLive < 50 && this.store.getUsedCapacity('energy') <= 20) this.suicide()
            }
        }
    }

    //拆墙
    public handle_dismantle(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let data = missionData.Data
        if (data.boost && !this.BoostCheck(['work', 'move'])) return;
        if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard)
            return
        }
        /* 黄灰旗 */
        let disFlag = this.pos.findClosestByPath(FIND_FLAGS, {
            filter: (flag) => {
                return flag.color == COLOR_YELLOW && flag.secondaryColor == COLOR_GREY
            }
        })
        if (!disFlag) {
            var clostStructure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
                filter: (struc) => {
                    return !isInArray([STRUCTURE_RAMPART, STRUCTURE_WALL], struc.structureType)
                }
            })
            if (clostStructure) {
                clostStructure.pos.createFlag(generateID(), COLOR_YELLOW, COLOR_GREY)
                return
            }
            else return
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

    //攻击控制器并预订
    public handle_control(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
        if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
            if (!data.controlPos) this.arriveTo(new RoomPosition(24, 24, data.disRoom), 20, data.shard)
            else { this.goTo(new RoomPosition(data.controlPos.x, data.controlPos.y, data.controlPos.roomName), 1) };
        }
        else {
            let control = this.room.controller
            if (!control) { this.say('无控制器'); return }
            if (!data.controlPos) data.controlPos = { roomName: control.pos.roomName, x: control.pos.x, y: control.pos.y };
            if (!this.pos.isNearTo(control)) this.goTo(control.pos, 1)
            else {
                if (!control.my && control.owner) this.attackController(control)
                else this.reserveController(control)
            }
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
        if (mission.LabBind && !this.BoostCheck(['work'])) return
        this.workstate('energy')
        var terminal_ = global.Stru[this.memory.belong]['terminal'] as StructureTerminal
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

    //紧急支援
    public handle_support(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
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

    //双人小队
    public handle_doubleDismantle(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        if (!this.memory.standed) this.memory.standed = true;
        let id = missionData.id
        let data = missionData.Data
        var Flag = Game.flags[data.FlagName]
        if (!Flag) { this.say('找不到旗子'); return; }
        if (this.room.name == this.memory.belong) {
            if (this.memory.role == 'double-attack') {
                if (!this.BoostCheck(['attack', 'move', 'tough'])) return
            }
            else if (this.memory.role == 'double-heal') {
                if (!this.BoostCheck(['heal', 'move', 'tough'])) return
            }
            else if (this.memory.role == 'double-work') {
                if (!this.BoostCheck(['work', 'move', 'tough'])) return
            }
        }
        if (Game.shard.name != data.shard) {//先到同shard
            this.arriveTo(new RoomPosition(24, 24, 'W39S59'), 23, data.shard)//这个房间名我也不知道怎么填，跨shard前搜不到旗子，先跨shard
            return;
        }
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
        else { if (!Game.creeps[this.memory.double]) delete this.memory.double }
        if (this.memory.role == 'double-attack') {
            if (!Game.creeps[this.memory.double]) return
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (this.pos.roomName != Flag.pos.roomName) {

                if (this.hits < this.hitsMax) {
                    let Attack: Creep | AnyOwnedStructure = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (!Attack) Attack = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && !Memory.whitesheet.includes(structure.owner.username) } });
                    if (Attack && getDistance1(Attack.pos, this.pos) < 5) missionData.Attackid = Attack.id;
                }
                if (missionData.Attackid) {
                    let attackcreep = Game.getObjectById(missionData.Attackid) as Creep | AnyOwnedStructure;
                    if (!attackcreep || getDistance1(attackcreep.pos, this.pos) >= 5) delete missionData.Attackid;
                    else {
                        if (this.attack(attackcreep) == ERR_NOT_IN_RANGE) this.goTo(attackcreep.pos, 1);
                        return;
                    }
                }
                if (getDistance1(this.pos, creep_.pos) <= 1 || this.pos.roomName != creep_.pos.roomName)
                    this.goTo(Flag.pos, 1);
                else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); }
                return;
            }
            if (creep_) {
                let a = !(this.fatigue || creep_.fatigue)//爬的体力
                let b = !(getDistance1(this.pos, creep_.pos) > 1 && this.pos.roomName == creep_.pos.roomName)//是否相邻
                let attack_structure_flag = Flag.pos.lookFor('structure')
                if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
                    let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) && creep.getActiveBodyparts('attack') } });
                    if (Attack_creep && AttackNum(Attack_creep) >= 2000 && getDistance1(Attack_creep.pos, this.pos) <= 2 && a && b) {
                        this.goTo(this.pos.findClosestByPath(FIND_EXIT), 0);
                    }
                    else {
                        if (this.attack(attack_structure_flag[0]) == ERR_NOT_IN_RANGE && a && b) this.goTo(attack_structure_flag[0].pos, 1)
                        else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); }
                    }
                }
                else {
                    let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (Attack_creep) {
                        if (this.attack(Attack_creep) == ERR_NOT_IN_RANGE && a && b) this.goTo(Attack_creep.pos, 1)
                        else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); }
                    }
                    else {
                        let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && !Memory.whitesheet.includes(structure.owner.username) } });
                        if (Attack_structure) {
                            if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE && a && b) this.goTo(Attack_structure.pos, 1)
                            else { if (!this.fatigue && creep_.fatigue) this.goTo(creep_.pos, 1); }
                        }
                        else {
                            this.say('没有发现敌人');
                            this.goTo(Flag.pos, 0);
                        }
                    }
                }
            }
            else {
                let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (Attack_creep) { if (this.attack(Attack_creep) == ERR_NOT_IN_RANGE) this.goTo(Attack_creep[0].pos, 1) }
                else {
                    let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && !Memory.whitesheet.includes(structure.owner.username) } });
                    if (Attack_structure) {
                        if (this.attack(Attack_structure) == ERR_NOT_IN_RANGE) this.goTo(Attack_structure.pos, 1)
                    }
                    else {
                        this.say('没有发现敌人');
                        this.goTo(Flag.pos, 0);
                    }
                }
            }
        }
        if (this.memory.role == 'double-work') {
            if (!Game.creeps[this.memory.double]) return
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (this.pos.roomName != Flag.pos.roomName) {
                if (getDistance1(this.pos, creep_.pos) <= 1 || this.pos.roomName != creep_.pos.roomName)
                    this.goTo(Flag.pos, 1);
                return;
            }
            let a = creep_ ? !(this.fatigue || creep_.fatigue) : true//爬的体力
            let b = creep_ ? !(this.pos.roomName == creep_.pos.roomName && getDistance1(this.pos, creep_.pos) > 1) : true//是否相邻
            let attack_structure_flag = Flag.pos.lookFor('structure')
            if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
                if (this.dismantle(attack_structure_flag[0]) == ERR_NOT_IN_RANGE && a && b) this.goTo(attack_structure_flag[0].pos, 1)
            }
            else {
                let dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (object) { return object.structureType != 'rampart' } });
                if (!dis) dis = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
                if (dis && this.dismantle(dis) == ERR_NOT_IN_RANGE && a && b) this.goTo(dis.pos, 1)
            }
        }
        if (this.memory.role == 'double-heal') {
            if (!Game.creeps[this.memory.double]) return
            let creep_ = Game.creeps[this.memory.double];//配对爬
            if (creep_) {
                this.handle_heal(creep_)
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

    //紧急援建
    public handle_helpBuild(): void {
        let missionData = this.memory.MissionData
        if (!missionData) return
        let id = missionData.id
        let data = missionData.Data
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
            if (this.hits < this.hitsMax) this.heal(this)
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard)
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
                    if (this.room.name != harvestFlag.pos.roomName) {
                        this.goTo(harvestFlag.pos, 1)
                    }
                    else {
                        let source = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                        if (source) { this.harvest_(source) }
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
        if (data.creeptime == undefined) data.creeptime = 0;
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
                            this.memory.MissionData.Data.sourceId = targetStructure.id
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
        if (!this.memory.standed) this.memory.standed = true;
        let id = missionData.id;
        let data = missionData.Data;
        let Falg = Game.flags[data.FlagName];
        if (!this.BoostCheck(['move', 'ranged_attack', 'heal', 'tough'])) return
        if (Game.shard.name != data.shard) {//先到同shard
            this.arriveTo(new RoomPosition(24, 24, 'W39S59'), 23, data.shard)//这个房间名我也不知道怎么填，跨shard前搜不到旗子，先跨shard
            return;
        }
        if (!Falg) { this.say('找不到旗子'); return; }
        if (this.room.name != Falg.pos.roomName) {
            //搜索除了白名单并且有攻击部件的爬
            if (this.hits < this.hitsMax) {
                let Attack: Creep | AnyOwnedStructure = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (!Attack) Attack = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && !Memory.whitesheet.includes(structure.owner.username) } });
                if (Attack) missionData.Attackid = Attack.id;
            }
            if (missionData.Attackid) {
                let attackcreep = Game.getObjectById(missionData.Attackid) as Creep | AnyOwnedStructure;
                if (!attackcreep) delete missionData.Attackid;
                else {
                    if (getDistance1(attackcreep.pos, this.pos) >= 5) { this.handle_heal(); this.goTo(Falg.pos, 1); return; }
                    if (attackcreep instanceof Creep) this.handle_ranged_attack(attackcreep);
                    else { this.goTo(attackcreep.pos, 1); this.rangedMassAttack(); }
                    this.handle_heal(); return;
                }
            }
            this.goTo(Falg.pos, 1);
            return;
        }
        else {
            let attack_structure_flag = Falg.pos.lookFor('structure')
            if (attack_structure_flag.length) {//优先强制打旗子下面的建筑
                if (getDistance1(this.pos, attack_structure_flag[0].pos) > 3) {
                    this.goTo(attack_structure_flag[0].pos, 1);
                    this.rangedMassAttack();
                }
                else {
                    this.goTo(attack_structure_flag[0].pos, 1);
                    if (getDistance1(this.pos, attack_structure_flag[0].pos) <= 1) this.rangedMassAttack();
                    else this.rangedAttack(attack_structure_flag[0]);
                }
            }
            else {
                if (this.handle_ranged_attacks()) return
                let Attack_creep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                if (Attack_creep) {
                    this.say('打爬')
                    if (this.PathFinder(Attack_creep.pos, 3)) {//有完整路径就攻击爬 没有就找最近的墙
                        this.handle_ranged_attack(Attack_creep);
                    }
                    else {
                        if (!data.wall) {
                            data.wall = this.handle_wall_rampart(Attack_creep);
                        }
                        if (data.wall) {
                            let Wall = Game.getObjectById(data.wall);
                            if (!Wall) delete data.wall;
                            else {
                                this.say("打墙")
                                if (Wall instanceof StructureWall) {
                                    if (this.rangedAttack(Wall) == ERR_NOT_IN_RANGE) this.goTo(Wall.pos, 3);
                                } else {
                                    if (Wall instanceof StructureRampart) {
                                        if (getDistance1(this.pos, Wall.pos) >= 2) this.rangedAttack(Wall);
                                        else this.rangedMassAttack()
                                        this.goTo(Wall.pos, 1);
                                    }
                                    else delete data.wall;
                                }
                            }
                            if (Game.time % 10 == 0) delete data.wall;
                        }
                    }
                }
                else {
                    let Attack_structure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: function (structure) { return structure.structureType != 'controller' && structure.structureType != 'keeperLair' && structure.structureType != 'rampart' && !Memory.whitesheet.includes(structure.owner.username) } });
                    if (Attack_structure) {
                        this.goTo(Attack_structure.pos, 1);
                        this.rangedMassAttack();
                    }
                    else {
                        this.say('没有发现敌人');
                        this.goTo(Falg.pos, 0);
                    }
                }
            }
            this.handle_heal();
        }
    }

    /**风筝单个有attack敌人，没有就贴脸攻击*/
    public handle_ranged_attack(attackcreep: Creep): boolean {
        if (!attackcreep) return false;
        let distance = getDistance1(this.pos, attackcreep.pos);
        if (attackcreep.getActiveBodyparts('attack')) {
            if (distance > 3) { this.goTo(attackcreep.pos, 3); this.rangedMassAttack(); this.say('😈', true); }
            else {
                if (distance < 3) { this.goTo(attackcreep.pos, 5, true); this.say('👀', true); }
                this.rangedAttack(attackcreep);
            }
        }
        else {
            this.goTo(attackcreep.pos, 1);
            if (distance > 1 && distance <= 3) this.rangedAttack(attackcreep);
            else this.rangedMassAttack();
        }
        this.handle_heal();
        return true;
    }

    /**风筝多个有attack敌人，没有就贴脸攻击*/
    public handle_ranged_attacks(): boolean {
        let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
        if (creeps.length > 0) {
            let attaceCreeps = [];
            let r = 2;//半径
            if (creeps.length >= 2) r = 3
            for (let creep of creeps) {//计算逃跑线路
                if (getDistance1(this.pos, creep.pos) <= r && creep.getActiveBodyparts('attack')) attaceCreeps.push({ x: creep.pos.x, y: creep.pos.y })
            }
            if (attaceCreeps.length) {//有危险爬就逃跑，没有就攻击
                this.say('看不见走位走位👀', true)
                let x = 0, y = 0;//算中点
                for (let pos of attaceCreeps) {
                    x += pos.x;
                    y += pos.y;

                }
                if (x != 0 && y != 0) {//有就逃跑
                    x /= attaceCreeps.length;
                    y /= attaceCreeps.length;
                    let run = new RoomPosition(x, y, this.pos.roomName)
                    this.goTo(run, r + 5, true);
                    if (creeps.length >= 2) {
                        this.rangedMassAttack()
                    }
                    else this.rangedAttack(attaceCreeps[0])
                    this.handle_heal();
                    return true
                }
            }
            else {
                this.handle_ranged_attack(creeps[0])
                this.handle_heal();
                return true
            }
        }
        return false
    }

    /**计算我和目标中点里的最近的墙或者ra*/
    public handle_wall_rampart(target) {
        let x_ = (this.pos.x + target.pos.x) / 2;
        let y_ = (this.pos.y + target.pos.y) / 2;
        let Wall = new RoomPosition(x_, y_, this.pos.roomName)
        let attackWall = Wall.findClosestByRange(FIND_STRUCTURES, {
            filter: function (structure) {
                return (structure.structureType == 'constructedWall' ||
                    structure.structureType == 'rampart')
            }
        });
        if (attackWall) return attackWall.id
        else return null
    }

    /**优先治疗参数爬 */
    public handle_heal(healcreep?: Creep): boolean {
        if (healcreep) {
            if (this.hits == this.hitsMax) {
                let distance = getDistance1(this.pos, healcreep.pos);
                if (distance <= 1) this.heal(healcreep);
                else {
                    if (distance <= 3) this.rangedHeal(healcreep);
                    else this.heal(this);
                }
            }
            else this.heal(this);
        }
        else {
            if (this.hits == this.hitsMax) {
                let healcreep = this.pos.findInRange(FIND_MY_CREEPS, 1, { filter: function (creep) { return creep.hits != creep.hitsMax; } });
                if (healcreep.length) { this.heal(healcreep[0]); }
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
        if (data.LabBind && !this.BoostCheck(['work'])) return//检查boost

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
                            return creep != this && !creep.getActiveBodyparts('heal') && creep.memory.MissionData.Data.healerCreepName == data.healerCreepName && !creep.memory.double
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
}