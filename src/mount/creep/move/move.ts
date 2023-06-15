// import { RequestShard } from "@/shard/base"
import { hurts, parts } from "@/module/fun/funtion"
import { RequestShard } from "@/module/shard/intershard"
import { closestPotalRoom, getOppositeDirection, isInArray, getDistance1 } from "@/utils"

/* 本地寻路移动 */
export default class CreepMoveExtension extends Creep {

    // 位置标准化
    public standardizePos(pos: RoomPosition): string | null {
        return `${pos.roomName}/${pos.x}/${pos.y}/${Game.shard.name}`
    }

    // 寻找不允许对穿的爬虫的位置
    public getStandedPos(): RoomPosition[] {
        var standedCreep = this.room.find(FIND_MY_CREEPS, {
            filter: (creep) => {
                return (creep.memory.standed == true || (creep.memory.crossLevel && this.memory.crossLevel && creep.memory.crossLevel > this.memory.crossLevel))
            }
        })
        if (standedCreep.length > 0) {
            var posList = []
            for (var i of standedCreep) {
                posList.push(i.pos)
            }
            return posList
        }
        return []
    }

    // 通用寻路
    public findPath(target: RoomPosition, range: number, flee: boolean): string | null {
        /* 全局路线存储 */
        if (!global.routeCache) global.routeCache = {}
        if (!this.memory.moveData) this.memory.moveData = {}
        this.memory.moveData.index = 0
        /* 查找全局中是否已经有预定路线，如果有了就直接返回路线 */
        const routeKey = `${this.standardizePos(this.pos)} ${this.standardizePos(target)}`
        var route = global.routeCache[routeKey]
        if (route && this.room.name != target.roomName) {
            return route
        }


        var result = { path: [], incomplete: true };
        if (this.room.name != target.roomName)
            result = this.findSearch(target, range, 0, flee)
        else result = this.findSearch(target, range, 1, flee)

        // 寻路异常返回null
        if (result.path.length <= 0) return null
        if (!result.incomplete) {//寻到就存起来
            route = this.serializeFarPath(result.path)
            global.routeCache[routeKey] = route
            return route
        }/*
        else {//没寻到尝试在寻一次
            if (this.room.name == target.roomName) {
                result = this.findSearch(target, range, 2, flee)
            }
        }*/
        // 寻路异常返回null
        if (result.path.length <= 0) return null
        // 寻路结果压缩
        route = this.serializeFarPath(result.path)
        global.routeCache[routeKey] = route
        return route
    }

    public findSearch(target: RoomPosition, range: number, key: number, flee: boolean): PathFinderPath {
        // 使用`findRoute`计算路径的高阶计划，优先选择大路和自有房间
        let allowedRooms = { [this.pos.roomName]: true }
        if (key == 0) {
            let ret = Game.map.findRoute(this.pos.roomName, target.roomName, {
                routeCallback(roomName) {
                    // 在全局绕过房间列表的房间 false
                    if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return Infinity
                    let parsed = (/^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName));
                    let isHighway = (Number(parsed[1]) % 10 === 0) ||
                        (Number(parsed[2]) % 10 === 0);
                    let isMyRoom = Game.rooms[roomName] &&
                        Game.rooms[roomName].controller && (
                            Game.rooms[roomName].controller.my ||
                            Game.rooms[roomName].controller.reservation &&
                            Game.rooms[roomName].controller.reservation.username == "Eileen");
                    if (isHighway || isMyRoom) {
                        return isHighway ? 1 : 0.8;
                    } else {
                        return 2.5;
                    }
                }
            })
            if (ret != ERR_NO_PATH) {
                ret.forEach(function (info) {
                    allowedRooms[info.room] = true;
                });
            }
        }

