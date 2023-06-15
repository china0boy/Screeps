import { Colorful, isInArray, unzipPosition, zipPosition, nineRoom, bodyFree } from "@/utils"
export default class RoomMissonMineExtension extends Room {
    /* 房间外矿处理任务 只适用于一般外矿 */
    public Task_OutMine(misson: MissionModel): void {
        if (Memory.outMineData[misson.Data.disRoom] && Memory.outMineData[misson.Data.disRoom].mineType == 'center' && !global.MSB[misson.id]) {
            let body = bodyFree({ 'move': 10, 'work': 10, 'carry': 2, 'attack': 19, 'heal': 9 })
            global.MSB[misson.id] = { 'out-harvest': body }
        }
        if (Game.time % 13) return
        let disRoomName: string = misson.Data.disRoom
        if (!Memory.outMineData[disRoomName]) Memory.outMineData[disRoomName] = { road: [], startpoint: misson.Data.startpoint, minepoint: [], mineType: (nineRoom(disRoomName) ? 'center' : 'normal') }
        // 相关爬虫死亡后的数据擦除
        if (Memory.outMineData[disRoomName].minepoint && Memory.outMineData[disRoomName].minepoint.length > 0) {
            for (var obj of Memory.outMineData[disRoomName].minepoint) {
                if (obj.bind && obj.bind.harvest && !Game.creeps[obj.bind.harvest]) delete obj.bind.harvest
                if (obj.bind && obj.bind.car && !Game.creeps[obj.bind.car]) delete obj.bind.car
            }
        }
        if (Memory.outMineData[disRoomName].mineType == 'normal') {
            if (!misson.Data.state) misson.Data.state = 1   // 默认状态1
            misson.CreepBind['out-claim'].num = 1
            if (misson.Data.state == 1) // 初始化状态
            {
                /* 状态1下仅仅获取外矿信息和派出claimer */
                if (Game.rooms[disRoomName]) {
                    const time = (Game.map.getRoomLinearDistance(this.name, disRoomName) * 50 + 50);//预估路程时间
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
                            Memory.outMineData[disRoomName].minepoint.push({ pos: zipPosition(s.pos), bind: {}, time: time })
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
                if (misson.CreepBind['out-defend']) misson.CreepBind['out-defend'].num = 0
                if (Memory.outMineData[disRoomName].car) {
                    misson.CreepBind['out-car'].num = Memory.outMineData[disRoomName].minepoint.length
                }
                else misson.CreepBind['out-car'].num = 0
            }
            else if (misson.Data.state == 3)    // 防御状态
            {
                misson.CreepBind['out-harvest'].num = 0
                misson.CreepBind['out-car'].num = 0
                //检查是否已经发布了防御任务
                if (!this.MissionNum('Creep', 'out-defend')) this.AddMission(this.public_blue_out(misson.Data.disRoom))
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
                    return
                }
            }
        }
        if (Memory.outMineData[disRoomName].mineType == 'center') {
            misson.CreepBind['out-defend'].num = 1
            if (!misson.Data.state) misson.Data.state = 1   // 默认状态1
            if (misson.Data.state == 1) // 初始化状态
            {
                /* 状态1下获取外矿信息和派出一体机 */
                if (Game.rooms[disRoomName]) {
                    var sources = Game.rooms[disRoomName].find(FIND_SOURCES)
                    var minerals = Game.rooms[disRoomName].find(FIND_MINERALS)
                    const time = (Game.map.getRoomLinearDistance(this.name, disRoomName) * 50 + 50);//预估路程时间
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
                            Memory.outMineData[disRoomName].minepoint.push({ pos: zipPosition(s.pos), bind: {}, time: time, })
                        }
                        return
                    }
                    if (!Memory.outMineData[disRoomName].mineral && minerals.length) {
                        Memory.outMineData[disRoomName].mineral = { Id: minerals[0].id, time: time }
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
                        }
                    }
                    /* 路线信息更新完毕 接下来进入阶段2 */
                    misson.Data.state = 2
                }
                else {
                    let obs = Game.getObjectById(this.memory.StructureIdData.ObserverID) as StructureObserver
                    if (obs) obs.observeRoom(disRoomName)
                }
            }
            else if (misson.Data.state == 2)    // 搬运状态 [正常状态]
            {
                misson.CreepBind['out-harvest'].num = Memory.outMineData[disRoomName].minepoint.length
                if (Memory.outMineData[disRoomName].car) {
                    misson.CreepBind['out-car'].num = Memory.outMineData[disRoomName].minepoint.length
                }
                else misson.CreepBind['out-car'].num = 0

                if (Game.rooms[disRoomName]) {
                    if (Memory.outMineData && Memory.outMineData[disRoomName]) {
                        for (var i of Memory.outMineData[disRoomName].road) {
                            var thisPos = unzipPosition(i) as RoomPosition
                            if (thisPos.roomName == disRoomName && !thisPos.GetStructure('road')) {
                                thisPos.createConstructionSite('road')
                            }
                        }
                    }
                    if (Memory.outMineData[disRoomName].mineral) {
                        let mineral = Game.getObjectById(Memory.outMineData[disRoomName].mineral.Id) as Mineral
                        if (mineral) {
                            if (mineral.mineralAmount) { misson.CreepBind['out-mineral'].num = 1; misson.CreepBind['out-defend'].num = 1 }
                            else { misson.CreepBind['out-mineral'].num = 0; misson.CreepBind['out-defend'].num = 0 }
                        }
                    }
                    let InvaderCore = this.find(FIND_STRUCTURES, {
                        filter: (stru) => {
                            return stru.structureType == STRUCTURE_INVADER_CORE
                        }
                    }) as StructureInvaderCore[]
                    if (InvaderCore.length && InvaderCore[0].level && InvaderCore[0].ticksToDeploy <= 2100) {
                        misson.Data.state == 3
                    }
                }
            }
            else if (misson.Data.state == 3) //等待堡垒消散
            {
                misson.CreepBind['out-harvest'].num = 0
                misson.CreepBind['out-car'].num = 0
                misson.CreepBind['out-mineral'].num = 0
                misson.CreepBind['out-defend'].num = 0
                if (Game.time % 100 <= 5) {
                    if (Game.rooms[disRoomName]) {
                        let InvaderCore = this.find(FIND_STRUCTURES, {
                            filter: (stru) => {
                                return stru.structureType == STRUCTURE_INVADER_CORE || stru.structureType == 'tower'
                            }
                        }) as StructureInvaderCore[]
                        if (!InvaderCore.length) misson.Data.state == 2
                    }
                    else {
                        let obs = Game.getObjectById(this.memory.StructureIdData.ObserverID) as StructureObserver
                        if (obs) obs.observeRoom(disRoomName)
                    }
                }
            }

        }
    }
}