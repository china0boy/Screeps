import { Colorful, isInArray, unzipPosition, zipPosition } from "@/utils"
export default class RoomMissonMineExtension extends Room {
    /* 房间外矿处理任务 只适用于一般外矿 */
    public Task_OutMine(misson: MissionModel): void {
        if ((Game.time - global.Gtime[this.name]) % 13) return
        if (!misson.Data.state) misson.Data.state = 1   // 默认状态1
        misson.CreepBind['out-claim'].num = 1
        let disRoomName = misson.Data.disRoom
        if (!Memory.outMineData[disRoomName]) Memory.outMineData[disRoomName] = { road: [], startpoint: misson.Data.startpoint, minepoint: [], mineType: 'normal' }
        // 相关爬虫死亡后的数据擦除
        if (Memory.outMineData[disRoomName].minepoint && Memory.outMineData[disRoomName].minepoint.length > 0) {
            for (var obj of Memory.outMineData[disRoomName].minepoint) {
                if (obj.bind && obj.bind.harvest && !Game.creeps[obj.bind.harvest]) delete obj.bind.harvest
                if (obj.bind && obj.bind.car && !Game.creeps[obj.bind.car]) delete obj.bind.car
            }
        }
        if (misson.Data.state == 1) // 初始化状态
        {
            /* 状态1下仅仅获取外矿信息和派出claimer */
            if (Game.rooms[disRoomName]) {
                var sources = Game.rooms[disRoomName].find(FIND_SOURCES)
                if (sources.length <= 0) {
                    Game.notify(`房间${disRoomName}未发现能量点！删除外矿任务！`)
                    this.DeleteMission(misson.id)
                    return
                }
                /* 说明有该房间的视野了 先查找矿点 */
                if (Memory.outMineData[disRoomName].minepoint.length < sources.length) {
                    LoopS:
                    for (var s of sources) {
                        for (var m of Memory.outMineData[disRoomName].minepoint) {
                            if (m.pos == zipPosition(s.pos))
                                continue LoopS
                        }
                        Memory.outMineData[disRoomName].minepoint.push({ pos: zipPosition(s.pos), bind: {} })
                    }
                    return
                }
                /* 矿点信息更新完毕了 接下来更新路线信息 */
                if (!misson.Data.roadUpdated) {
                    var startpos = unzipPosition(Memory.outMineData[disRoomName].startpoint)
                    if (!startpos) { console.log(`${startpos}不能解压成RoomPosition对象`); return }
                    /* 每个矿点都要有一个路线信息 */
                    for (var s of sources) {
                        var results = startpos.FindPath(s.pos, 1)
                        LoopB:
                        for (var p of results) {
                            if (p.isNearTo(s.pos)) continue
                            if (isInArray([0, 49], p.x) || isInArray([0, 49], p.y)) continue LoopB
                            /* 如果不再路径点缓存中，就push进路径列表中 */
                            if (!isInArray(Memory.outMineData[disRoomName].road, zipPosition(p))) {
                                Memory.outMineData[disRoomName].road.push(zipPosition(p))
                            }
                        }
                    }
                    misson.Data.roadUpdated = true
                    return
                }
                /* 先看路径点中是否有本房间的位置点，有的话就创建工地 */
                for (var mess of Memory.outMineData[disRoomName].road) {
                    if (unzipPosition(mess).roomName == this.name) {
                        unzipPosition(mess).createConstructionSite('road')
                        //var index = Memory.outMineData[disRoomName].road.indexOf(mess)
                        //Memory.outMineData[disRoomName].road.splice(index,1)
                    }
                }
                /* 路线信息更新完毕 接下来进入阶段2 */
                misson.Data.state = 2
            }
        }
        else if (misson.Data.state == 2)    // 采集状态 [正常状态]
        {
            misson.CreepBind['out-harvest'].num = Memory.outMineData[disRoomName].minepoint.length
            misson.CreepBind['out-defend'].num = 0
            if (Memory.outMineData[disRoomName].car) {
                misson.CreepBind['out-car'].num = Memory.outMineData[disRoomName].minepoint.length
            }
            else misson.CreepBind['out-car'].num = 0
        }
        else if (misson.Data.state == 3)    // 防御状态
        {
            misson.CreepBind['out-harvest'].num = 0
            misson.CreepBind['out-car'].num = 0
            misson.CreepBind['out-defend'].num = 1
            if (Game.rooms[misson.Data.disRoom]) {
                var enemys = Game.rooms[misson.Data.disRoom].find(FIND_HOSTILE_CREEPS, {
                    filter: (creep) => {
                        return !isInArray(Memory.whitesheet, creep.owner.username)
                    }
                })
                var InvaderCore = Game.rooms[misson.Data.disRoom].find(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == STRUCTURE_INVADER_CORE
                    }
                })
                if (enemys.length <= 0 && InvaderCore.length <= 0)
                    misson.Data.state = 2
            }
        }
    }
}