        /* 路线查找 */
        const result = PathFinder.search(this.pos, { pos: target, range: range }, {
            plainCost: 2,
            swampCost: 5,
            maxOps: flee ? 1000 : ((key == 0 || key == 1) && target.roomName == this.room.name) ? 1000 : 8000,
            flee: flee,
            roomCallback: roomName => {
                //躲避这些房间
                if ((key == 0 || key == 1) && allowedRooms[roomName] === undefined) {
                    return false;
                }
                const room = Game.rooms[roomName]
                // 没有视野的房间只观察地形
                if (!room) return
                // 有视野的房间
                let costs = new PathFinder.CostMatrix
                //设置pc
                const pc = Game.powerCreeps[`${this.pos.roomName}/queen/${Game.shard.name}`]
                if (pc && pc.shard) {
                    if ((pc.memory.crossLevel && this.memory.crossLevel && pc.memory.crossLevel > this.memory.crossLevel) || pc.memory.standed)
                        costs.set(pc.pos.x, pc.pos.y, 255)
                    else
                        costs.set(pc.pos.x, pc.pos.y, 5)
                }
                // 将道路的cost设置为1，无法行走的建筑设置为255
                room.find(FIND_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                    else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART || (!struct.my && (struct.structureType == STRUCTURE_RAMPART && !struct.isPublic)))) {
                        costs.set(struct.pos.x, struct.pos.y, 255)
                    }
                })
                room.find(FIND_MY_CONSTRUCTION_SITES).forEach(cons => {
                    if (cons.structureType != 'road' && cons.structureType != 'rampart' && cons.structureType != 'container')
                        costs.set(cons.pos.x, cons.pos.y, 255)
                })
                /* 防止撞到其他虫子造成堵虫 */
                room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                    if (creep.owner.username == 'Source Keeper') {
                        costs.set(creep.pos.x, creep.pos.x, 0)
                    }
                    else if (parts(creep, 'attack') && hurts(creep)['attack'] > 1000) {
                        for (var i = creep.pos.x - 2; i < creep.pos.x + 3; i++) {
                            for (var j = creep.pos.y - 2; j < creep.pos.y + 3; j++) {
                                if (i > 0 && i < 49 && j > 0 && j < 49) {
                                    costs.set(i, j, 20)
                                }
                            }
                        }
                        costs.set(creep.pos.x, creep.pos.y, 255)
                    }
                    else costs.set(creep.pos.x, creep.pos.y, 255)
                })
                room.find(FIND_MY_CREEPS).forEach(creep => {
                    if ((creep.memory.crossLevel && this.memory.crossLevel && creep.memory.crossLevel > this.memory.crossLevel) || creep.memory.standed)
                        costs.set(creep.pos.x, creep.pos.y, 255)
                    else
                        costs.set(creep.pos.x, creep.pos.y, 4)
                })

                return costs
            }
        })
        return result
    }

    // 使用寻路结果移动
    public goByPath(): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        if (!this.memory.moveData) return ERR_NO_PATH
        if (this.memory.moveData.index == undefined) this.memory.moveData.index = 0
        const index = this.memory.moveData.index
        // 移动索引超过数组上限代表到达目的地
        if (index >= this.memory.moveData.path.length) {
            delete this.memory.moveData.path
            return OK
        }
        // 获取方向，进行移动
        const direction = <DirectionConstant>Number(this.memory.moveData.path[index])
        const goResult = this.go(direction)
        // 移动成功，更新下次移动索引
        if (goResult == OK) this.memory.moveData.index++
        return goResult

    }

    // 通用移动 (配合findPath 和 goByPath)
    public goTo(target: RoomPosition, range: number = 1, flee: boolean = false): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        //  var a = Game.cpu.getUsed()
        if (this.memory.moveData == undefined) this.memory.moveData = {}
        // if (target.roomName != this.room.name) {
        //     Game.map.visual.line(this.pos, target, { color: '#ffffff', lineStyle: 'dashed' });
        //     Game.map.visual.text(`${this.memory.MissionData ? this.memory.MissionData.name : null}|${this.name}`, this.pos, { color: '#ffffff', fontSize: 5 });
        // }
        // 确认目标没有变化，如果变化了就重新规划路线
        var targetPosTag: string
        //防止骑墙导致目标一直变化导致的重新寻路
        if (this.memory.moveData.targetPos && this.memory.moveData.targetPos.indexOf(target.roomName) != -1 && this.pos.roomName != target.roomName) {
            targetPosTag = this.memory.moveData.targetPos
        }
        else targetPosTag = this.standardizePos(target)
        if (targetPosTag !== this.memory.moveData.targetPos || flee) {
            this.memory.moveData.targetPos = targetPosTag
            this.memory.moveData.path = this.findPath(target, range, flee)
        }
        // 确认缓存有没有被清除
        if (!this.memory.moveData.path) {
            this.memory.moveData.path = this.findPath(target, range, flee)
        }
        // 还为空的话就是没有找到路径
        if (!this.memory.moveData.path) {
            delete this.memory.moveData.path
            return OK
        }
        // 使用缓存进行移动
        const goResult = this.goByPath()
        // 如果发生撞停或者参数异常，说明缓存可能存在问题，移除缓存
        if (goResult === ERR_INVALID_TARGET) {
            delete this.memory.moveData
        }
        else if (goResult != OK && goResult != ERR_TIRED) {
            this.say(`异常码：${goResult}`)
        }
        // var b = Game.cpu.getUsed()
        // this.say(`${b-a}`)
        return goResult
    }

    // 请求对穿 按照对穿等级划分 等级高的可以任意对穿等级低的，等级低的无法请求等级高的对穿，等级相等则不影响
    public requestCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_NOT_FOUND {
        if (!this.memory.crossLevel) this.memory.crossLevel = 10    // 10为默认对穿等级
        // 获取目标方向一格的位置
        const fontPos = this.pos.directionToPos(direction)
        // 在出口、边界
        if (!fontPos) return ERR_NOT_FOUND
        const fontCreep = (fontPos.lookFor(LOOK_CREEPS)[0] || fontPos.lookFor(LOOK_POWER_CREEPS)[0]) as Creep | PowerCreep
        if (!fontCreep) return ERR_NOT_FOUND
        if (fontCreep.owner.username != this.owner.username) return
        this.say("👉")
        if (fontCreep.manageCross(getOppositeDirection(direction), this.memory.crossLevel)) {
            this.move(direction);
        }
        return OK
    }

    // 处理对穿
    public manageCross(direction: DirectionConstant, crossLevel: number): boolean {
        if (!this.memory.crossLevel) this.memory.crossLevel = 10
        if (!this.memory) return true
        if (this.memory.standed || this.memory.crossLevel > crossLevel) {
            if (!(Game.time % 5)) this.say('👊')
            return false
        }
        // 同意对穿
        this.say('👌')
        this.move(direction)
        return true
    }

    // 单位移动 (goByPath中的移动基本函数)
    public go(direction: DirectionConstant): CreepMoveReturnCode | ERR_INVALID_TARGET {
        const moveResult = this.move(direction)
        if (moveResult != OK) return moveResult
        // 如果ok的话，有可能撞上东西了或者一切正常
        const currentPos = `${this.pos.x}/${this.pos.y}`
        if (this.memory.prePos && currentPos == this.memory.prePos) {
            // 这个时候确定在原点驻留了
            const crossResult = this.memory.disableCross ? ERR_BUSY : this.requestCross(direction)
            if (crossResult != OK) {
                delete this.memory.moveData
                return ERR_INVALID_TARGET
            }
        }
        this.memory.prePos = currentPos
        return OK
    }

    /* 压缩路径 */
    public serializeFarPath(positions: RoomPosition[]): string {
        if (positions.length == 0) return ''
        // 确保路径里第一个位置是自己当前的位置
        if (!positions[0].isEqualTo(this.pos)) positions.splice(0, 0, this.pos)

        return positions.map((pos, index) => {
            // 最后一个位置就不用再移动
            if (index >= positions.length - 1) return null
            // 由于房间边缘地块会有重叠，所以这里筛除掉重叠的步骤
            if (pos.roomName != positions[index + 1].roomName) return null
            // 获取到下个位置的方向
            return pos.getDirectionTo(positions[index + 1])
        }).join('')
    }

    // 跨shard移动
    public arriveTo(target: RoomPosition, range: number, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): void {
        if (!this.memory.targetShard) this.memory.targetShard = shard
        if (!shardData || !shardData.length) {
            if (shard == Game.shard.name) {
                this.goTo(target, range)
                this.say(`前往${target.roomName}`)
            }
            else {
                if (!this.memory.protalRoom)
                // 寻找最近的十字路口房间
                {
                    if (Game.flags[`${this.memory.belong}/portal`]) {
                        this.memory.protalRoom = Game.flags[`${this.memory.belong}/portal`].pos.roomName
                    }
                    else {
                        this.memory.protalRoom = closestPotalRoom(this.memory.belong, target.roomName)
                    }
                }
                if (!this.memory.protalRoom || this.memory.protalRoom == null) return
                if (this.room.name != this.memory.protalRoom) {
                    this.goTo(new RoomPosition(25, 25, this.memory.protalRoom), 20)
                }
                else {
                    var shards = ['shard0', 'shard1', 'shard2', 'shard3']
                    var myShard = shards.indexOf(Game.shard.name)
                    var toShard = shards.indexOf(shard)
                    if (myShard == -1 || toShard == -1) { console.log(`错误,没有此shard${myShard} ${toShard}`); return }
                    let X = myShard - toShard;
                    X > 0 ? X = -1 : X = 1;
                    /* 寻找星门 */
                    var portal = this.room.find(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return structure.structureType == STRUCTURE_PORTAL
                        }
                    }) as StructurePortal[]
                    if (portal.length <= 0) return
                    var thisportal: StructurePortal
                    for (var i of portal) {
                        var porType = i.destination as { shard?: string, room?: string, roomName?: string }
                        if (porType.shard == shards[myShard + X])
                            thisportal = i
                    }
                    if (!thisportal) return
                    if (!this.pos.isNearTo(thisportal)) this.goTo(thisportal.pos, 1)
                    else {
                        /* moveData里的shardmemory */
                        /* 靠近后等待信息传送 */
                        var RequestData = {
                            relateShard: shards[myShard + X] as shardName,
                            sourceShard: Game.shard.name as shardName,
                            type: 1,
                            data: { id: this.name, MemoryData: this.memory }
                        }
                        if (RequestShard(RequestData)) {
                            this.moveTo(thisportal)
                        }
                    }
                }
            }
        }
        else {
            // 存在shardData则说明爬虫可能需要跨越多个shard 
            if (!this.memory.shardAffirm) {
                let data = []
                for (let data_ of shardData) {
                    data.push({ shardName: data_.shard, roomName: data_.roomName, x: data_.x, y: data_.y, affirm: false })
                }
                this.memory.shardAffirm = data
            }
            if (!this.memory.shardAffirm.length) {
                this.say("shardAffirm赋予错误!")
                return
            }
            // 更新目的shardRoom
            for (var sr of this.memory.shardAffirm) {
                if (sr.disRoomName == this.pos.roomName && sr.disShardName == Game.shard.name) {
                    sr.affirm = true
                    break
                }
            }
            // 确定下一个目的shardRoom
            let nextShardRoom: shardRoomData = null
            for (var nr of this.memory.shardAffirm) {
                if (!nr.affirm) {
                    nextShardRoom = { shard: nr.shardName, roomName: nr.roomName, x: nr.x, y: nr.y }
                    break
                }
            }
            // 到达目标shard
            if (!nextShardRoom && Game.shard.name == this.memory.targetShard) {
                this.goTo(target, range)
                this.say(`前往${target.roomName}`)
                return
            }
            this.say(`前往传送门${nextShardRoom.roomName}/${nextShardRoom.x}/${nextShardRoom.y}`)
            // 没到达
            if (!nextShardRoom) {
                this.say('找不到nextShardRoom')
                return
            }
            if (this.room.name != nextShardRoom.roomName) {
                this.goTo(new RoomPosition(25, 25, nextShardRoom.roomName), 20)
            }
            else {
                var portal = this.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType == STRUCTURE_PORTAL
                    }
                }) as StructurePortal[]
                if (portal.length <= 0) return
                var thisportal: StructurePortal
                LoopA:
                for (var i of portal) {
                    var porType = i.destination as { shard?: string, room?: string, roomName?: string }
                    if (i.pos.x == nextShardRoom.x && i.pos.y == nextShardRoom.y) {
                        /* 更新一下shardaffirm的disRoomName信息 */
                        LoopB:
                        for (var sr of this.memory.shardAffirm) {
                            if (sr.roomName == this.pos.roomName && sr.shardName == Game.shard.name) {
                                sr.disRoomName = porType.room
                                nextShardRoom.disShardName = porType.shard as shardName
                                sr.disShardName = porType.shard as shardName
                                break LoopB
                            }
                        }
                        thisportal = i
                        break LoopA
                    }
                }
                if (!thisportal) { console.log("找不到thisportal"); return }
                if (!this.pos.isNearTo(thisportal)) this.goTo(thisportal.pos, 1)
                else {
                    // moveData里的shardmemory 
                    // 靠近后等待信息传送 
                    var RequestData = {
                        relateShard: nextShardRoom.disShardName,
                        sourceShard: Game.shard.name as shardName,
                        type: 1,
                        data: { id: this.name, MemoryData: this.memory }
                    }
                    if (RequestData.relateShard) {
                        if (RequestShard(RequestData)) {
                            this.moveTo(thisportal)
                        }
                    }
                    else {
                        /* 说明可能是本地星门 */
                        this.moveTo(thisportal)
                        for (var nnr of this.memory.shardAffirm)    // 更新affirm
                        {
                            if (!nnr.affirm) {
                                nnr.affirm = true
                                break
                            }
                        }
                    }
                }
            }
        }
    }

    //寻找我和目标之间路径是否完整 ture为完整路径
    public PathFinders(target: RoomPosition, range: number, bool?: boolean): boolean {
        let ret = PathFinder.search(
            this.pos, { pos: target, range: range },
            {
                // 我们需要把默认的移动成本设置的更高一点
                // 这样我们就可以在 roomCallback 里把道路移动成本设置的更低
                plainCost: 1,
                swampCost: 2,
                maxOps: 1000,
                maxCost: bool ? 10000 : 9999999,
                roomCallback: function (roomName) {
                    if (bool && roomName != target.roomName) {
                        return false
                    }
                    let room = Game.rooms[roomName];
                    // 在这个示例中，`room` 始终存在
                    // 但是由于 PathFinder 支持跨多房间检索
                    // 所以你要更加小心！
                    if (!room) return;
                    let costs = new PathFinder.CostMatrix;
                    // 将道路的cost设置为1，无法行走的建筑设置为255
                    room.find(FIND_STRUCTURES).forEach(struct => {
                        if (struct.structureType === STRUCTURE_ROAD) {
                            costs.set(struct.pos.x, struct.pos.y, 1)
                        }
                        else if (struct.structureType !== STRUCTURE_CONTAINER &&
                            (struct.structureType !== STRUCTURE_RAMPART || !struct.my))
                            costs.set(struct.pos.x, struct.pos.y, 0xff)
                    })
                    /* 防止撞到其他虫子造成堵虫 */
                    room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                        costs.set(creep.pos.x, creep.pos.y, 255)
                    })
                    return costs
                },
            }
        );
        if (ret.incomplete) return false
        else return true
    }

    // 多次跨shard affirm更新模块
    public updateShardAffirm(): void {
        if (this.memory.shardAffirm)
            for (var sr of this.memory.shardAffirm) {
                if (sr.disRoomName == this.pos.roomName && sr.shardName == Game.shard.name) {
                    sr.affirm = true
                    return
                }
            }
    }

    // 主动防御寻路
    public findPath_defend(target: RoomPosition, range: number): string | null {
        /* 全局路线存储 */
        if (!global.routeCache) global.routeCache = {}
        if (!this.memory.moveData) this.memory.moveData = {}
        this.memory.moveData.index = 0
        const routeKey = `${this.standardizePos(this.pos)} ${this.standardizePos(target)}`
        /* 路线查找 */
        const result = PathFinder.search(this.pos, { pos: target, range: range }, {
            plainCost: 3,
            swampCost: 10,
            maxOps: 600,
            roomCallback: roomName => {
                // 在全局绕过房间列表的房间 false
                if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false
                // 在爬虫记忆绕过房间列表的房间 false
                const room = Game.rooms[roomName]
                // 没有视野的房间只观察地形
                if (!room) return
                // 有视野的房间
                let costs = new PathFinder.CostMatrix
                /* 设置主动防御范围 */
                if (room.name == this.memory.belong) {
                    /* 将房间边界设置为255 */
                    for (var x = 0; x < 50; x++)
                        for (var y = 0; y < 50; y++) {
                            if (isInArray([0, 49], x) || isInArray([0, 49], y)) {
                                costs.set(x, y, 255)
                            }
                        }
                }
                // 将rampart设置为 1 
                room.find(FIND_MY_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_RAMPART) {
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                })
                // 将道路的cost设置为2，无法行走的建筑设置为255
                room.find(FIND_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 2)
                    }
                    else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART || !struct.my))
                        costs.set(struct.pos.x, struct.pos.y, 255)
                })
                room.find(FIND_MY_CONSTRUCTION_SITES).forEach(cons => {
                    if (cons.structureType != 'road' && cons.structureType != 'rampart' && cons.structureType != 'container')
                        costs.set(cons.pos.x, cons.pos.y, 255)
                })
                room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                    if (parts(creep, 'ranged_attack') && hurts(creep)['ranged_attack'] > 1000) {
                        for (var i = creep.pos.x - 3; i < creep.pos.x + 4; i++)
                            for (var j = creep.pos.y - 3; j < creep.pos.y + 4; j++)
                                if (i > 0 && i < 49 && j > 0 && j < 49) {
                                    var nearpos = new RoomPosition(i, j, creep.room.name)
                                    if (!nearpos.GetStructure('rampart')) {
                                        let list = getDistance1(creep.pos, nearpos)
                                        if (list) {
                                            costs.set(i, j, 10 * list)
                                        }
                                        else costs.set(i, j, 255)
                                    }
                                }
                    }
                })
                /* 防止撞到其他虫子造成堵虫 */
                room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                    costs.set(creep.pos.x, creep.pos.y, 255)
                })
                room.find(FIND_MY_CREEPS).forEach(creep => {
                    if ((creep.memory.crossLevel && creep.memory.crossLevel > this.memory.crossLevel) || creep.memory.standed)
                        costs.set(creep.pos.x, creep.pos.y, 255)
                    else
                        costs.set(creep.pos.x, creep.pos.y, 3)
                })
                return costs
            }
        })
        // 寻路异常返回null
        if (result.path.length <= 0) return null
        // 寻路结果压缩
        var route = this.serializeFarPath(result.path)
        if (!result.incomplete) global.routeCache[routeKey] = route
        return route
    }

    /* 主动防御移动 */
    public goTo_defend(target: RoomPosition, range: number = 1): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        var a = Game.cpu.getUsed()
        if (this.memory.moveData == undefined) this.memory.moveData = {}
        // 确认目标没有变化，如果变化了就重新规划路线
        this.memory.moveData.path = this.findPath_defend(target, range)
        // 还为空的话就是没有找到路径
        if (!this.memory.moveData.path) {
            delete this.memory.moveData.path
            return OK
        }
        // 使用缓存进行移动
        const goResult = this.goByPath()
        // 如果发生撞停或者参数异常，说明缓存可能存在问题，移除缓存
        if (goResult === ERR_INVALID_TARGET) {
            delete this.memory.moveData
        }
        else if (goResult != OK && goResult != ERR_TIRED) {
            this.say(`异常码：${goResult}`)
        }
        var b = Game.cpu.getUsed()
        //this.say(`b-a`)
        return goResult
    }

    // 一体机寻路
    public findPath_aio(target: RoomPosition, range: number): string | null {
        /* 全局路线存储 */
        if (!global.routeCache) global.routeCache = {}
        if (!this.memory.moveData) this.memory.moveData = {}
        this.memory.moveData.index = 0
        const routeKey = `${this.standardizePos(this.pos)} ${this.standardizePos(target)}`
        /* 路线查找 */
        const result = PathFinder.search(this.pos, { pos: target, range: range }, {
            plainCost: 2,
            swampCost: 10,
            maxOps: 600,
            roomCallback: roomName => {
                // 在全局绕过房间列表的房间 false
                if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false
                const room = Game.rooms[roomName]
                // 没有视野的房间只观察地形
                if (!room) return
                // 有视野的房间
                let costs = new PathFinder.CostMatrix
                /* 设置主动防御范围 */
                if (room.name == this.memory.belong) {
                    /* 将房间边界设置为255 */
                    for (var x = 0; x < 50; x++)
                        for (var y = 0; y < 50; y++) {
                            if (isInArray([0, 49], x) || isInArray([0, 49], y)) {
                                costs.set(x, y, 255)
                            }
                        }
                }
                // 将道路的cost设置为2，无法行走的建筑设置为255
                room.find(FIND_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                    else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART || !struct.my))
                        costs.set(struct.pos.x, struct.pos.y, 255)
                })
                room.find(FIND_MY_CONSTRUCTION_SITES).forEach(cons => {
                    if (cons.structureType != 'road' && cons.structureType != 'rampart' && cons.structureType != 'container')
                        costs.set(cons.pos.x, cons.pos.y, 255)
                })
                room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                    if (parts(creep, 'attack')) {
                        for (var i = creep.pos.x - 3; i < creep.pos.x + 4; i++)
                            for (var j = creep.pos.y - 3; j < creep.pos.y + 4; j++)
                                if (i > 0 && i < 49 && j > 0 && j < 49) {
                                    costs.set(i, j, 16)
                                }
                    }
                    else if (parts(creep, 'ranged_attack')) {
                        for (var i = creep.pos.x - 3; i < creep.pos.x + 4; i++)
                            for (var j = creep.pos.y - 3; j < creep.pos.y + 4; j++)
                                if (i > 0 && i < 49 && j > 0 && j < 49) {
                                    costs.set(i, j, 15)
                                }
                    }
                })
                /* 防止撞到其他虫子造成堵虫 */
                room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
                    costs.set(creep.pos.x, creep.pos.y, 255)
                })
                room.find(FIND_MY_CREEPS).forEach(creep => {
                    costs.set(creep.pos.x, creep.pos.y, 255)
                })
                return costs
            }
        })
        // 寻路异常返回null
        if (result.path.length <= 0) return null
        // 寻路结果压缩
        var route = this.serializeFarPath(result.path)
        if (!result.incomplete) global.routeCache[routeKey] = route
        return route
    }

    /* 一体机移动 */
    public goTo_aio(target: RoomPosition, range: number = 1): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        if (this.memory.moveData == undefined) this.memory.moveData = {}
        // 确认目标没有变化，如果变化了就重新规划路线
        this.memory.moveData.path = this.findPath_aio(target, range)
        // 还为空的话就是没有找到路径
        if (!this.memory.moveData.path) {
            delete this.memory.moveData.path
            return OK
        }
        // 使用缓存进行移动
        const goResult = this.goByPath()
        // 如果发生撞停或者参数异常，说明缓存可能存在问题，移除缓存
        if (goResult === ERR_INVALID_TARGET) {
            delete this.memory.moveData
        }
        else if (goResult != OK && goResult != ERR_TIRED) {
            this.say(`异常码：${goResult}`)
        }
        var b = Game.cpu.getUsed()
        return goResult
    }

}