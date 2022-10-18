import { loop } from "@/main";
import { isInArray, unzipPosition, zipPosition, getDistance1 } from "@/utils";

/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonMineExtension extends Creep {
    /* 外矿开采处理 */
    public handle_outmine(): void {
        var creepMisson = this.memory.MissionData.Data
        if (!creepMisson.disRoom) { this.say('找不到房间'); return; }
        var globalMisson = Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)
        if (!globalMisson) {
            this.say("找不到全局任务了！");
            if (this.store.getUsedCapacity()) {
                let a = Game.rooms[this.memory.belong].storage ? Game.rooms[this.memory.belong].storage : Game.rooms[this.memory.belong].terminal ? Game.rooms[this.memory.belong].terminal : null
                if (a) this.transfer_(a, 'energy')
            }
            else this.suicide();
            this.memory.MissionData = {}; return
        }
        if (Memory.outMineData[creepMisson.disRoom].mineType == 'normal') {
            if (this.hits < this.hitsMax && globalMisson.Data.state == 2) {
                var enemy = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                if (enemy) globalMisson.Data.state = 3
            }
            if (this.memory.role == 'out-claim') {
                if (this.room.name != creepMisson.disRoom && !this.memory.disPos) {
                    this.goTo(new RoomPosition(25, 25, creepMisson.disRoom), 20)
                    return
                }
                if (this.ticksToLive == 1) {
                    //检测周围5格是否有敌方建筑
                    let attackStructure = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 5)
                    //如果有敌方建筑就发布外矿防守任务
                    if (attackStructure.length) {
                        let thisRoom = Game.rooms[this.memory.belong]
                        if (!thisRoom) { this.say(`被偷家了`); return }
                        let thisTask = thisRoom.public_red_out(this.pos.roomName)
                        if (thisTask) thisRoom.AddMission(thisTask)
                    }
                }
                if (!this.memory.disPos && this.room.name == creepMisson.disRoom) {
                    var controllerPos = this.room.controller.pos
                    this.memory.disPos = zipPosition(controllerPos)
                }
                if (this.memory.disPos) {
                    if (!this.memory.num) this.memory.num = 5000
                    if (this.room.controller.reservation && this.room.controller.reservation.ticksToEnd && this.room.controller.reservation.username == this.owner.username && this.room.controller.reservation.ticksToEnd <= this.memory.num) {
                        if (this.hits < this.hitsMax) globalMisson.Data.state = 3
                    }
                    if (this.room.controller.reservation && this.room.controller.reservation.ticksToEnd && this.room.controller.reservation.username != this.owner.username) {
                        globalMisson.Data.state = 3
                    }
                    if (!this.pos.isNearTo(this.room.controller)) {
                        var controllerPos = unzipPosition(this.memory.disPos)
                        this.goTo(controllerPos, 1)
                    }
                    else {
                        let control = this.room.controller
                        if (this.reserveController(control) == -7 && !this.room.controller.my) this.attackController(control)
                        if (Game.time % 91 == 0) {
                            if (Memory.outMineData && Memory.outMineData[this.room.name]) {
                                for (var i of Memory.outMineData[this.room.name].road) {
                                    var thisPos = unzipPosition(i) as RoomPosition
                                    if (thisPos.roomName == this.room.name && !thisPos.GetStructure('road')) {
                                        thisPos.createConstructionSite('road')
                                    }
                                }
                            }
                        }
                    }
                    if (this.room.controller.reservation)
                        this.memory.num = this.room.controller.reservation.ticksToEnd
                }
            }
            else if (this.memory.role == 'out-harvest') {
                if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
                if (globalMisson.Data.state == 3) {
                    this.goTo(new RoomPosition(25, 25, this.memory.belong), 23);
                    return
                }
                for (let point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                    if (!point.bind) point.bind = {}
                    if (Game.rooms[creepMisson.disRoom] && !point.bind.sourceId && point.pos) {
                        let disPos = unzipPosition(point.pos)
                        let source = disPos.lookFor(LOOK_SOURCES)[0]
                        if (source) point.bind.sourceId = source.id
                    }
                    if (Game.rooms[creepMisson.disRoom] && !point.bind.containerId && point.bind.sourceId) {
                        let source = Game.getObjectById(point.bind.sourceId) as Source
                        let container = source.pos.findInRange(FIND_STRUCTURES, 1, { filter: (stru) => { return stru.structureType == 'container' } }) as StructureContainer[]
                        if (container.length) point.bind.containerId = container[0].id
                    }
                    if (!point.bind.harvest && !this.memory.disPos) {
                        point.bind.harvest = this.name
                        this.memory.disPos = point.pos
                    }
                    if (this.name == point.bind.harvest && !this.memory.bindpoint && point.bind.sourceId) {
                        this.memory.bindpoint = point.bind.sourceId
                    }
                    if (this.name == point.bind.harvest && point.bind.containerId && !this.memory.containerID) {
                        this.memory.containerID = point.bind.containerId
                    }
                }
                if (!this.memory.bindpoint || !this.memory.disPos) return
                //先去屋子
                this.workstate('energy')
                if (!this.memory.working) {
                    let disPos = unzipPosition(this.memory.disPos)
                    if (!this.pos.isNearTo(disPos)) this.goTo(disPos, 1)
                    else {
                        let source = Game.getObjectById(this.memory.bindpoint) as Source
                        this.harvest(source);
                        if (this.hits < this.hitsMax) globalMisson.Data.state = 3
                    }
                    return
                }
                //修建
                var source = Game.getObjectById(this.memory.bindpoint) as Source
                if (this.memory.containerID) var container = Game.getObjectById(this.memory.containerID) as StructureContainer
                else {
                    Memory.outMineData[creepMisson.disRoom].car = false
                    var constainer_constru = source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2, { filter: (stru) => { return stru.structureType == 'container' } })
                    if (constainer_constru[0]) {
                        this.build(constainer_constru[0])
                        this.harvest(source);
                    }
                    else {
                        this.pos.createConstructionSite('container')
                    }
                    return
                }
                if (!container) {
                    for (let point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                        if (point.bind.harvest == this.name) { delete point.bind.containerId; delete this.memory.containerID; return }
                    }
                    return
                }
                //挖
                if (this.memory.working) {
                    if (!this.pos.isEqualTo(container.pos)) this.goTo(container.pos, 0)
                    else {
                        let workNum = this.getActiveBodyparts('work')
                        if (container.hitsMax - container.hits >= workNum * 100) {
                            this.repair(container)
                            return
                        }
                        if (container.store.getFreeCapacity() >= workNum * 2)
                            this.harvest(source);
                    }
                    Memory.outMineData[creepMisson.disRoom].car = true
                }

            }
            else if (this.memory.role == 'out-car') {
                if (globalMisson.Data.state == 3) {
                    if (this.store.getUsedCapacity()) {
                        let a = Game.rooms[this.memory.belong].storage ? Game.rooms[this.memory.belong].storage : Game.rooms[this.memory.belong].terminal ? Game.rooms[this.memory.belong].terminal : null
                        if (a) this.transfer_(a, 'energy')
                    }
                    else this.goTo(new RoomPosition(25, 25, this.memory.belong), 23);
                    return
                }
                if (this.ticksToLive <= 100) {
                    if (this.store.getUsedCapacity()) {
                        let a = Game.rooms[this.memory.belong].storage ? Game.rooms[this.memory.belong].storage : Game.rooms[this.memory.belong].terminal ? Game.rooms[this.memory.belong].terminal : null
                        if (a) this.transfer_(a, 'energy')
                    }
                    else this.suicide()
                    return;
                }
                this.workstate('energy')
                if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
                for (var point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                    if (!point.bind.car && !this.memory.bindpoint && point.bind.containerId) {
                        point.bind.car = this.name
                        this.memory.bindpoint = point.bind.containerId
                    }
                    if (!this.memory.disPos && this.name == point.bind.car)
                        this.memory.disPos = point.pos
                }
                if (!this.memory.bindpoint || !this.memory.disPos) return
                let disPos = unzipPosition(this.memory.disPos)
                if (this.hits < this.hitsMax && this.pos.roomName == disPos.roomName) globalMisson.Data.state = 3
                if (this.memory.working) {
                    var stroage_ = Game.rooms[this.memory.belong].storage
                    var terminal_ = Game.rooms[this.memory.belong].terminal
                    var a = stroage_ ? stroage_ : terminal_ ? terminal_ : null
                    if (!a) return
                    if (!this.pos.isNearTo(a)) {
                        var construsions = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
                            filter: (constr) => {
                                return constr.structureType == 'road'
                            }
                        })
                        if (construsions) {
                            this.build_(construsions)
                            return
                        }
                        var road_ = this.pos.GetStructure('road')
                        if (road_ && road_.hitsMax - road_.hits >= 400) {
                            this.repair(road_)
                        }
                        this.goTo(a.pos, 1)
                    }
                    else {
                        this.transfer(a, "energy")
                    }
                }
                else {
                    if (!Game.rooms[disPos.roomName]) {
                        this.goTo(disPos, 1)
                        return
                    }
                    this.say("🚗")

                    let container = Game.getObjectById(this.memory.bindpoint) as StructureContainer
                    if (container && container.store.getUsedCapacity('energy') >= this.store.getCapacity()) {
                        if (this.withdraw(container, 'energy') == ERR_NOT_IN_RANGE) {
                            this.goTo(container.pos, 1)
                            return
                        }
                    }
                    else if (container && container.store.getUsedCapacity('energy') < this.store.getCapacity()) {
                        this.goTo(container.pos, 1)
                        return
                    }
                    else if (!container) {
                        this.goTo(disPos, 2)
                        return
                    }
                }

            }
            else {
                if (this.hits < this.hitsMax) this.heal(this)
                if (this.room.name != creepMisson.disRoom) {
                    this.memory.crossLevel = 11
                    this.goTo(new RoomPosition(25, 25, creepMisson.disRoom), 20)
                }
                else {
                    if (globalMisson.Data.state == 2) {
                        let wounded = this.pos.findClosestByRange(FIND_MY_CREEPS, {
                            filter: (creep) => {
                                return creep.hits < creep.hitsMax && creep != this
                            }
                        })
                        if (wounded) {
                            if (!this.pos.isNearTo(wounded)) this.goTo(wounded.pos, 1)
                            this.heal(wounded)
                        }
                        return
                    }
                    var enemy = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                        filter: (creep) => {
                            return !isInArray(Memory.whitesheet, creep.owner.username)
                        }
                    })
                    if (enemy) {
                        this.handle_ranged_attack(enemy)
                        return
                    }
                    else {
                        let InvaderCore = this.pos.findClosestByPath(FIND_STRUCTURES, {
                            filter: (stru) => {
                                return stru.structureType == STRUCTURE_INVADER_CORE
                            }
                        }) as StructureInvaderCore
                        if (InvaderCore) {
                            if (this.rangedAttack(InvaderCore) == ERR_NOT_IN_RANGE) this.goTo(InvaderCore.pos, 3)
                        }
                    }
                    /*
                    var InvaderCore = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter:(stru)=>{
                        return stru.structureType != 'rampart'
                    }})
                    if (InvaderCore)
                    {
                        this.memory.standed = true
                        if (!this.pos.isNearTo(InvaderCore)) this.goTo(InvaderCore.pos,1)
                        else this.rangedMassAttack()
                        return
                    }*/
                }
            }
        }
        if (Memory.outMineData[creepMisson.disRoom].mineType == 'center') {
            if (this.memory.role == 'out-harvest') {
                if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
                if (this.hits < this.hitsMax) {
                    this.heal(this);
                    let attack = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } })
                    if (attack.length) creepMisson.attackCreep = attack[0].id;
                } else {
                    if (this.memory.carId) {
                        let heal = Game.creeps[this.memory.carId]
                        if (heal) {
                            if (heal.hits < heal.hitsMax) {
                                let r = getDistance1(this.pos, heal.pos)
                                if (r <= 3 && r > 1) this.rangedHeal(heal)
                                if (r <= 1) this.heal(heal)
                                return
                            }
                        }
                        else delete this.memory.carId
                    }
                }
                if (creepMisson.attackCreep) {
                    let attack = Game.getObjectById(creepMisson.attackCreep) as Creep
                    if (!attack) { delete creepMisson.attackCreep; return }
                    if (getDistance1(this.pos, attack.pos) <= 3) {
                        this.goTo(attack.pos, 1)
                        return;
                    }
                }
                for (let point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                    if (!point.bind) point.bind = {}
                    if (Game.rooms[creepMisson.disRoom] && !point.bind.sourceId && point.pos) {
                        let disPos = unzipPosition(point.pos)
                        let source = disPos.lookFor(LOOK_SOURCES)[0]
                        if (source) point.bind.sourceId = source.id
                    }
                    if (Game.rooms[creepMisson.disRoom] && !point.bind.containerId && point.bind.sourceId) {
                        let source = Game.getObjectById(point.bind.sourceId) as Source
                        let container = source.pos.findInRange(FIND_STRUCTURES, 1, { filter: (stru) => { return stru.structureType == 'container' } }) as StructureContainer[]
                        if (container.length) point.bind.containerId = container[0].id
                    }
                    if (!point.bind.harvest && !this.memory.disPos) {
                        point.bind.harvest = this.name
                        this.memory.disPos = point.pos
                    }
                    if (this.name == point.bind.harvest && !this.memory.bindpoint && point.bind.sourceId) {
                        this.memory.bindpoint = point.bind.sourceId
                    }
                    if (this.name == point.bind.harvest && point.bind.containerId && !this.memory.containerID) {
                        this.memory.containerID = point.bind.containerId
                    }
                    if (this.name == point.bind.harvest && point.bind.car && !this.memory.carId) {
                        this.memory.carId = point.bind.car
                    }
                }
                if (!this.memory.bindpoint || !this.memory.disPos) return
                //先去屋子
                this.workstate('energy')
                if (!this.memory.working) {
                    let disPos = unzipPosition(this.memory.disPos)
                    if (!this.pos.isNearTo(disPos)) this.goTo(disPos, 1)
                    else {
                        let source = Game.getObjectById(this.memory.bindpoint) as Source
                        this.harvest(source);
                    }
                    return
                }
                //修建
                var source = Game.getObjectById(this.memory.bindpoint) as Source
                if (this.memory.containerID) var container = Game.getObjectById(this.memory.containerID) as StructureContainer
                else {
                    Memory.outMineData[creepMisson.disRoom].car = false
                    var constainer_constru = source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2, { filter: (stru) => { return stru.structureType == 'container' } })
                    if (constainer_constru[0]) {
                        this.build(constainer_constru[0])
                        this.harvest(source);
                    }
                    else {
                        this.pos.createConstructionSite('container')
                    }
                    return
                }
                if (!container) {
                    for (let point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                        if (point.bind.harvest == this.name) { delete point.bind.containerId; delete this.memory.containerID; return }
                    }
                    return
                }
                //挖
                if (this.memory.working) {
                    if (!this.pos.isEqualTo(container.pos)) this.goTo(container.pos, 0)
                    else {
                        let workNum = this.getActiveBodyparts('work')
                        if (container.hitsMax - container.hits >= workNum * 100) {
                            this.repair(container)
                            return
                        }
                        if (container.store.getFreeCapacity() >= workNum * 2)
                            this.harvest(source);
                    }
                    Memory.outMineData[creepMisson.disRoom].car = true
                }
            }
            else if (this.memory.role == 'out-car') {
                if (this.hits < this.hitsMax) {
                    if (this.memory.working) {
                        var stroage_ = Game.rooms[this.memory.belong].storage
                        var terminal_ = Game.rooms[this.memory.belong].terminal
                        var a = stroage_ ? stroage_ : terminal_ ? terminal_ : null
                        if (!a) return
                        if (!this.pos.isNearTo(a)) {
                            if (this.getActiveBodyparts('work')) {
                                var construsions = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
                                    filter: (constr) => {
                                        return constr.structureType == 'road'
                                    }
                                })
                                if (construsions) {
                                    this.build_(construsions)
                                    return
                                }
                                var road_ = this.pos.GetStructure('road')
                                if (road_ && road_.hitsMax - road_.hits >= 400) {
                                    this.repair(road_)
                                }
                            }
                            this.goTo(a.pos, 1)
                        }
                        else {
                            this.transfer(a, "energy")
                        }
                        return
                    }
                    let attack = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (attack.length) { this.goTo(attack[0].pos, 5, true); return }
                }
                if (this.ticksToLive <= (creepMisson.time ? creepMisson.time : 100)) {
                    if (this.store.getUsedCapacity()) {
                        let a = Game.rooms[this.memory.belong].storage ? Game.rooms[this.memory.belong].storage : Game.rooms[this.memory.belong].terminal ? Game.rooms[this.memory.belong].terminal : null
                        if (a) this.transfer_(a, 'energy')
                    }
                    else this.suicide()
                    return;
                }
                if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
                for (var point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                    if (!point.bind.car && !this.memory.bindpoint && point.bind.containerId) {
                        point.bind.car = this.name
                        this.memory.bindpoint = point.bind.containerId
                        creepMisson.time = point.time
                    }
                    if (!this.memory.disPos && this.name == point.bind.car)
                        this.memory.disPos = point.pos
                }
                if (!this.memory.bindpoint || !this.memory.disPos) return
                let disPos = unzipPosition(this.memory.disPos)
                this.workstate('energy')
                if (this.memory.working) {
                    var stroage_ = Game.rooms[this.memory.belong].storage
                    var terminal_ = Game.rooms[this.memory.belong].terminal
                    var a = stroage_ ? stroage_ : terminal_ ? terminal_ : null
                    if (!a) return
                    if (!this.pos.isNearTo(a)) {
                        if (this.getActiveBodyparts('work')) {
                            var construsions = this.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
                                filter: (constr) => {
                                    return constr.structureType == 'road'
                                }
                            })
                            if (construsions) {
                                this.build_(construsions)
                                return
                            }
                            var road_ = this.pos.GetStructure('road')
                            if (road_ && road_.hitsMax - road_.hits >= 400) {
                                this.repair(road_)
                            }
                        }
                        this.goTo(a.pos, 1)
                    }
                    else {
                        this.transfer(a, "energy")
                    }
                }
                else {
                    if (!Game.rooms[disPos.roomName]) {
                        this.goTo(disPos, 1)
                        return
                    }
                    this.say("🚗")
                    let container = Game.getObjectById(this.memory.bindpoint) as StructureContainer
                    if (container && getDistance1(this.pos, container.pos) <= 2) {
                        let res = this.pos.findInRange(FIND_DROPPED_RESOURCES, 2);
                        if (res.length) {
                            if (this.pickup(res[0]) == ERR_NOT_IN_RANGE)
                                this.goTo(res[0].pos, 1)
                            return
                        }
                    }
                    if (container && container.store.getUsedCapacity('energy') >= this.store.getFreeCapacity()) {
                        if (this.withdraw(container, 'energy') == ERR_NOT_IN_RANGE) {
                            this.goTo(container.pos, 1)
                            return
                        }
                    }
                    else if (container && container.store.getUsedCapacity('energy') < this.store.getCapacity()) {
                        this.goTo(container.pos, 1)
                        return
                    }
                    else if (!container) {
                        this.goTo(disPos, 2)
                        return
                    }
                }
            } else if (this.memory.role == 'out-mineral') {
                if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
                if (this.hits < this.hitsMax) {
                    let attack = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } });
                    if (attack.length) { this.goTo(attack[0].pos, 5, true); return }
                }
                if (this.ticksToLive <= (creepMisson.time ? creepMisson.time : 100)) {
                    if (this.store.getUsedCapacity()) {
                        let a = Game.rooms[this.memory.belong].storage ? Game.rooms[this.memory.belong].storage : Game.rooms[this.memory.belong].terminal ? Game.rooms[this.memory.belong].terminal : null
                        if (a) this.transfer_(a, Object.keys(this.store)[0] as ResourceConstant)
                    }
                    else this.suicide()
                    return;
                }
                if (!this.memory.disPos) this.memory.disPos = Memory.outMineData[creepMisson.disRoom].mineral.Id
                if (!creepMisson.time) creepMisson.time = Memory.outMineData[creepMisson.disRoom].mineral.time
                if (!this.memory.disPos) return
                let mineral = Game.getObjectById(this.memory.disPos) as Mineral
                if (this.store.getFreeCapacity()) {
                    if (mineral && this.harvest(mineral) == ERR_NOT_IN_RANGE) this.goTo(mineral.pos, 1)
                }
                else {
                    var stroage_ = Game.rooms[this.memory.belong].storage
                    var terminal_ = Game.rooms[this.memory.belong].terminal
                    var a = stroage_ ? stroage_ : terminal_ ? terminal_ : null
                    if (!a) return
                    this.transfer_(a, Object.keys(this.store)[0] as ResourceConstant)
                }
            }
            else if (this.memory.role == 'out-defend') {
                let goRoom = new RoomPosition(25, 25, creepMisson.disRoom)
                if (this.hits < this.hitsMax) this.heal(this);
                if (this.room.name != creepMisson.disRoom) {
                    this.goTo(goRoom, 23)
                }
                else {
                    if (this.hits < this.hitsMax && !creepMisson.attackCreep) {
                        let attack = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, { filter: function (creep) { return !Memory.whitesheet.includes(creep.owner.username) } })
                        if (attack.length) creepMisson.attackCreep = attack[0].id;
                    }
                    if (creepMisson.attackCreep) {
                        let attack = Game.getObjectById(creepMisson.attackCreep) as Creep
                        if (!attack) { delete creepMisson.attackCreep; return }
                        if (this.handle_ranged_attack(attack, false)) return;
                    }
                    if (Game.time % 20 == 0 && !creepMisson.healCreep) {
                        let heal = this.pos.findInRange(FIND_MY_CREEPS, 5, { filter: function (creep) { return creep.hits < creep.hitsMax } })
                        if (heal.length) creepMisson.healCreep = heal[0].id
                    }
                    if (creepMisson.healCreep) {
                        let heal = Game.getObjectById(creepMisson.healCreep) as Creep
                        if (!heal || heal.hits == heal.hitsMax) { delete creepMisson.healCreep; return }
                        if (this.hits == this.hitsMax) {
                            let distance = getDistance1(this.pos, heal.pos);
                            if (distance <= 1) this.heal(heal);
                            else {
                                if (distance <= 3) this.rangedHeal(heal);
                            }
                        }
                        else this.heal(this);
                        this.goTo(heal.pos, 1)
                        return;
                    }
                    if (Memory.outMineData[creepMisson.disRoom].mineral) {
                        let mineral = Game.getObjectById(Memory.outMineData[creepMisson.disRoom].mineral.Id) as Mineral
                        if (getDistance1(this.pos, mineral.pos) >= 3) this.goTo(mineral.pos, 2)
                    }
                }
            }

        }
    }
}