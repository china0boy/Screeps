import { deserveDefend } from "@/module/fun/funtion";
import { Colorful, isInArray } from "@/utils"

/* 房间原型拓展   --任务  --防御战争 */
export default class DefendWarExtension extends Room {
    /* 主动防御任务发布 */
    public Task_Auto_Defend():void{
        if (Game.time % 5) return
        if (this.controller.level < 6) return
        if (!this.memory.state) return
        if (this.memory.state != 'war') {this.memory.switch.AutoDefend = false;this.memory.enemy = {};return}
        /* 激活主动防御 */
        var enemys = this.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.owner.username) && (creep.owner.username != 'Invader') && deserveDefend(creep)
        }})
        if (enemys.length <= 0) return
        /* 如果有合成任务，删除合成任务 */
        let compoundTask = this.MissionName('Room','资源合成')
        if (compoundTask)
        {
            this.DeleteMission(compoundTask.id)
            return
        }
        if (!this.memory.switch.AutoDefend)
        {
            this.memory.switch.AutoDefend = true        // 表示房间存在主动防御任务
            /* 寻找攻击方 */
            let users = []
            for (let c of enemys ) if (!isInArray(users,c.owner.username)) users.push(c.owner.username)
            let str = '';for(let s of users) str += ` ${s}`
            Game.notify(`房间${this.name}激活主动防御! 目前检测到的攻击方为:${str},爬虫数为:${enemys.length},我们将抗战到底!`)
            console.log(`房间${this.name}激活主动防御! 目前检测到的攻击方为:${str},爬虫数为:${enemys.length},我们将抗战到底!`)
        }
        /* 分析敌对爬虫的数量,应用不同的主防任务应对 */
        let defend_plan = {}
        if (enemys.length == 1)     // 1
        {
            defend_plan = {'attack':1}
        }
        else if (enemys.length == 2)    // 2
        {
            defend_plan = {'attack':1,'range':1}
        }
        else if (enemys.length  > 2 && enemys.length < 5)       // 3-4
        {
            defend_plan = {'attack':1,'double':1,'range':0}
        }
        else if (enemys.length >= 5 && enemys.length < 8)   // 5-7
        {
            defend_plan = {'attack':1,'double':1,'range':1}
        }
        else if (enemys.length >= 8)        // >8     一般这种情况下各个类型的防御任务爬虫的数量都要调高
        {
            defend_plan = {'attack':2,'double':2}
        }
        for (var plan in defend_plan)
        {
            if (plan == 'attack')
            {
                let num = this.MissionNum('Creep','红球防御')
                if (num <= 0)
                {
                    let thisTask = this.public_red_defend(defend_plan[plan])
                    if (thisTask) {
                        this.AddMission(thisTask)
                        console.log(`房间${this.name}红球防御任务激活!`)
                    }
                }
                else
                {
                    /* 已经存在的话查看数量是否正确 */
                    let task = this.MissionName('Creep','红球防御')
                    if (task)
                    {
                        task.CreepBind['defend-attack'].num = defend_plan[plan]
                        // console.log(Colorful(`房间${this.name}红球防御任务数量调整为${defend_plan[plan]}!`,'red'))
                    }
                }
            }
            else if (plan == 'range')
            {
                let num = this.MissionNum('Creep','蓝球防御')
                if (num <= 0)
                {
                    let thisTask = this.public_blue_defend(defend_plan[plan])
                    if (thisTask) {
                        this.AddMission(thisTask)
                        console.log(`房间${this.name}蓝球防御任务激活!`)
                    }
                }
                else
                {
                    /* 已经存在的话查看数量是否正确 */
                    let task = this.MissionName('Creep','蓝球防御')
                    if (task)
                    {
                        task.CreepBind['defend-range'].num = defend_plan[plan]
                        // console.log(Colorful(`房间${this.name}蓝球防御任务数量调整为${defend_plan[plan]}!`,'blue'))
                    }
                }
            }
            else if (plan == 'double')
            {
                let num = this.MissionNum('Creep','双人防御')
                if (num <= 0)
                {
                    let thisTask = this.public_double_defend(defend_plan[plan])
                    if (thisTask) {
                        this.AddMission(thisTask)
                        console.log(`房间${this.name}双人防御任务激活!`)
                    }
                }
                else
                {
                    /* 已经存在的话查看数量是否正确 */
                    let task = this.MissionName('Creep','双人防御')
                    if (task)
                    {
                        task.CreepBind['defend-douAttack'].num = defend_plan[plan]
                        task.CreepBind['defend-douHeal'].num = defend_plan[plan]
                        // console.log(Colorful(`房间${this.name}双人防御任务数量调整为${defend_plan[plan]}!`,'green'))
                    }
                }
            }
        }
        
        /* 主动防御分配系统更新 删除过期敌对爬虫数据 */
        for (let myCreepName in this.memory.enemy)
        {
            if (!Game.creeps[myCreepName]) delete this.memory.enemy[myCreepName]
            else
            {
                /* 查找项目里的爬虫是否已经死亡 */
                for (let enemyID of this.memory.enemy[myCreepName])
                {
                    if (!Game.getObjectById(enemyID))
                    {
                        let index = this.memory.enemy[myCreepName].indexOf(enemyID)
                        this.memory.enemy[myCreepName].splice(index,1)
                    }
                }
            }
        }

    }

    /* 红球防御 */
    public Task_Red_Defend(mission:MissionModel):void{
        if ((Game.time - global.Gtime[this.name]) % 10) return
        if(!this.Check_Lab(mission,'transport','complex')) return
        if ((Game.time - global.Gtime[this.name]) % 20) return
        var enemys = this.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.owner.username) && (creep.owner.username != 'Invader' && deserveDefend(creep))
        }})
        if (enemys.length <= 0)
        {
            this.DeleteMission(mission.id)
        }
    }

    /* 蓝球防御 */
    public Task_Blue_Defend(mission:MissionModel):void{
        if ((Game.time - global.Gtime[this.name]) % 10) return
        if(!this.Check_Lab(mission,'transport','complex')) return
        if ((Game.time - global.Gtime[this.name]) % 20) return
        var enemys = this.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.owner.username) && (creep.owner.username != 'Invader' && deserveDefend(creep))
        }})
        if (enemys.length <= 0)
        {
            this.DeleteMission(mission.id)
        }
    }

    /* 双人防御 */
    public Task_Double_Defend(mission:MissionModel):void{
        if ((Game.time - global.Gtime[this.name]) % 10) return
        if(!this.Check_Lab(mission,'transport','complex')) return
        if ((Game.time - global.Gtime[this.name]) % 20) return
        var enemys = this.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.owner.username) && (creep.owner.username != 'Invader' && deserveDefend(creep))
        }})
        if (enemys.length <= 0)
        {
            this.DeleteMission(mission.id)
        }
    }
}