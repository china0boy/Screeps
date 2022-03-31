import { isInArray, unzipPosition, zipPosition } from "@/utils";

/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonMineExtension extends Creep {
    /* 外矿开采处理 */
    public handle_outmine(): void {
        var creepMisson = this.memory.MissionData.Data
        var globalMisson = Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)
        if (!globalMisson) { this.say("找不到全局任务了！"); this.memory.MissionData = {}; return }
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
                if (this.room.name != this.memory.belong) {
                    /* 如果是别人的房间就不考虑 */
                    if (this.room.controller && this.room.controller.owner && this.room.controller.owner.username != this.owner.username)
                        return
                    if (Memory.outMineData && Memory.outMineData[this.room.name] && Game.time % 50 == 0) {
                        for (var i of Memory.outMineData[this.room.name].road) {
                            var thisPos = unzipPosition(i)
                            if (thisPos.roomName == this.name && !thisPos.GetStructure('road')) {
                                thisPos.createConstructionSite('road')
                            }
                        }
                    }
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
                    /*let sin = '乃琳!我真的好喜欢你呀!为了你!我要开外矿赚大米!'
                    if (!this.room.controller.sign || !this.room.controller.sign.username || this.room.controller.sign.username != this.owner.username || this.room.controller.sign.text != sin) {
                        this.signController(this.room.controller, sin)
                    }*/
                    this.reserveController(this.room.controller)
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
                    let a = global.Stru[this.memory.belong]['storage'] as StructureStorage ? global.Stru[this.memory.belong]['storage'] as StructureStorage : global.Stru[this.memory.belong]['terminal'] as StructureTerminal ? global.Stru[this.memory.belong]['terminal'] as StructureTerminal : null
                    if (a) this.transfer_(a, 'energy')
                }
                else this.goTo(new RoomPosition(25, 25, this.memory.belong), 23);
                return
            }
            if (this.ticksToLive <= 100) {
                if (this.store.getUsedCapacity()) {
                    let a = global.Stru[this.memory.belong]['storage'] as StructureStorage ? global.Stru[this.memory.belong]['storage'] as StructureStorage : global.Stru[this.memory.belong]['terminal'] as StructureTerminal ? global.Stru[this.memory.belong]['terminal'] as StructureTerminal : null
                    if (a) this.transfer_(a, 'energy')
                }
                else this.suicide()
                return;
            }
            this.workstate('energy')
            if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
            for (var point of Memory.outMineData[creepMisson.disRoom].minepoint) {
                if (!point.bind.car && !this.memory.bindpoint) {
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
                var stroage_ = global.Stru[this.memory.belong]['storage'] as StructureStorage
                var terminal_ = global.Stru[this.memory.belong]['terminal'] as StructureTerminal
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
                    var InvaderCore = this.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (stru) => {
                            return stru.structureType == STRUCTURE_INVADER_CORE
                        }
                    })
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
}