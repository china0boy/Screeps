import { Colorful, isInArray } from "@/utils"

export default {
    frame:
    {
        set(roomName:string,plan:'man'|'hoho'|'dev',x:number,y:number):string
        {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[frame] 不存在房间${roomName}`
            Memory.RoomControlData[roomName] = {arrange:plan,center:[x,y]}
            return `[frame] 房间${roomName}加入房间控制列表，布局${plan}，中心点[${x},${y}]`
        },
        remove(roomName):string
        {
            delete Memory.RoomControlData[roomName]
            return `[frame] 删除房间${roomName}出房间控制列表`
        },
        del(roomName:string,x:number,y:number,mold:BuildableStructureConstant):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[frame] 未找到房间${roomName},请确认房间!`
            var thisPosition:RoomPosition = new RoomPosition(x,y,roomName)
            if (thisPosition.GetStructure(mold))
                {myRoom.unbindMemory(mold,x,y);return `[frame] 房间${roomName}已经执行delStructure命令!`}
            else
            {
                let cons = thisPosition.lookFor(LOOK_CONSTRUCTION_SITES)
                if (cons.length > 0 && cons[0].structureType == mold)
                {
                    myRoom.unbindMemory(mold,x,y);return `[frame] 房间${roomName}已经执行delStructure命令!`
                }
            }
            return `[frame] 房间${roomName}未找到相应建筑!`
        },
    },
    spawn:
    {
        num(roomName:string,role:string,num:number):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[spawn] 不存在房间${roomName}`
            let roleConfig = thisRoom.memory.SpawnConfig[role]
            if (roleConfig)
            {
                roleConfig.num = num
                return `[spawn] 房间${roomName}的${role}数量信息修改为${num}`
            }
            return `[spawn] 房间${roomName}的${role}数量信息修改失败`
        },
        // 修改某任务爬虫绑定数据的num
        Mnum(roomName:string,id:string,role:string,num:number):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[spawn] 不存在房间${roomName}`
            let misson = thisRoom.GainMission(id)
            if (misson && misson.CreepBind[role])
            {
                misson.CreepBind[role].num = num
                return `[spawn] 任务${id}的${role}数量信息修改为${num}`
            }
            return `[spawn] 任务${id}的${role}数量信息修改失败`
        },
    },
    link:{
        comsume(roomName:string,id:string):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[link] 不存在房间${roomName}`
            if (isInArray(thisRoom.memory.StructureIdData.source_links,id)) return `[link] id错误，不能为source_link`
            if (id == thisRoom.memory.StructureIdData.center_link || id == thisRoom.memory.StructureIdData.upgrade_link) return `[link] id错误，不能为center_link/upgrade_link`
            if (!isInArray(thisRoom.memory.StructureIdData.comsume_link,id))thisRoom.memory.StructureIdData.comsume_link.push(id)
            return Colorful(`[link] 房间${roomName} id为${id}的link已加入comsume_link列表中`,'green',true)
        }
    },
}