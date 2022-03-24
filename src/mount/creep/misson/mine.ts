import { isInArray, unzipPosition, zipPosition } from "@/utils";

/* 爬虫原型拓展   --任务  --任务行为 */
export default class CreepMissonMineExtension extends Creep {
    /* 外矿开采处理 */
    public handle_outmine():void{
        var creepMisson = this.memory.MissionData.Data
        var globalMisson = Game.rooms[this.memory.belong].GainMission(this.memory.MissionData.id)
        if (!globalMisson) {this.say("找不到全局任务了！");this.memory.MissionData = {};return}
        if (this.hits < this.hitsMax && globalMisson.Data.state == 2)
        {
            var enemy = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                return !isInArray(Memory.whitesheet,creep.owner.username)
            }})
            if (enemy) globalMisson.Data.state = 3
        }
        if (this.memory.role == 'out-claim')
        {
            if (this.room.name != creepMisson.disRoom  && !this.memory.disPos)
            {
                this.goTo(new RoomPosition(25,25,creepMisson.disRoom),20)
                if (this.room.name != this.memory.belong)
                {
                    /* 如果是别人的房间就不考虑 */
                    if (this.room.controller && this.room.controller.owner && this.room.controller.owner.username != this.owner.username)
                        return
                    if (Memory.outMineData && Memory.outMineData[this.room.name])
                    {
                        for (var i of Memory.outMineData[this.room.name].road)
                        {
                            var thisPos = unzipPosition(i)
                            if (thisPos.roomName == this.name && !thisPos.GetStructure('road'))
                            {
                                thisPos.createConstructionSite('road')
                            }
                        }
                    }
                }
            }
            if (!this.memory.disPos && this.room.name == creepMisson.disRoom)
            {
                var controllerPos = this.room.controller.pos
                this.memory.disPos = zipPosition(controllerPos)
            }
            if (this.memory.disPos)
            {
                if (!this.memory.num) this.memory.num = 5000
                if (this.room.controller.reservation && this.room.controller.reservation.ticksToEnd && this.room.controller.reservation.username == this.owner.username && this.room.controller.reservation.ticksToEnd <= this.memory.num)
                {
                var Cores = this.room.find(FIND_STRUCTURES,{filter:(structure)=>{
                    return structure.structureType == STRUCTURE_INVADER_CORE
                }})
                if (Cores.length > 0)
                    globalMisson.Data.state = 3
                }
                if (this.room.controller.reservation && this.room.controller.reservation.ticksToEnd && this.room.controller.reservation.username != this.owner.username)
                {
                    globalMisson.Data.state = 3
                }
                if (!this.pos.isNearTo(this.room.controller))
                {
                    var controllerPos = unzipPosition(this.memory.disPos)
                    this.goTo(controllerPos,1)
                }
                else
                {
                    let sin='乃琳!我真的好喜欢你呀!为了你!我要开外矿赚大米!'
                    if ( !this.room.controller.sign ||!this.room.controller.sign.username || this.room.controller.sign.username != this.owner.username||this.room.controller.sign.text!=sin)
                    {
                        this.signController(this.room.controller,sin)
                    }
                    this.reserveController(this.room.controller)
                    if (Game.time % 91 == 0)
                    {
                        if (Memory.outMineData && Memory.outMineData[this.room.name])
                        {
                            for (var i of Memory.outMineData[this.room.name].road)
                            {
                                var thisPos = unzipPosition(i) as RoomPosition
                                
                                if (thisPos.roomName == this.room.name && !thisPos.GetStructure('road'))
                                {
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
        else if (this.memory.role == 'out-harvest')
        {
            if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
            for (var point of Memory.outMineData[creepMisson.disRoom].minepoint)
            {
                if (!point.bind) point.bind = {}
                if (!point.bind.harvest && !this.memory.bindpoint)
                {
                    point.bind.harvest = this.name
                    this.memory.bindpoint = point.pos
                }
            }
            if (!this.memory.bindpoint) return
            var disPos = unzipPosition(this.memory.bindpoint)
            var source = disPos.lookFor(LOOK_SOURCES)[0]
            if (!source)return
            this.workstate('energy')
            if (this.memory.working)
            {
                var container_ = source.pos.findInRange(FIND_STRUCTURES,1,{filter:(stru)=>{return stru.structureType == 'container'}}) as StructureContainer[]
                if (container_[0]){
                    if(!this.pos.isEqualTo(container_[0].pos)) this.goTo(container_[0].pos,0)
                    else
                    {
                        if (container_[0].hits < container_[0].hitsMax)
                        {
                            this.repair(container_[0])
                            return
                        }
                        this.transfer(container_[0],'energy')
                    }
                    Memory.outMineData[creepMisson.disRoom].car =  true
                }
                else
                {
                    Memory.outMineData[creepMisson.disRoom].car =  false
                    var constainer_constru = source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES,1,{filter:(stru)=>{return stru.structureType == 'container'}})
                    if(constainer_constru[0])
                    {
                        this.build(constainer_constru[0])
                    }
                    else
                    {
                        this.pos.createConstructionSite('container')
                    }
                }
            }
            else
            {
                if (!this.pos.isNearTo(disPos)) this.goTo(disPos,1)
                else this.harvest(source)
            }

        }
        else if (this.memory.role == 'out-car')
        {
            this.workstate('energy')
            if (!Memory.outMineData[creepMisson.disRoom] || Memory.outMineData[creepMisson.disRoom].minepoint.length <= 0) return
            for (var point of Memory.outMineData[creepMisson.disRoom].minepoint)
            {
                if (!point.bind.car && !this.memory.bindpoint)
                {
                    point.bind.car = this.name
                    this.memory.bindpoint = point.pos
                }
            }
            if (!this.memory.bindpoint) return
            var disPos = unzipPosition(this.memory.bindpoint)
            if (this.memory.working)
            {
                var stroage_ = global.Stru[this.memory.belong]['storage'] as StructureStorage
                if (!stroage_) return
                if (!this.pos.isNearTo(stroage_))
                {
                    var construsions = this.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES,{filter:(constr)=>{
                        return constr.structureType == 'road'
                    }})
                    if (construsions)
                    {
                        this.build_(construsions)
                        return
                    }
                    var road_ = this.pos.GetStructure('road')
                    if (road_ && road_.hits < road_.hitsMax)
                    {
                        this.repair(road_)
                        return
                    }
                    this.goTo(stroage_.pos,1)
                }
                else
                {
                    this.transfer(stroage_,"energy")
                    if (this.ticksToLive < 100) this.suicide()
                }
            }
            else
            {
                if (!Game.rooms[disPos.roomName])
                {
                    this.goTo(disPos,1)
                    return
                }
                this.say("🚗")
                var container_ = disPos.findInRange(FIND_STRUCTURES,3,{filter:(stru)=>{
                    return stru.structureType == 'container'
                }}) as StructureContainer[]
                if (container_[0] && container_[0].store.getUsedCapacity('energy') >= this.store.getCapacity())
                {
                    if(this.withdraw(container_[0],'energy') == ERR_NOT_IN_RANGE)
                    {
                        this.goTo(container_[0].pos,1)
                        return
                    }
                    this.withdraw_(container_[0],'energy')
                }
                else if(container_[0] &&  container_[0].store.getUsedCapacity('energy') < this.store.getCapacity())
                {
                    this.goTo(container_[0].pos,1)
                    return
                }
                else if (!container_[0])
                {
                    this.goTo(disPos,1)
                    return
                }
            }
            
        }
        else
        {
            if (this.hits < this.hitsMax) this.heal(this)
            if (this.room.name != creepMisson.disRoom)
            {
                this.goTo(new RoomPosition(25,25,creepMisson.disRoom),20)
            }
            else
            {
                if (globalMisson.Data.state == 2)
                {
                    let wounded = this.pos.findClosestByRange(FIND_MY_CREEPS,{filter:(creep)=>{
                        return creep.hits < creep.hitsMax && creep != this
                    }})
                    if (wounded)
                    {
                        if (!this.pos.isNearTo(wounded)) this.goTo(wounded.pos,1)
                        this.heal(wounded)
                    }
                    return
                }
                var enemy = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                    return !isInArray(Memory.whitesheet,creep.owner.username)
                }})
                if (enemy)
                {
                    this.handle_ranged_attack(enemy)
                    return
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