import { isInArray } from "@/utils"
import { allResource, roomResource } from "../control/local/resource"
import { getStore } from "../control/local/store"
import room from "@/mount/room"


/* 与资源相关的 */
export default {
    resource:{
        all():string{
            allResource()
            return `[resource] 全局资源统计完毕!`
        },
        room(roomName:string):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[resource] 不存在房间${roomName}`
            roomResource(roomName)
            return `[resource] 房间${roomName}资源统计完毕!`
        },
    },
    store:{
        all():string{
            getStore()
            return `[store] 全局容量信息统计完毕!`
        },
        room(roomName:string):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[store] 不存在房间${roomName}`
            getStore(roomName)
            return `[store] 房间${roomName}容量信息统计完毕!`
        }
    },
    /* 任务输出调试屏蔽 */
    MissionVisual:{
        add(name:string):string{
            if (!isInArray(Memory.ignoreMissonName,name))
                Memory.ignoreMissonName.push(name)
            return `[ignore] 已经将任务${name}添加进输出调试的忽略名单里!`
        },
        remove(name:string):string{
            if (isInArray(Memory.ignoreMissonName,name))
                {
                    var index = Memory.ignoreMissonName.indexOf(name)
                    Memory.ignoreMissonName.splice(index,1)
                    return `[ignore] 已经将任务${name}删除出输出调试的忽略名单里!`
                }
            return `[ignore] 删除 ${name} 出调试输出忽略名单失败!`
            
        },
    },

     /* 房间可视化 */
     panel:{
        switch(roomName:string):string{
            if (!Game.rooms[roomName]) return `[RoomVisual] 房间${roomName}无视野`
            if (!Game.rooms[roomName].controller || !Game.rooms[roomName].controller.my) return `[RoomVisual] 房间${roomName}非受控房间`
            if (Game.rooms[roomName].memory.banVisual) delete Game.rooms[roomName].memory.banVisual
            else Game.rooms[roomName].memory.banVisual = true
            return `[RoomVisual] 房间${roomName}的可视化设置为${Game.rooms[roomName].memory.banVisual?'false':'true'}`
        },
        level(lev:'low'|'medium'|'high'|'blank'):string{
            if (!isInArray(['low','medium','high','blank'],lev)) return `[RoomVisual] 非法参数`
            Memory.VisualLevel = lev
            return `[RoomVisual] 可视化画质设置为${lev}`
        },
    }
}