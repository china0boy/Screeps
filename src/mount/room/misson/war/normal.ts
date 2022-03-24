import { GenerateAbility, bodyFree, generateID } from "@/utils"

/* 房间原型拓展   --任务  --常规战争 */
export default class NormalWarExtension extends Room {
    // 拆迁黄球
    public Task_dismantle(mission: MissionModel): void {
        if (mission.Data.boost) {
            // 体型
            global.SpecialBodyData[this.name]['dismantle'] = GenerateAbility(40, 0, 10, 0, 0, 0, 0, 0)
            // boost lab填充检查
            if (!this.Check_Lab(mission, 'transport', 'complex')) return
        }
        /* 数量投放 */
        if (mission.CreepBind['dismantle'].num == 0)
            mission.CreepBind['dismantle'].num = mission.Data.num
    }

    /**
     * 一体机
     * bodyFree({'tough':11,'ranged_attack':6,'heal':23,'move':10})  6塔满伤+额外能抗24伤害 3600伤害
     * bodyFree({'tough':8,'ranged_attack':17,'heal':15,'move':10})  4塔满伤 2400伤害
     * 
     */
    public Task_AIO(mission: MissionModel): void {
        // 体型
        let body: BodyPartConstant[]
        if (mission.Data.level == 1) {
            body = bodyFree({ 'tough': 8, 'ranged_attack': 17, 'move': 6, 'heal': 15 })
            body.push.apply(body, bodyFree({ 'move': 4 }))
        }
        if (mission.Data.level == 2) {
            body = bodyFree({ 'tough': 11, 'ranged_attack': 6, 'move': 4, 'heal': 23 })
            body.push.apply(body, bodyFree({ 'move': 6 }))
        }
        if (mission.Data.level == 10) {
            body = bodyFree({ 'tough': 1, 'ranged_attack': 1, 'move': 1, 'heal': 1 })
        }
        global.SpecialBodyData[this.name]['AIO'] = body
        // boost lab填充检查
        if (!this.Check_Lab(mission, 'transport', 'complex')) return
        /* 数量投放 */
        if (mission.CreepBind['AIO'].num == 0)
            mission.CreepBind['AIO'].num = mission.Data.num
    }
    
    // 四人小队
    public Task_squad(mission:MissionModel):void{
        if ((Game.time - global.Gtime[this.name])% 7) return
        if (!mission.Data.squadID)
        {
            if (!Memory.squadMemory) Memory.squadMemory = {}
            for (var i = 1;i<100;i++)
            {
                if (!Memory.squadMemory[`${mission.Data.flag}${i}|${Game.shard.name}`])
                {
                    mission.Data.squadID = `${mission.Data.flag}${i}|${Game.shard.name}`
                    break
                }
            }
        }
        else
        {
            if (Memory.squadMemory[mission.Data.squadID] && Object.keys(Memory.squadMemory[mission.Data.squadID].creepData).length >= 4)
            {
                delete mission.Data.squadID
            }
        }
        if (!this.Check_Lab(mission,'transport','complex')) return
    }
}

