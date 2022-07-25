import { findFollowData, findNextData, identifyGarrison, identifyNext, parts, RoomInRange } from "@/module/fun/funtion"
import { canSustain, PathClosestCreep, pathClosestFlag, pathClosestStructure, RangeClosestCreep, RangeCreep, warDataInit } from "@/module/war/war"
import { getDistance, isInArray, generateID } from "@/utils"

export default class CreepMissonWarExtension extends Creep {
    // 黄球拆迁
    public handle_dismantle(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let mission = missionData.Data
        if (mission.boost) {
            if (!this.BoostCheck(['move', 'work'])) return
        }
        if (this.room.name != mission.disRoom || mission.shard != Game.shard.name) { this.arriveTo(new RoomPosition(24, 24, mission.disRoom), 20, mission.shard, mission.shardData); return }
        // 对方开安全模式情况下 删除任务
        if (this.pos.roomName == mission.disRoom && this.room.controller && this.room.controller.safeMode) {
            if (Game.shard.name == this.memory.shard) {
                Game.rooms[this.memory.belong].DeleteMission(id)
            }
            return
        }
        /* dismantle_0 */
        let disFlag = this.pos.findClosestByRange(FIND_FLAGS, {
            filter: (flag) => {
                return flag.name.indexOf('dismantle') == 0
            }
        })
        if (!disFlag) {
            var clostStructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
                filter: (struc) => {
                    return !isInArray(['controller', 'storage', 'terminal', 'rampart'], struc.structureType)
                }
            })
            if (clostStructure) {
                clostStructure.pos.createFlag(`dismantle_${generateID()}`, COLOR_WHITE)
                return
            }
            else {
                let clostStru = this.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (str) => {
                        return str.structureType == 'constructedWall' || str.structureType == 'rampart'
                    }
                })
                if (clostStru) {
                    if (this.dismantle(clostStru) == ERR_NOT_IN_RANGE) this.goTo(clostStru.pos, 1)
                }
                return
            }
        }
        let stru = disFlag.pos.lookFor(LOOK_STRUCTURES)[0]
        if (stru) {
            this.memory.standed = true;
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
        if (data.biao) return
        if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
            this.arriveTo(new RoomPosition(24, 24, data.disRoom), 20, data.shard, data.shardData)
        }
        else {
            let control = this.room.controller
            if (!control) { this.say('无控制器'); return }
            if (!this.pos.isNearTo(control)) this.goTo(control.pos, 1)
            else {
                if (!control.my) {//不是我的控制器
                    if (control.owner.username) {//有占有者就攻击
                        if (control.upgradeBlocked > 1) return//有冷却等待
                        if (this.ticksToLive <= 3 || Game.time % 10 == 0) {//一起攻击
                            let creeps = this.pos.findInRange(FIND_MY_CREEPS, 2, { filter: function (object) { return object.getActiveBodyparts('claim'); } })
                            if (creeps.length >= data.num || this.ticksToLive <= 3) {
                                for (let i of creeps) {
                                    i.attackController(control)
                                    i.suicide()
                                    i.memory.MissionData.Data.biao = true
                                }
                                this.attackController(control)
                                this.suicide()
                            }
                        }
                    }//没有就预订
                    else this.reserveController(control)
                }
                else {//是就预订
                    this.reserveController(control)
                }

                if (data.interval >= 1000 && Game.rooms[this.memory.belong]) {//无缝连接
                    let mission = Game.rooms[this.memory.belong].GainMission(id)
                    if (!mission) return
                    if (data.body == 1) {
                        mission.CreepBind['claim-attack'].interval = 400 + this.ticksToLive
                    }
                    if (data.body == 2) {
                        mission.CreepBind['out-claim'].interval = 400 + this.ticksToLive
                    }
                    data.interval = 400 + this.ticksToLive
                }
            }
        }
    }
    // 紧急支援 已经修改，但未作充分测试 可能有bug
    public handle_support(): void {
        let missionData = this.memory.MissionData
        let id = missionData.id
        let data = missionData.Data
        if (!missionData) return
        var roomName = data.disRoom
        if (this.room.name == this.memory.belong && data.boost) {
            if (this.memory.role == 'double-attack') {
                if (!this.BoostCheck(['move', 'attack', 'tough'])) return
            }
            else if (this.memory.role == 'double-heal') {
                if (!this.BoostCheck(['move', 'heal', 'ranged_attack', 'tough'])) return
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
            if (this.room.name != roomName || Game.shard.name != data.shard) {
                this.arriveTo(new RoomPosition(24, 24, roomName), 23, data.shard, data.shardData)
            }
            else {
                let creeps = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                if (creeps) {
                    if (this.attack(creeps) == ERR_NOT_IN_RANGE) this.goTo(creeps.pos, 1)
                }
                else {
                    this.goTo(new RoomPosition(24, 24, data.disRoom), 10)
                }
                // 支援旗帜 support_double
                let flag = this.pos.findClosestByRange(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.name.indexOf('support_double') == 0
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
                // 攻击建筑
                let attack_flag = this.pos.findClosestByPath(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.name.indexOf('support_double_attack') == 0
                    }
                })
                if (attack_flag) {
                    if (attack_flag.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                        if (this.attack(attack_flag.pos.lookFor(LOOK_STRUCTURES)[0]) == ERR_NOT_IN_RANGE) this.goTo(creeps.pos, 1)
                    }
                    else attack_flag.remove()
                }
            }
        }
        if (this.memory.role == 'double-heal') {
            var disCreepName = this.memory.double
            var portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (stru) => {
                    return stru.structureType == 'portal'
                }
            })
            // 跨shard信息更新 可以防止一些可能出现的bug
            if (portal && data.shardData) {
                this.updateShardAffirm()
            }
            if (!Game.creeps[disCreepName] && portal) { this.arriveTo(new RoomPosition(25, 25, roomName), 20, data.shard, data.shardData); return }
            if (Game.creeps[this.memory.double]) this.moveTo(Game.creeps[this.memory.double])
            // 寻找敌人 远程攻击
            let enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
                filter: (creep) => {
                    return !isInArray(Memory.whitesheet, creep.owner.username)
                }
            })
            if (enemy[0]) this.rangedAttack(enemy[0])
            // 奶
            if (Game.creeps[this.memory.double]) {
                if (this.hits < this.hitsMax || Game.creeps[this.memory.double].hits < Game.creeps[this.memory.double].hitsMax) {
                    if (this.hits < Game.creeps[this.memory.double].hits) this.heal(this)
                    else {
                        if (this.pos.isNearTo(Game.creeps[this.memory.double])) this.heal(Game.creeps[this.memory.double])
                        else this.rangedHeal(Game.creeps[this.memory.double])
                    }
                    return
                }
            }
            // 默认治疗攻击爬，如果周围有友军，在自身血量满的情况下治疗友军
            let allys = this.pos.findInRange(FIND_CREEPS, 3, {
                filter: (creep) => {
                    return (creep.my || isInArray(Memory.whitesheet, creep.owner.username)) && creep.hitsMax - creep.hits > 350
                }
            })
            if (allys.length > 0) {
                // 寻找最近的爬
                let ally_ = allys[0]
                for (var i of allys) if (getDistance(this.pos, i.pos) < getDistance(ally_.pos, this.pos)) ally_ = i
                if (this.pos.isNearTo(ally_)) this.heal(ally_)
                else this.rangedHeal(ally_)
            }
            else {
                if (Game.creeps[this.memory.double]) this.heal(Game.creeps[this.memory.double])
                else this.heal(this)
            }
        }
    }

    // 红球防御
    public handle_defend_attack(): void {
        if (!this.BoostCheck(['move', 'attack'])) return
        this.memory.standed = true
        if (this.hitsMax - this.hits > 200) this.optTower('heal', this)
        this.memory.crossLevel = 16
        /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
        var nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
            filter: (creep) => {
                return !isInArray(Memory.whitesheet, creep.name)
            }
        })
        if (nearCreep.length > 0) {
            this.attack(nearCreep[0])
            this.optTower('attack', nearCreep[0])
        }
        /* 寻路去距离敌对爬虫最近的rampart */
        var hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS, {
            filter: (creep) => {
                return !isInArray(Memory.whitesheet, creep.name)
            }
        })
        if (hostileCreep.length > 0) {
            for (var c of hostileCreep)
                /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
                if (c.hits / c.hitsMax <= 0.8)
                    this.optTower('attack', c)
        }
        else return
        // 以gather_attack开头的旗帜  例如： defend_attack_0 优先前往该旗帜附近
        let gatherFlag = this.pos.findClosestByPath(FIND_FLAGS, {
            filter: (flag) => {
                return flag.name.indexOf('defend_attack') == 0
            }
        })
        if (gatherFlag) {
            this.goTo(gatherFlag.pos, 0)
            return
        }
        if (!Game.rooms[this.memory.belong].memory.enemy[this.name]) Game.rooms[this.memory.belong].memory.enemy[this.name] = []
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
            /* 领取敌对爬虫 */
            let creeps_ = []
            for (var creep of hostileCreep) {
                /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
                if (this.isInDefend(creep)) continue
                else {
                    creeps_.push(creep)
                }
            }
            if (creeps_.length > 0) {
                let highestAim: Creep = creeps_[0]
                for (var i of creeps_) {
                    if (parts(i, 'attack') || parts(i, 'work')) {
                        highestAim = i
                        break
                    }
                }
                Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
                /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
                let nearHCreep = highestAim.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.name) && !this.isInDefend(creep)
                    }
                })
                if (nearHCreep.length > 0) for (var n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
            }
        }
        else {
            let en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
            if (!en) {
                Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0, 1)
                return
            }
            let nstC = en
            // 查找是否是小队爬, 发现不是小队爬就删除
            if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1) {
                B:
                for (var id of Game.rooms[this.memory.belong].memory.enemy[this.name]) {
                    let idCreep = Game.getObjectById(id) as Creep
                    if (!idCreep) continue B
                    if (Game.time % 10 == 0)    // 防止敌方爬虫bug
                        if (Math.abs(idCreep.pos.x - en.pos.x) >= 2 || Math.abs(idCreep.pos.y - en.pos.y) >= 2) {
                            let index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
                            Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index, 1)
                            continue B
                        }
                    if (getDistance(this.pos, idCreep.pos) < getDistance(this.pos, nstC.pos))
                        nstC = idCreep
                }
            }
            if (nstC) {
                // 寻找最近的爬距离最近的rampart,去那里呆着
                var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
                    }
                })
                if (nearstram)
                    this.goTo_defend(nearstram.pos, 0)
                else this.moveTo(nstC.pos)
            }
        }
        // 仍然没有说明主动防御已经饱和
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
            this.say("🔍")
            var closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                filter: (creep) => {
                    return !isInArray(Memory.whitesheet, creep.name)
                }
            })
            if (closestCreep && !this.pos.inRangeTo(closestCreep.pos, 3)) {
                /* 找离虫子最近的rampart */
                var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
                    }
                })
                if (nearstram) this.goTo_defend(nearstram.pos, 0)
            }
        }
        if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1) {
            this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0], Memory.RoomControlData[this.memory.belong].center[1], this.memory.belong))
        }
    }

    // 蓝球防御
    public handle_defend_range(): void {
        if (!this.BoostCheck(['move', 'ranged_attack'])) return
        this.memory.crossLevel = 15
        if (this.hitsMax - this.hits > 200) this.optTower('heal', this)
        /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
        var nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
            filter: (creep) => {
                return !isInArray(Memory.whitesheet, creep.name)
            }
        })
        if (nearCreep.length > 0) {
            var nearstCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
                filter: (creep) => {
                    return !isInArray(Memory.whitesheet, creep.name)
                }
            })
            if (nearstCreep.length > 0) this.rangedMassAttack()
            else this.rangedAttack(nearCreep[0])
            if (Game.time % 4 == 0)
                this.optTower('attack', nearCreep[0])
        }
        /* 寻路去距离敌对爬虫最近的rampart */
        var hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS, {
            filter: (creep) => {
                return !isInArray(Memory.whitesheet, creep.name)
            }
        })
        if (hostileCreep.length > 0) {
            for (var c of hostileCreep)
                /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
                if (c.hits / c.hitsMax <= 0.8)
                    this.optTower('attack', c)
        }
        // 以gather_attack开头的旗帜  例如： defend_range_0 优先前往该旗帜附近
        let gatherFlag = this.pos.findClosestByPath(FIND_FLAGS, {
            filter: (flag) => {
                return flag.name.indexOf('defend_range') == 0
            }
        })
        if (gatherFlag) {
            this.goTo(gatherFlag.pos, 0)
            return
        }
        if (!Game.rooms[this.memory.belong].memory.enemy[this.name]) Game.rooms[this.memory.belong].memory.enemy[this.name] = []
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
            /* 领取敌对爬虫 */
            let creeps_ = []
            for (var creep of hostileCreep) {
                /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
                if (this.isInDefend(creep)) continue
                else {
                    creeps_.push(creep)
                }
            }
            if (creeps_.length > 0) {
                let highestAim: Creep = creeps_[0]
                for (var i of creeps_) {
                    if (parts(i, 'ranged_attack')) {
                        highestAim = i
                        break
                    }
                }
                Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
                /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
                let nearHCreep = highestAim.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.name) && !this.isInDefend(creep)
                    }
                })
                if (nearHCreep.length > 0) for (var n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
            }
        }
        else {
            let en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
            if (!en) {
                Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0, 1)
                return
            }
            let nstC = en
            // 查找是否是小队爬, 发现不是小队爬就删除
            if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1) {
                B:
                for (var id of Game.rooms[this.memory.belong].memory.enemy[this.name]) {
                    let idCreep = Game.getObjectById(id) as Creep
                    if (!idCreep) continue B
                    if (Game.time % 10 == 0)
                        if (Math.abs(idCreep.pos.x - en.pos.x) >= 2 || Math.abs(idCreep.pos.y - en.pos.y) >= 2) {
                            let index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
                            Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index, 1)
                            continue B
                        }
                    if (getDistance(this.pos, idCreep.pos) < getDistance(this.pos, nstC.pos))
                        nstC = idCreep
                }
            }
            if (nstC) {
                // 寻找最近的爬距离最近的rampart,去那里呆着
                var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
                    }
                })
                if (nearstram)
                    this.goTo_defend(nearstram.pos, 0)
                else this.moveTo(nstC.pos)
            }
        }
        // 仍然没有说明主动防御已经饱和
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
            this.say("🔍")
            var closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                filter: (creep) => {
                    return !isInArray(Memory.whitesheet, creep.name)
                }
            })
            if (closestCreep && !this.pos.inRangeTo(closestCreep.pos, 3)) {
                /* 找离虫子最近的rampart */
                var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
                    }
                })
                if (nearstram) this.goTo_defend(nearstram.pos, 0)
            }
        }
        if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1) {
            this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0], Memory.RoomControlData[this.memory.belong].center[1], this.memory.belong))
        }
    }

    // 双人防御
    public handle_defend_double(): void {
        if (this.memory.role == 'defend-douAttack') {
            if (!this.BoostCheck(['move', 'attack', 'tough'])) return
        }
        else {
            if (!this.BoostCheck(['move', 'heal', 'tough'])) return
        }
        if (!this.memory.double) {
            if (this.memory.role == 'defend-douHeal') {
                /* 由heal来进行组队 */
                if (Game.time % 7 == 0) {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => {
                            return creep.memory.role == 'defend-douAttack' && !creep.memory.double
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
        if (this.memory.role == 'defend-douAttack') {
            if (this.hitsMax - this.hits > 1200) this.optTower('heal', this)
            if (!Game.creeps[this.memory.double]) return
            if (this.fatigue || Game.creeps[this.memory.double].fatigue) return
            if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
                return
            /* 确保在自己房间 */
            if (this.room.name != this.memory.belong) {
                this.goTo(new RoomPosition(24, 24, this.memory.belong), 23)
            }
            else {
                let flag = this.pos.findClosestByPath(FIND_FLAGS, {
                    filter: (flag) => {
                        return flag.name.indexOf('defend_double') == 0
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
                if (creeps && !isInArray([0, 49], creeps.pos.x) && !isInArray([0, 49], creeps.pos.y)) {
                    if (this.attack(creeps) == ERR_NOT_IN_RANGE) this.goTo(creeps.pos, 1)
                    else if (this.attack(creeps) == OK) {
                        this.optTower('attack', creeps)
                    }
                }
                if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1) {
                    this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0], Memory.RoomControlData[this.memory.belong].center[1], this.memory.belong))
                }
            }
        }
        else {
            if (this.hitsMax - this.hits > 600) this.optTower('heal', this)
            this.moveTo(Game.creeps[this.memory.double])
            if (Game.creeps[this.memory.double]) this.heal(Game.creeps[this.memory.double])
            else this.heal(this)
            if (!Game.creeps[this.memory.double]) { this.suicide(); return }
            else {
                if (this.pos.isNearTo(Game.creeps[this.memory.double])) {
                    var caption_hp = Game.creeps[this.memory.double].hits
                    var this_hp = this.hits
                    if (this_hp == this.hitsMax && caption_hp == Game.creeps[this.memory.double].hitsMax) this.heal(Game.creeps[this.memory.double])
                    if (this_hp < caption_hp) {
                        this.heal(this)
                    }
                    else {
                        this.heal(Game.creeps[this.memory.double])
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

    //四人小队 已经修改进入目标房前的集结动作s
    public handle_task_squard(): void {
        var data = this.memory.MissionData.Data
        var shard = data.shard          // 目标shard
        var roomName = data.disRoom     // 目标房间名
        var squadID = data.squadID      // 四人小队id
        /* controlledBySquadFrame为true代表不再受任务控制，改为战斗模块控制 */
        if (this.memory.controlledBySquardFrame) {
            /* 说明到达指定房间，并到达合适位置了 */
            /* 添加战争框架控制信息 */
            if (!Memory.squadMemory) Memory.squadMemory = {}
            if (!squadID) { return }
            if (!Memory.squadMemory[squadID]) {
                Memory.squadMemory[squadID] = {
                    creepData: this.memory.squad,
                    sourceRoom: this.memory.belong,
                    presentRoom: this.room.name,
                    disRoom: data.disRoom,
                    ready: false,
                    array: 'free',
                    sourceShard: this.memory.shard,
                    disShard: this.memory.targetShard,
                    squardType: data.flag
                }
            }
            /* 赋予全局Memory记忆后，即可交由全局四人小队框架控制 */
            return
        }
        else {
            /* 任务开始前准备 */
            if (this.room.name == this.memory.belong && this.memory.shard == Game.shard.name) {
                var thisRoom = Game.rooms[this.memory.belong]
                /* boost检查 */
                if (this.getActiveBodyparts('move') > 0) {
                    if (!this.BoostCheck([, 'move'])) return
                }
                if (this.getActiveBodyparts('heal') > 0) {
                    if (!this.BoostCheck([, 'heal'])) return
                }
                if (this.getActiveBodyparts('work') > 0) {
                    if (!this.BoostCheck([, 'work'])) return
                }
                if (this.getActiveBodyparts('attack') > 0) {
                    if (!this.BoostCheck([, 'attack'])) return
                }
                if (this.getActiveBodyparts('ranged_attack') > 0) {
                    if (!this.BoostCheck([, 'ranged_attack'])) return
                }
                if (this.getActiveBodyparts('tough') > 0) {
                    if (!this.BoostCheck([, 'tough'])) return
                }
                /* 组队检查 */
                if (!squadID) return
                if (!this.memory.MissionData.id) return
                if (!thisRoom.memory.squadData) Game.rooms[this.memory.belong].memory.squadData = {}
                let MissonSquardData = thisRoom.memory.squadData[squadID]
                if (!MissonSquardData) thisRoom.memory.squadData[squadID] = {}
                /* 编队信息初始化 */
                if (this.memory.creepType == 'heal' && !this.memory.squad) {
                    if (this.memory.role == 'x-aio') {
                        if (MissonSquardData == null || MissonSquardData == undefined) MissonSquardData = {}
                        if (Object.keys(MissonSquardData).length <= 0) MissonSquardData[this.name] = { position: '↙', index: 1, role: this.memory.role, creepType: this.memory.creepType }
                        if (Object.keys(MissonSquardData).length == 1 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↖', index: 0, role: this.memory.role, creepType: this.memory.creepType }
                        if (Object.keys(MissonSquardData).length == 2 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↘', index: 3, role: this.memory.role, creepType: this.memory.creepType }
                        if (Object.keys(MissonSquardData).length == 3 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↗', index: 2, role: this.memory.role, creepType: this.memory.creepType }
                    }
                    else {
                        if (MissonSquardData == null || MissonSquardData == undefined) MissonSquardData = {}
                        if (Object.keys(MissonSquardData).length <= 0) MissonSquardData[this.name] = { position: '↙', index: 1, role: this.memory.role, creepType: this.memory.creepType }
                        if (Object.keys(MissonSquardData).length == 2 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↘', index: 3, role: this.memory.role, creepType: this.memory.creepType }
                    }
                }
                else if (this.memory.creepType == 'attack' && !this.memory.squad) {
                    if (MissonSquardData == null || MissonSquardData == undefined) MissonSquardData = {}
                    if (Object.keys(MissonSquardData).length == 1 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↖', index: 0, role: this.memory.role, creepType: this.memory.creepType }
                    if (Object.keys(MissonSquardData).length == 3 && !isInArray(Object.keys(MissonSquardData), this.name)) MissonSquardData[this.name] = { position: '↗', index: 2, role: this.memory.role, creepType: this.memory.creepType }
                }
                if (Object.keys(thisRoom.memory.squadData[squadID]).length == 4 && !this.memory.squad) {
                    console.log(`[squad] 房间${this.memory.belong}ID为:${squadID}的四人小队数量已经到位!将从房间分发组队数据!`)
                    this.memory.squad = thisRoom.memory.squadData[squadID]
                    return
                }
                /* 检查是否所有爬虫都赋予记忆了 */
                if (!this.memory.squad) return
                for (var mem in this.memory.squad) {
                    if (!Game.creeps[mem]) return
                    if (!Game.creeps[mem].memory.squad) return
                }
                /* 爬虫都被赋予了组队数据了，就删除房间内的原始数据 */
                if (thisRoom.memory.squadData[squadID]) delete thisRoom.memory.squadData[squadID]
            }
            /* 在到达任务房间的隔壁房间前，默认攻击附近爬虫 */
            if (this.getActiveBodyparts('ranged_attack')) {
                let enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                if (enemy.length > 0) {
                    for (let enemy_ of enemy) {
                        if (enemy_.pos.isNearTo(this)) this.rangedMassAttack()
                    }
                    this.rangedAttack(enemy[0])
                }
            }
            /* 在到达任务房间的隔壁房间前，默认治疗附近爬虫 */
            if (this.getActiveBodyparts('heal')) {
                var bol = true
                for (var i in this.memory.squad) {
                    if (Game.creeps[i] && Game.creeps[i].hits < Game.creeps[i].hitsMax && this.pos.isNearTo(Game.creeps[i])) {
                        bol = false
                        this.heal(Game.creeps[i])
                    }
                }
                if (bol) this.heal(this)
            }
            /* 线性队列行走规则: 有成员疲劳就停止行走 */
            for (var cc in this.memory.squad) {
                if (Game.creeps[cc] && Game.creeps[cc].fatigue) return
            }
            /* 编号为 0 1 2 的爬需要遵守的规则 */
            if (this.memory.squad[this.name].index != 3 && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y))) {
                var followCreepName = findNextData(this)
                if (followCreepName == null) return
                var portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'portal'
                    }
                })
                var followCreep = Game.creeps[followCreepName]
                if (!followCreep && portal) { return }
                if (followCreep) {
                    // 跟随爬不靠在一起就等一等
                    if (!this.pos.isNearTo(followCreep)) return
                }

            }
            /* 编号为 1 2 3 的爬需要遵守的规则 */
            if (this.memory.squad[this.name].index != 0) {
                var disCreepName = findFollowData(this)
                var portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'portal'
                    }
                })
                // 跨shard信息更新 可以防止一些可能出现的bug
                if (portal && data.shardData) {
                    this.updateShardAffirm()
                }
                if (disCreepName == null || (!Game.creeps[disCreepName] && !portal)) return
                if (!Game.creeps[disCreepName] && portal) { this.arriveTo(new RoomPosition(24, 24, roomName), 20, shard, data.shardData); return }
                if (Game.shard.name == shard && !Game.creeps[disCreepName]) return
                var disCreep = Game.creeps[disCreepName]
                if (this.room.name == this.memory.belong) this.goTo(disCreep.pos, 0)
                else this.moveTo(disCreep)
                return
            }
            // 接下来在门口自动组队
            if (this.memory.squad[this.name].index == 0) {
                /* 判断在不在目标房间入口房间 */
                if (Game.flags[`squad_unit_${this.memory.MissionData.id}`]) {
                    // 有集结旗帜的情况下，优先前往目标房间
                    if (this.room.name != Game.flags[`squad_unit_${this.memory.MissionData.id}`].pos.roomName || Game.shard.name != data.shard) {
                        if (this.memory.squad[this.name].index == 0)
                            this.arriveTo(new RoomPosition(24, 24, roomName), 18, shard, data.shardData)
                        return
                    }
                }
                else {
                    // 没有集结旗帜的情况下，自动判断
                    if (identifyNext(this.room.name, roomName) == false || Game.shard.name != data.shard) {
                        this.say("🔪")
                        if (this.memory.squad[this.name].index == 0)
                            this.arriveTo(new RoomPosition(24, 24, roomName), 18, shard, data.shardData)
                        return
                    }
                }
                this.say('⚔️', true)
                if (!this.memory.arrived) {
                    if (Game.flags[`squad_unit_${this.memory.MissionData.id}`]) {
                        // 有旗帜的情况下，如果到达旗帜附近，就判定arrived为true
                        if (!this.pos.isEqualTo(Game.flags[`squad_unit_${this.memory.MissionData.id}`]))
                            this.goTo(Game.flags[`squad_unit_${this.memory.MissionData.id}`].pos, 0)
                        else
                            this.memory.arrived = true
                    }
                    else {
                        // 没有旗帜的情况下，到入口前5格组队
                        if (RoomInRange(this.pos, roomName, 5)) {
                            this.memory.arrived = true
                        }
                        else {
                            this.arriveTo(new RoomPosition(24, 24, roomName), 24, shard, data.shardData)
                        }
                    }
                }
                else {
                    // 能组队就组队 否则就继续走
                    if (identifyGarrison(this))
                        for (var crp in this.memory.squad) {
                            if (Game.creeps[crp])
                                Game.creeps[crp].memory.controlledBySquardFrame = true
                        }
                    else {
                        this.arriveTo(new RoomPosition(24, 24, roomName), 24, shard, data.shardData)
                    }
                }
            }
        }
    }
}
