import { isInArray, unzipPosition, zipPosition } from "@/utils";

/* 房间原型拓展   --行为  --防御任务 */
export default class RoomMissonDefendExtension extends Room {

    // 核弹防御
    public Nuke_Defend():void{
        if (this.memory.nukeData && this.memory.nukeData.damage && Object.keys(this.memory.nukeData.damage).length > 0)
        for (var i in this.memory.nukeData.damage)
        {
            var thisPos = unzipPosition(i)
            new RoomVisual(this.name).text(`${this.memory.nukeData.damage[i]/1000000}M`, thisPos.x, thisPos.y, {color: this.memory.nukeData.damage[i]== 0?'green':'red', font: 0.5}); 
    
        }
        if (Game.time % 41) return
        var nuke_ = this.find(FIND_NUKES)
        if (this.controller.level < 6) return
        // var nuke_ = this.find(FIND_FLAGS,{filter:(flag_)=>{return flag_.color == COLOR_ORANGE}})
        if (!this.memory.nukeID) this.memory.nukeID = []
        if (!this.memory.nukeData)this.memory.nukeData = {damage:{},rampart:{}}
        if (nuke_.length > 0)
        {
            /* 发现核弹，激活核防御任务 */
            var data = this.memory.nukeData.damage
            var rampart = this.memory.nukeData.rampart
            for (var n of nuke_)
            {
                    if (isInArray(this.memory.nukeID,n.id)) continue
                    var strPos = zipPosition(n.pos)
                    if (n.pos.GetStructureList(['spawn','rampart','terminal','powerSpawn','factory','nuker','lab','tower','storage']).length >0)
                    {
                        if (!data[strPos]) data[strPos] = 10000000
                        else data[strPos] += 10000000
                        if (!rampart[strPos])
                        {
                            var rampart_ = n.pos.GetStructure('rampart')
                            if (rampart_) rampart[strPos] = rampart_.hits
                            else rampart[strPos] = 0
                        }
                    }
                    LoopA:
                    for (var nX = n.pos.x-2;nX<n.pos.x+3;nX++)
                    LoopB:
                    for(var nY=n.pos.y-2;nY<n.pos.y+3;nY++)
                    {
                        var thisPos = new RoomPosition(nX,nY,this.name)
                        if (nX == n.pos.x && nY == n.pos.y) continue LoopB
                        if (thisPos.GetStructureList(['spawn','rampart','terminal','powerSpawn','factory','nuker','lab','tower']).length <= 0) continue LoopB
                        if (nX > 0 && nY > 0 && nX < 49 && nY< 49)
                        {
                            var strThisPos = zipPosition(thisPos)
                            if (!data[strThisPos]) data[strThisPos] = 5000000
                            else data[strThisPos] += 5000000
                            if (!rampart[strThisPos])
                            {
                                var rampart_ = n.pos.GetStructure('rampart')
                                if (rampart_) rampart[strThisPos] = rampart_.hits
                                else rampart[strThisPos] = 0
                            }
                        }
                    }
                    this.memory.nukeID.push (n.id)
            }
            let allDamageNum = 0
            for (var i in data)
                {
                    /*  */
                    var thisPos = unzipPosition(i)
                    if (data[i] == 0)
                    {
                        var rampart__ = thisPos.GetStructure('rampart')
                        if (rampart__)
                        {
                            rampart[i] = rampart__.hits
                        }

                    }
                    allDamageNum += data[i]
            }
            /* 计算总核弹需要维修的伤害确定 */
            var boostType:ResourceConstant = null
            if (allDamageNum >= 50000000) boostType = 'XLH2O'
            var num:number = 1
            if (allDamageNum >= 10000000 && allDamageNum < 20000000) num = 2
            else if (allDamageNum >= 20000000 && allDamageNum < 40000000) num = 3
            else if (allDamageNum >= 40000000) num = 3
            var task:MissionModel
            for (var t of this.memory.Misson['Creep'])
            {
                if (t.name == '墙体维护' && t.Data.RepairType == 'nuker')
                task = t
            }
            if (task)
            {
                task.Data.num = num
                if (task.CreepBind['repair'].num != num)
                task.CreepBind['repair'].num = num
                if (task.Data.boostType == undefined &&  boostType == 'XLH2O')
                {
                    /* 删除现有任务，重新挂载有boost的任务 */
                    this.DeleteMission(task.id)
                }
                
            }
            /* 激活维修防核任务 */
            else
            {
                var thisTask:MissionModel = this.public_repair('nuker',num,boostType,false)
                if (thisTask && allDamageNum > 0)
                this.AddMission(thisTask)
            }

            /* 去除废除的维护坐标 例如核弹已经砸过了，但是还没有修完 */
            if (Game.time % 9 == 0)
            LoopP:
            for (var po in this.memory.nukeData.damage)
            {
                var thisPos = unzipPosition(po)
                for (var nuk of nuke_)
                {
                    if (thisPos.inRangeTo(nuk,2))
                    continue LoopP
                }
                if (this.memory.nukeData.rampart[po]) delete this.memory.nukeData.rampart[po]
                delete this.memory.nukeData.damage[po]
            }

            
        }
        else
        {
            for (var m of this.memory.Misson['Creep'])
            {
                if (m.name == '墙体维护' && m.Data.RepairType == 'nuker')
                {
                    this.DeleteMission(m.id)
                }
            }
            if (this.memory.nukeID.length > 0) this.memory.nukeID = []
            this.memory.nukeData = {damage:{},rampart:{}}
        }
    }
    
    // 主动防御
    public Active_Defend():void{
        if (Game.time % 7) return
        if (!this.memory.state) return
        if (this.memory.state != 'war') return
        if (!Memory.RoomControlData[this.name] || !Memory.RoomControlData[this.name].defend) return
        let enemys = this.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
            return !isInArray(Memory.whitesheet,creep.owner.username) && (creep.owner.username != 'Invader')
        }})
        if (enemys.length <= 0) return
        else
        {
            /* 爬虫满足被boost了的条件 */

            /* 只有1~3个爬虫 */

            /* 爬虫数量超过3个 */

        }
    }
}