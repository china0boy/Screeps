/* 四人小队框架控制 */

import { generateID, isInArray } from "@/utils"
import { squadMove, squadNear } from "./move/move"
import { initSquad, Squadaction, SquadAttackOrient, SquadColorFlagRange, SquadNameFlagPath, SquadSteady } from "./work/action"
import { getStandCreep, getStandPos, SquadArrivedRoom, SquadAttackDirection, SquadPosDirection, SquadReady } from "./work/state"

// 主程序执行
export function SquadManager():void{
    if (!Memory.squadMemory) Memory.squadMemory = {}
    for (var squadID in Memory.squadMemory)
    {
        /* 先检查该任务的爬是否已经死光，如果死光了就清除数据 */
        let del = true
        for (var creepName in Memory.squadMemory[squadID].creepData)
        {
            if (Game.creeps[creepName]) del = false
        }
        if (del)
        {
            delete Memory.squadMemory[squadID]
            continue
        }
        /* 删除无用数据 */
        if (Game.time % 50 == 0)
        {
            for (var i in Memory.RoomControlData)
            {
                if (Game.rooms[i] && Game.rooms[i].controller.level >= 8)
                {
                    if (Game.rooms[i].MissionNum('Creep','四人小队') <= 0)
                    {
                        Game.rooms[i].memory.squadData = {}
                    }
                }
            }
        }
        /* 运行框架 */
        squardFrameWork(squadID)
    }
}
// 小队通用执行框架
export function squardFrameWork(squardID:string):void{
    var Data = Memory.squadMemory[squardID]
    if (!Data) return
    /* 小队Memory中的爬虫数据 */
    var squadData = Data.creepData
    /* 如果小队没有组队或者脱离组队，要进行的操作 */
    if (!Data.ready)
    {
        if (!SquadReady(squadData))
        {
            SquadSteady(squadData)
        }
        else
        {
            Data.ready = true
        }
        return
    }
    /* 如果小队因为某些原因脱离了组队，需要赶紧组队 */
    if (!SquadReady(squadData))
    {
        SquadSteady(squadData)
        Data.ready = false
        return
    }

    /* 如果小队还没有到目标房间 */
    if (!SquadArrivedRoom(squadData,Data.disRoom))
    {
        /* 如果有蓝色旗帜，优先去蓝色旗帜那里集结  [集结] */
        var blueFlag = SquadColorFlagRange(squadData,COLOR_BLUE)
        if (!Data.gather && blueFlag)
        {
            squadMove(squadData,blueFlag.pos,0)
            if(squadNear(squadData,blueFlag.pos))
            {
                Data.gather = true
            }
            return
        }
        /* 优先调整坐标 */
        if (!Data.init)
        {
            Data.init = true
            initSquad(Data.presentRoom,Data.disRoom,squadData)
            return
        }
        squadMove(squadData,new RoomPosition(25,25,Data.disRoom),10)
        return
    }
        /* 小队行为 攻击周围的敌人和建筑*/
        Squadaction(squadData)
        let attack_flag = SquadNameFlagPath(squadData,'squad_attack')
        if (attack_flag)
        {
            if (attack_flag.pos.lookFor(LOOK_STRUCTURES).length <=0) attack_flag.remove()
            else
            {
                var Attackdirection = SquadAttackDirection(Data.creepData)
                if (SquadPosDirection(squadData,attack_flag.pos) != null && Attackdirection != SquadPosDirection(squadData,attack_flag.pos))
                {
                    SquadAttackOrient(Attackdirection,SquadPosDirection(squadData,attack_flag.pos),squadData)
                    return
                }
                if (!squadNear(squadData,attack_flag.pos)  ){
                    squadMove(squadData,attack_flag.pos,1)
                }
            }
        }
        else
        {
            let standCreep = getStandCreep(squadData)
            if (!standCreep) return
            var clostStructure = standCreep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter:(struc)=>{
                return !isInArray([STRUCTURE_CONTROLLER,STRUCTURE_STORAGE],struc.structureType)
            }})
            if (clostStructure)
            {
                clostStructure.pos.createFlag(`squad_attack_${generateID()}`,COLOR_WHITE)
                return
            }
            else
            {return}
        }
        if (!attack_flag) return
    /* retreat_xx 是紧急撤退标志 */
    var retreatFlag = SquadNameFlagPath(squadData,'retreat')
    if (retreatFlag)
    {
        squadMove(squadData,blueFlag.pos,0)
        if(squadNear(squadData,blueFlag.pos))
        {
            retreatFlag.remove()
        }
        return
    }

}