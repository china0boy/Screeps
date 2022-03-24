import { findFollowData, findNextData, identifyGarrison, identifyNext, parts } from "@/module/fun/funtion"
import { getDistance,isInArray } from "@/utils"

export default class CreepMissonWarExtension extends Creep {
    // 红球防御
    public handle_defend_attack():void{
        if (!this.BoostCheck(['move','attack'])) return
        this.memory.standed = true
        if (this.hitsMax - this.hits > 200) this.optTower('heal',this)
        this.memory.crossLevel = 16
        /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
        var nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS,1,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.name)
        }})
        if (nearCreep.length > 0)
        {
            this.attack(nearCreep[0])
            this.optTower('attack',nearCreep[0])
        }
        /* 寻路去距离敌对爬虫最近的rampart */
        var hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.name)
        }})
        if (hostileCreep.length > 0)
        {
            for (var c of hostileCreep)
            /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
            if (c.hits/c.hitsMax <= 0.8)
            this.optTower('attack',c)
        }
        else return
        // 以gather_attack开头的旗帜  例如： defend_attack_0 优先前往该旗帜附近
        let gatherFlag = this.pos.findClosestByPath(FIND_FLAGS,{filter:(flag)=>{
            return flag.name.indexOf('defend_attack') == 0
        }})
        if (gatherFlag){
            this.goTo(gatherFlag.pos,0)
            return
        }
        if (!Game.rooms[this.memory.belong].memory.enemy[this.name])Game.rooms[this.memory.belong].memory.enemy[this.name] = []
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0)
        {
            /* 领取敌对爬虫 */
            let creeps_ = []
            for (var creep of hostileCreep)
            {
                /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
                if (this.isInDefend(creep)) continue
                else
                {
                    creeps_.push(creep)
                }
            }
            if (creeps_.length > 0)
            {
                let highestAim:Creep = creeps_[0]
                for (var i of creeps_)
                {
                    if (parts(i,'attack') || parts(i,'work'))
                    {
                        highestAim = i
                        break
                    }
                }
                Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
                /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
                let nearHCreep = creep.pos.findInRange(FIND_HOSTILE_CREEPS,1,{filter:(creep)=>{
                    return !isInArray(Memory.whitesheet,creep.name) && !this.isInDefend(creep)
                }})
                if (nearHCreep.length > 0) for (var n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
            }
        }
        else
        {
            let en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
            if (!en) {
                Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0,1)
                return
            }
            let nstC = en
            // 查找是否是小队爬, 发现不是小队爬就删除
            if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1)
            {
                B:
                for (var id of Game.rooms[this.memory.belong].memory.enemy[this.name])
                {
                    let idCreep = Game.getObjectById(id) as Creep
                    if (!idCreep) continue B
                    if (Game.time % 10 == 0)    // 防止敌方爬虫bug
                    if (Math.abs(idCreep.pos.x-en.pos.x) >= 2 || Math.abs(idCreep.pos.y-en.pos.y) >= 2)
                    {
                        let index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
                        Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index,1)
                        continue B
                    }
                    if (getDistance(this.pos,idCreep.pos) < getDistance(this.pos,nstC.pos))
                    nstC = idCreep
                }
            }
            if (nstC)
            {
                // 寻找最近的爬距离最近的rampart,去那里呆着
            var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES,{filter:(stru)=>{
                return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension','link','observer','tower','controller','extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 ||stru.pos.lookFor(LOOK_CREEPS)[0] == this )
                }})
                if (nearstram)
                this.goTo_defend(nearstram.pos,0)
                else this.moveTo(nstC.pos)
            }
        }
        // 仍然没有说明主动防御已经饱和
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0)
        {
            this.say("🔍")
            var closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                return !isInArray(Memory.whitesheet,creep.name)
            }})
            if (closestCreep && !this.pos.inRangeTo(closestCreep.pos,3))
            {
                /* 找离虫子最近的rampart */
                var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES,{filter:(stru)=>{
                    return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension','link','observer','tower','controller','extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 ||stru.pos.lookFor(LOOK_CREEPS)[0] == this )
                }})
                this.goTo_defend(nearstram.pos,0)
            }
        }
        if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
        {
            this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0],Memory.RoomControlData[this.memory.belong].center[1],this.memory.belong))
        }
    }

    // 蓝球防御
    public handle_defend_range():void{
        if (!this.BoostCheck(['move','ranged_attack'])) return
        this.memory.crossLevel = 15
        if (this.hitsMax - this.hits > 200) this.optTower('heal',this)
        /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
        var nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS,3,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.name)
        }})
        if (nearCreep.length > 0)
        {
            var nearstCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS,1,{filter:(creep)=>{
                return !isInArray(Memory.whitesheet,creep.name)
            }})
            if (nearstCreep.length > 0) this.rangedMassAttack()
            else this.rangedAttack(nearCreep[0])
            if (Game.time % 4 == 0)
                this.optTower('attack',nearCreep[0])
        }
        /* 寻路去距离敌对爬虫最近的rampart */
        var hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.name)
        }})
        if (hostileCreep.length > 0)
        {
            for (var c of hostileCreep)
            /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
            if (c.hits/c.hitsMax <= 0.8)
            this.optTower('attack',c)
        }
        // 以gather_attack开头的旗帜  例如： defend_range_0 优先前往该旗帜附近
        let gatherFlag = this.pos.findClosestByPath(FIND_FLAGS,{filter:(flag)=>{
            return flag.name.indexOf('defend_range') == 0
        }})
        if (gatherFlag){
            this.goTo(gatherFlag.pos,0)
            return
        }
        if (!Game.rooms[this.memory.belong].memory.enemy[this.name])Game.rooms[this.memory.belong].memory.enemy[this.name] = []
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0)
        {
            /* 领取敌对爬虫 */
            let creeps_ = []
            for (var creep of hostileCreep)
            {
                /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
                if (this.isInDefend(creep)) continue
                else
                {
                    creeps_.push(creep)
                }
            }
            if (creeps_.length > 0)
            {
                let highestAim:Creep = creeps_[0]
                for (var i of creeps_)
                {
                    if (parts(i,'ranged_attack'))
                    {
                        highestAim = i
                        break
                    }
                }
                Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
                /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
                let nearHCreep = creep.pos.findInRange(FIND_HOSTILE_CREEPS,1,{filter:(creep)=>{
                    return !isInArray(Memory.whitesheet,creep.name) && !this.isInDefend(creep)
                }})
                if (nearHCreep.length > 0) for (var n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
            }
        }
        else
        {
            let en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
            if (!en) {
                Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0,1)
                return
            }
            let nstC = en
            // 查找是否是小队爬, 发现不是小队爬就删除
            if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1)
            {
                B:
                for (var id of Game.rooms[this.memory.belong].memory.enemy[this.name])
                {
                    let idCreep = Game.getObjectById(id) as Creep
                    if (!idCreep) continue B
                    if (Game.time % 10 == 0)
                    if (Math.abs(idCreep.pos.x-en.pos.x) >= 2 || Math.abs(idCreep.pos.y-en.pos.y) >= 2)
                    {
                        let index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
                        Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index,1)
                        continue B
                    }
                    if (getDistance(this.pos,idCreep.pos) < getDistance(this.pos,nstC.pos))
                    nstC = idCreep
                }
            }
            if (nstC)
            {
                // 寻找最近的爬距离最近的rampart,去那里呆着
            var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES,{filter:(stru)=>{
                return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension','link','observer','tower','controller','extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 ||stru.pos.lookFor(LOOK_CREEPS)[0] == this )
                }})
                if (nearstram)
                this.goTo_defend(nearstram.pos,0)
                else this.moveTo(nstC.pos)
            }
        }
        // 仍然没有说明主动防御已经饱和
        if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0)
        {
            this.say("🔍")
            var closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                return !isInArray(Memory.whitesheet,creep.name)
            }})
            if (closestCreep && !this.pos.inRangeTo(closestCreep.pos,3))
            {
                /* 找离虫子最近的rampart */
                var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES,{filter:(stru)=>{
                    return stru.structureType == 'rampart' && stru.pos.GetStructureList(['extension','link','observer','tower','controller','extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 ||stru.pos.lookFor(LOOK_CREEPS)[0] == this )
                }})
                this.goTo_defend(nearstram.pos,0)
            }
        }
        if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
        {
            this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0],Memory.RoomControlData[this.memory.belong].center[1],this.memory.belong))
        }
    }

    // 双人防御
    public handle_defend_double():void{
        if (this.memory.role == 'defend-douAttack')
        {
            if (!this.BoostCheck(['move','attack','tough'])) return
        }
        else
        {
            if (!this.BoostCheck(['move','heal','tough'])) return
        }
        if (!this.memory.double)
        {
            if (this.memory.role == 'double-heal')
            {
                /* 由heal来进行组队 */
                if (Game.time % 7 == 0)
                {
                    var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS,{filter:(creep)=>{
                        return creep.memory.role == 'double-attack' && !creep.memory.double
                    }})
                    if (disCreep)
                    {
                        this.memory.double = disCreep.name
                        disCreep.memory.double = this.name
                        this.memory.captain = false
                        disCreep.memory.captain = true
                    }
                }
            }
            return
        }
        if (this.memory.role == 'defend-douAttack')
        {
            if (this.hitsMax - this.hits > 1200) this.optTower('heal',this)
            if (!Game.creeps[this.memory.double]) return
            if (this.fatigue || Game.creeps[this.memory.double].fatigue) return
            if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0,49],this.pos.x) && !isInArray([0,49],this.pos.y)))
            return
        /* 去目标房间 */
        if (this.room.name != this.memory.belong)
        {
            this.goTo(new RoomPosition(24,24,this.memory.belong),23)
        }
        else
        {
            let flag = this.pos.findClosestByPath(FIND_FLAGS,{filter:(flag)=>{
                return flag.name.indexOf('defend_double') == 0
            }})
            if (flag)
            {
                let creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS,1,{filter:(creep)=>{
                    return !isInArray(Memory.whitesheet,creep.owner.username )
                }})
                if (creeps[0])this.attack(creeps[0])
                this.goTo(flag.pos,0)
                return
            }
            let creeps = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                return !isInArray(Memory.whitesheet,creep.owner.username )
            }})
            if (creeps && !isInArray([0,49],creeps.pos.x) && !isInArray([0,49],creeps.pos.y))
            {
                if (this.attack(creeps) == ERR_NOT_IN_RANGE) this.goTo(creeps.pos,1)
            }
            if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
            {
                this.moveTo(new RoomPosition(Memory.RoomControlData[this.memory.belong].center[0],Memory.RoomControlData[this.memory.belong].center[1],this.memory.belong))
            }
        }
        }
        else
        {
            if (this.hitsMax - this.hits > 600) this.optTower('heal',this)
            this.moveTo(Game.creeps[this.memory.double])
            if(Game.creeps[this.memory.double])this.heal(Game.creeps[this.memory.double])
            else this.heal(this)
            if (!Game.creeps[this.memory.double]){this.suicide();return}
            else
            {
                if (this.pos.isNearTo(Game.creeps[this.memory.double]))
                {
                    var caption_hp = Game.creeps[this.memory.double].hits
                    var this_hp = this.hits
                    if (this_hp == this.hitsMax && caption_hp == Game.creeps[this.memory.double].hitsMax) this.heal(Game.creeps[this.memory.double])
                    if (caption_hp < this_hp)
                    {
                        this.heal(Game.creeps[this.memory.double])
                    }
                    else
                    {
                        this.heal(this)
                    }
                    let otherCreeps = this.pos.findInRange(FIND_MY_CREEPS,3,{filter:(creep)=>{return creep.hits < creep.hitsMax - 300}})
                    if (otherCreeps[0] && this.hits == this.hitsMax && Game.creeps[this.memory.double].hits == Game.creeps[this.memory.double].hitsMax)
                    {
                        if (otherCreeps[0].pos.isNearTo(this))
                        this.heal(otherCreeps[0])
                        else this.rangedHeal(otherCreeps[0])
                    }
                }
                else
                {
                    this.heal(this)
                    this.moveTo(Game.creeps[this.memory.double])
                }
            }
        }
    }
    
    public handle_task_squard():void{
        var misson = this.memory.MissionData.Data
        var shard = misson.shard
        var roomName = misson.disRoom
        var squadID = misson.squadID
        if (this.memory.controlledBySquardFrame)
        {
            /* 说明到达指定房间，并到达合适位置了 */
            /* 添加战争框架控制信息 */
            if (!Memory.squadMemory) Memory.squadMemory = {}
            if (!squadID) {this.say("找不到squardID!");return}
            if (!Memory.squadMemory[squadID])
            {
                Memory.squadMemory[squadID] = {
                    creepData:this.memory.squad,
                    sourceRoom:this.memory.belong,
                    presentRoom:this.room.name,
                    disRoom:misson.disRoom,
                    ready:false,
                    array:'free',
                    sourceShard:this.memory.shard,
                    disShard:this.memory.targetShard,
                    squardType:misson.flag
                }
            }
            /* 赋予全局Memory记忆后，即可交由全局四人小队框架控制 */
            return
        }
        else
        {
            /* 任务开始前准备 */
            if (this.room.name == this.memory.belong && this.memory.shard == Game.shard.name)
            {
                var thisRoom = Game.rooms[this.memory.belong]
                /* boost检查 */
                if(this.getActiveBodyparts('move')>0)
                {
                    if (!this.BoostCheck([,'move'])) return
                }
                if(this.getActiveBodyparts('heal')>0)
                {
                    if (!this.BoostCheck([,'heal'])) return
                }
                if(this.getActiveBodyparts('work')>0)
                {
                    if (!this.BoostCheck([,'work'])) return
                }
                if(this.getActiveBodyparts('attack')>0)
                {
                    if (!this.BoostCheck([,'attack'])) return
                }
                if(this.getActiveBodyparts('ranged_attack')>0)
                {
                    if (!this.BoostCheck([,'ranged_attack'])) return
                }
                if(this.getActiveBodyparts('tough')>0)
                {
                    if (!this.BoostCheck([,'tough'])) return
                }
                /* 组队检查 */
                if(!squadID) return
                if (!this.memory.MissionData.id) return
                if (!thisRoom.memory.squadData) Game.rooms[this.memory.belong].memory.squadData = {}
                var MissonSquardData = thisRoom.memory.squadData[squadID]
                if (!MissonSquardData) thisRoom.memory.squadData[squadID] = {}
                if (!MissonSquardData) return
                if (this.memory.creepType == 'heal')
                {
                    if (this.memory.role == 'x-aio')
                    {
                        if (Object.keys(MissonSquardData).length <= 0 ) MissonSquardData[this.name] = {position:'↙',index:1,role:this.memory.role,creepType:this.memory.creepType}
                        if (Object.keys(MissonSquardData).length == 1 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↖',index:0,role:this.memory.role,creepType:this.memory.creepType}
                        if (Object.keys(MissonSquardData).length == 2 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↘',index:3,role:this.memory.role,creepType:this.memory.creepType}
                        if (Object.keys(MissonSquardData).length == 3 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↗',index:2,role:this.memory.role,creepType:this.memory.creepType}
                    }
                    else
                    {
                        if (Object.keys(MissonSquardData).length <= 0 ) MissonSquardData[this.name] = {position:'↙',index:1,role:this.memory.role,creepType:this.memory.creepType}
                        if (Object.keys(MissonSquardData).length == 2 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↘',index:3,role:this.memory.role,creepType:this.memory.creepType}
                    }
                    
                }
                else if (this.memory.creepType == 'attack')
                {
                    if (Object.keys(MissonSquardData).length == 1 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↖',index:0,role:this.memory.role,creepType:this.memory.creepType}
                    if (Object.keys(MissonSquardData).length == 3 && !isInArray(Object.keys(MissonSquardData),this.name) ) MissonSquardData[this.name] = {position:'↗',index:2,role:this.memory.role,creepType:this.memory.creepType}
                }
                if (Object.keys(thisRoom.memory.squadData[squadID]).length == 4 && !this.memory.squad)
                {
                    console.log(this.name, '添加squard记忆')
                    this.memory.squad = thisRoom.memory.squadData[squadID]
                    return
                }
                /* 朝前面的爬移动 */
                if (!this.memory.squad) return
                 /* 检查是否所有爬虫都赋予记忆了 */
                for (var mem in this.memory.squad)
                {
                    if (!Game.creeps[mem]) return
                    if (!Game.creeps[mem].memory.squad)return
                }
            }
            /* 到达任务房间前自卫 */
            if (this.getActiveBodyparts('ranged_attack'))
            {
                var enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS,3,{filter:(creep)=>{
                    return !isInArray(Memory.whitesheet,creep.owner.username)
                }})
                if (enemy[0])
                this.rangedAttack(enemy[0])
            }
            if (this.getActiveBodyparts('heal'))
            {
                var bol = true
                for (var i in this.memory.squad)
                {
                    if(Game.creeps[i] && Game.creeps[i].hits < Game.creeps[i].hitsMax && this.pos.isNearTo(Game.creeps[i]))
                    {
                        bol =false
                        this.heal(Game.creeps[i])
                    }
                }
                if(bol) this.heal(this)
            }
            /* 线性队列行走规则设定 */
            for (var cc in this.memory.squad)
            {
                if (Game.creeps[cc] && Game.creeps[cc].fatigue) return
            }
            if (this.memory.squad[this.name].index != 3 && (!isInArray([0,49],this.pos.x) && !isInArray([0,49],this.pos.y)))
            {
                var followCreepName = findNextData(this)
                if (followCreepName == null) return
                var portal = this.pos.findClosestByRange(FIND_STRUCTURES,{filter:(stru)=>{
                    return stru.structureType == 'portal'
                }})
                var followCreep = Game.creeps[followCreepName]
                if (!followCreep && portal) {return}
                if (followCreep)
                {
                // 跟随爬不靠在一起就等一等
                if (!this.pos.isNearTo(followCreep)) return
                }
                
            }
            if (this.memory.squad[this.name].index != 0)
            {
                var disCreepName = findFollowData(this)
                var portal = this.pos.findClosestByRange(FIND_STRUCTURES,{filter:(stru)=>{
                    return stru.structureType == 'portal'
                }})
                if (disCreepName == null || (!Game.creeps[disCreepName] && !portal)) return
                if (!Game.creeps[disCreepName] && portal){this.arriveTo(new RoomPosition(25,25,roomName),20,shard);return}
                if (Game.shard.name == shard && !Game.creeps[disCreepName]) return
                var disCreep = Game.creeps[disCreepName]
                if (this.room.name == this.memory.belong)  this.goTo(disCreep.pos,0)
                else this.moveTo(disCreep,{ignoreCreeps:true})
            }
            /* 判断在不在目标房间入口房间 */
            if (identifyNext(this.room.name,roomName) == false)
            {
                if (this.memory.squad[this.name].index == 0)
                this.arriveTo(new RoomPosition(25,25,roomName),20,shard)
            }
            else
            {
                if (this.memory.squad[this.name].index == 0)
                {
                    this.say('🔪',true)
                    if (!this.memory.arrived)
                    {
                        var blueFlag = this.pos.findClosestByRange(FIND_FLAGS,{filter:(flag)=>{
                            return flag.color == COLOR_BLUE
                        }})
                        if (blueFlag)
                        this.arriveTo(blueFlag.pos,5,shard)
                        else
                        this.arriveTo(new RoomPosition(25,25,this.room.name),10,shard)
                        /* 寻找周围有没有空地 */
                        if (identifyGarrison(this) && shard == Game.shard.name)
                        {
                            this.memory.arrived = true
                            return
                        }
                    }
                    else
                    {
                        // 到达了的逻辑
                        for (var crp in this.memory.squad)
                        {
                            if (Game.creeps[crp])
                                Game.creeps[crp].memory.controlledBySquardFrame = true
                        }
                    }
                }
            }
        }
    }
}