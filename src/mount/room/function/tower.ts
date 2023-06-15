import { isInArray, ToughNum } from "@/utils";

/* 房间原型拓展   --方法  --防御塔 */
export default class RoomFunctionTowerExtension extends Room {
    public TowerWork(): void {
        if (this.memory.state == 'peace') {
            if (Game.flags[`${this.name}/repair`]) {
                var towers = this.find(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'tower' && stru.id != this.memory.StructureIdData.NtowerID
                    }
                }) as StructureTower[]
                var ramparts = this.getListHitsleast(['rampart', 'constructedWall'], 3)
                for (var t of towers) if (t.store.getUsedCapacity('energy') > 400) t.repair(ramparts)
            }
            this.TowerRepairList()
            if (!global.Repairlist[this.name]) global.Repairlist[this.name] = []
            if (global.Repairlist[this.name].length > 0) {
                let Ntower: StructureTower = null
                if (this.memory.StructureIdData.NtowerID) { Ntower = Game.getObjectById(this.memory.StructureIdData.NtowerID) as StructureTower }
                if (!Ntower) { delete this.memory.StructureIdData.NtowerID; return; }
                let Repairdata = Game.getObjectById(global.Repairlist[this.name][0]) as StructureTower
                if (!Repairdata) {
                    global.Repairlist[this.name].shift()
                    return
                }
                if (Repairdata.hits >= Repairdata.hitsMax) {
                    global.Repairlist[this.name].shift()
                    return
                }
                Ntower.repair(Repairdata)
            }
        }
        else if (this, this.memory.state == 'war') {
            if (Game.flags[`${this.name}/stop`]) return
            if (!this.memory.TowerAttackList) this.memory.TowerAttackList = []
            if (this.memory.switch.AutoDefend) {
                if (Game.shard.name != 'shrad3') {
                    let enemys = this.find(FIND_HOSTILE_CREEPS, {
                        filter: (creep) => {
                            return !isInArray(Memory.whitesheet, creep.owner.username) && creep.owner.username != 'Invader' && !creep.getActiveBodyparts('tough')
                        }
                    })
                    if (enemys.length) {
                        for (let i of this.memory.StructureIdData.AtowerID) {
                            let tower_ = Game.getObjectById(i) as StructureTower
                            if (!tower_) continue
                            if (enemys.length >= 1) {
                                if (Game.time % 2 == 0) tower_.attack(enemys[0])
                                else tower_.attack(enemys[1])
                            }
                            else {
                                tower_.attack(enemys[0])
                            }
                        }
                    }
                }

                let flag = Game.flags[`${this.name}/attack`]
                if (flag) {
                    let creeps = flag.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                        filter: (creep) => {
                            return !isInArray(Memory.whitesheet, creep.owner.username)
                        }
                    })
                    if (creeps) {
                        for (let c of this.memory.StructureIdData.AtowerID) {
                            let thisTower = Game.getObjectById(c) as StructureTower
                            if (!thisTower) {
                                let index = this.memory.StructureIdData.AtowerID.indexOf(c); this.memory.StructureIdData.AtowerID.splice(index, 1); continue
                            }
                            else thisTower.attack(creeps[0])
                        }
                    }
                }
                // 0到20单点 100交替打 200算伤打 999打不动 双人小队大于2700就打
                if (!this.memory.TowerAttack) this.memory.TowerAttack = {}
                if (Game.time % 25 == 0 || Object.keys(this.memory.TowerAttack).length == 0) {
                    let enemys = this.find(FIND_HOSTILE_CREEPS, {
                        filter: (creep) => {
                            return !isInArray(Memory.whitesheet, creep.owner.username) && creep.owner.username != 'Invader' && creep.getActiveBodyparts('tough')
                        }
                    })
                    if (enemys.length) {
                        for (let i of enemys) {
                            if (!this.memory.TowerAttack[i.id] || this.memory.TowerAttack[i.id] == 999) this.memory.TowerAttack[i.id] = 200
                        }
                    }
                }
                // 先攻击双人小队的奶妈
                if (!this.memory.TowerAttackList.length) {
                    for (let i in this.memory.TowerAttack) {
                        let enemy = Game.getObjectById(i) as Creep
                        if (!enemy) {
                            delete this.memory.TowerAttack[i]; continue
                        }
                        if (enemy.getActiveBodyparts('heal') > 0 && this.memory.TowerAttack[i] == 200) {
                            this.memory.TowerAttackList.push([i, enemy.hits])
                        }
                    }
                }
                // 寻找没有奶妈的双人小队
                if (!this.memory.TowerAttackList.length) {
                    for (let i in this.memory.TowerAttack) {
                        let enemy = Game.getObjectById(i) as Creep
                        if (!enemy) {
                            delete this.memory.TowerAttack[i]; continue
                        }
                        if (enemy.getActiveBodyparts('heal') <= 10 && this.memory.TowerAttack[i] == 200 && enemy.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (obj) { return obj.getActiveBodyparts("heal") >= 20 } }).length == 0) {
                            this.memory.TowerAttackList.push([i, enemy.hits])
                        }
                    }
                }
                if (this.memory.TowerAttackList.length) {
                    let enemy = Game.getObjectById(this.memory.TowerAttackList[0][0]) as Creep
                    if (!enemy) {
                        this.memory.TowerAttackList.shift()
                        return
                    }
                    // 先看是否为双人小队
                    let room = this
                    let a = enemy.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (obj) { return obj.id != room.memory.TowerAttackList[0][0] } })
                    if (a.length == 0) {
                        // 单人小队
                        // 先计算敌方爬能抗伤害
                        let damage = ToughNum(enemy)
                        if (damage > 3600) {
                            // 伤害过高
                            this.memory.TowerAttack[enemy.id] = 999
                            this.memory.TowerAttackList.shift()
                        }
                        else {
                            // 塔的伤害大于敌方爬能抗伤害一直打
                            if (this.TowerDamage(enemy.pos) > damage + 100) {
                                this.TowerAttack(enemy)
                                if (this.memory.TowerAttack[enemy.id] > 200) {
                                    if (enemy.hits < this.memory.TowerAttackList[0][1]) {
                                        this.memory.TowerAttackList[0][1] = enemy.hits
                                    }
                                    else {
                                        this.memory.TowerAttack[enemy.id] = 999
                                        this.memory.TowerAttackList.shift()
                                    }
                                }
                                this.memory.TowerAttack[enemy.id]++
                            }
                            else {
                                if (enemy.hits < this.memory.TowerAttackList[0][1]) {
                                    this.TowerAttack(enemy)
                                    this.memory.TowerAttackList[0][1] = enemy.hits
                                }
                                else {
                                    this.memory.TowerAttack[enemy.id] = 200
                                    this.memory.TowerAttackList[0][1] = enemy.hits
                                }
                            }
                            return
                        }
                    }
                    if (a.length == 1) {
                        // 计算塔伤害
                        let towerDamage = this.TowerDamage(enemy.pos)
                        if (towerDamage < 2700) {
                            if (this.memory.StructureIdData.AtowerID && this.memory.StructureIdData.AtowerID.length <= 5 || Game.time % 200 == 0) {
                                //出兵打
                                this.memory.switch.AutoDefendAttack = true
                                this.memory.TowerAttackList.shift()
                            }
                            return
                        }
                        //先交替打
                        if (this.memory.TowerAttack[enemy.id] == 200) {
                            this.TowerAttack(enemy)
                            this.memory.TowerAttack[enemy.id]++
                            return
                        }
                        else {
                            if (!this.memory.TowerAttack[a[0].id]) this.memory.TowerAttack[a[0].id] == 200
                            if (this.memory.TowerAttack[a[0].id] == 200) {
                                this.TowerAttack(a[0])
                                this.memory.TowerAttack[a[0].id]++
                                return
                            }
                            else {
                                // 持续攻击
                                this.TowerAttack(enemy)
                                if (this.memory.TowerAttack[enemy.id] >= 202) {
                                    // 如果越打血越多就取消攻击
                                    if (this.memory.TowerAttackList[0][1] < enemy.hits) {
                                        this.memory.TowerAttack[enemy.id] = 999
                                        this.memory.switch.AutoDefendAttack = true
                                        this.memory.TowerAttackList.shift()
                                        return
                                    }
                                    else {
                                        this.memory.TowerAttackList[0][1] = enemy.hits
                                    }
                                }
                                this.memory.TowerAttack[enemy.id]++
                                return
                            }
                        }
                    }
                }
                return
            }
            if (!this.memory.TowerAttack) this.memory.TowerAttack = {}
            if (Game.time % 50 == 0 || Object.keys(this.memory.TowerAttack).length == 0) {
                let enemys = this.find(FIND_HOSTILE_CREEPS, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                if (enemys.length) {
                    for (let i of enemys) {
                        if (!this.memory.TowerAttack[i.id]) this.memory.TowerAttack[i.id] = 0
                    }
                }
            }
            //把攻击时间为0敌人的id放入内存
            if (!this.memory.TowerAttackList.length) {
                for (let i in this.memory.TowerAttack) {
                    let creep = Game.getObjectById(i) as Creep
                    if (!creep) {
                        delete this.memory.TowerAttack[i]
                        continue
                    }
                    if (this.memory.TowerAttack[i] == 0) {
                        this.memory.TowerAttackList.push([i, creep.hits])
                    }
                }
            }

            /* 没有主动防御下的防御塔逻辑 */
            if (this.memory.TowerAttackList.length > 0) {
                let creep = Game.getObjectById(this.memory.TowerAttackList[0][0]) as Creep
                if (!creep) {
                    this.memory.TowerAttackList.shift()
                    return
                }
                if (this.memory.TowerAttack[creep.id] == 0 || creep.hits < this.memory.TowerAttackList[0][1]) {
                    this.memory.TowerAttack[creep.id]++
                    this.memory.TowerAttackList[0][1] = creep.hits
                    this.TowerAttack(creep)
                    return
                }
                else {//把攻击时间变为100
                    this.memory.TowerAttack[creep.id] = 100
                    this.memory.TowerAttackList.shift()
                }
            }
        }
    }

    // 塔维修列表
    public TowerRepairList(): void {
        if ((Game.time - global.Gtime[this.name]) % 20) { return }
        global.Repairlist[this.name] = []
        var repairRoad = this.find(FIND_STRUCTURES, {
            filter: (stru) => {
                return (stru.structureType == 'road' || stru.structureType == 'container') && stru.hits / stru.hitsMax < 0.8
            }
        })
        if (repairRoad.length > 0) {
            for (let i in repairRoad) {
                let repairRoad_ = repairRoad[i] as Structure
                global.Repairlist[this.name].push(repairRoad_.id)
            }
        }
    }

    // 所有塔攻击
    public TowerAttack(creep: Creep): void {
        if (!this.memory.StructureIdData.AtowerID) this.memory.StructureIdData.AtowerID = []
        for (let i of this.memory.StructureIdData.AtowerID) {
            let tower_ = Game.getObjectById(i) as StructureTower
            if (!tower_) {
                let index = this.memory.StructureIdData.AtowerID.indexOf(i); this.memory.StructureIdData.AtowerID.splice(index, 1); continue
            }
            tower_.attack(creep)
        }
    }

    // 计算该位置塔能造成的总伤害
    public TowerDamage(pos: RoomPosition): number {
        let towerDamage = 0
        for (let i of this.memory.StructureIdData.AtowerID) {
            let tower_ = Game.getObjectById(i) as StructureTower
            if (!tower_) {
                let index = this.memory.StructureIdData.AtowerID.indexOf(i); this.memory.StructureIdData.AtowerID.splice(index, 1); continue
            }
            let distance = tower_.pos.getRangeTo(pos)
            let effect_ = tower_.effects ? tower_.effects.filter((e) => e.effect == PWR_OPERATE_TOWER)[0] as PowerEffect : undefined
            //计算强化效果  
            let effect = effect_ ? effect_.level ? POWER_INFO[PWR_OPERATE_TOWER].effect[effect_.level - 1] : 1 : 1
            if (distance <= 5) {
                towerDamage += 600 * effect;
            }
            else if (distance >= 20) {
                towerDamage += 150 * effect;
            }
            else {
                /* 根据距离计算 */
                towerDamage += (600 - (distance - 5) * 30) * effect;
            }
        }
        return towerDamage
    }
}