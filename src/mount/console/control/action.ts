import { computationalExpense, StatisticalResources, colorful } from "@/utils"
export default {
    get(id: string) { return Game.getObjectById(id) },
    计算资源(type: CommodityConstant | 'energy', num: number) {
        let a = Game.cpu.getUsed();
        let cost = computationalExpense(type, num)
        for (let i in cost) {
            cost[i] -= StatisticalResources(i as ResourceConstant)
            cost[i] < 0 ? delete cost[i] : cost[i]
        }
        let b = Game.cpu.getUsed();
        return `花费时间:${b - a}  ` + JSON.stringify(cost)
    },
    repair: {
        set(roomName: string, rtype: 'global' | 'special' | 'nuker', num: number, boost: null | ResourceConstant): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '墙体维护' && i.Data.RepairType == rtype) {
                    return `[repair] 房间${roomName}已经存在类型为${rtype}的刷墙任务了`
                }
            var thisTask = thisRoom.public_repair(rtype, num, boost, false)
            if (thisRoom.AddMission(thisTask))
                return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务成功`
            return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务失败`
        },
        remove(roomName: string, Rtype: 'global' | 'special'): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '墙体维护' && i.Data.RepairType == Rtype) {
                    if (thisRoom.DeleteMission(i.id))
                        return `[repair] 房间${roomName}删除类型为${Rtype}刷墙任务成功`
                }
            return `[repair] 房间${roomName}删除类型为${Rtype}刷墙任务失败!`
        },
    },
    plan: {
        C(roomName: string, disRoom: string, Cnum: number = 1, Unum: number = 2, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            let task = thisRoom.public_planC(disRoom, Cnum, Unum, shard)
            if (thisRoom.AddMission(task))
                return colorful(`[plan] 房间${roomName}挂载C计划成功 -> ${disRoom}`, 'green')
            return colorful(`[plan] 房间${roomName}挂载C计划失败 -> ${disRoom}`, 'red')
        },
        CC(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == 'C计划') {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[plan] 房间${roomName}删除C计划成功`, 'green')
                }
            return colorful(`[plan] 房间${roomName}删除C计划失败`, 'red')
        }
    },
    expand: {
        set(roomName: string, disRoom: string, num: number = 1, Cnum: number = 1, time?: number, defend: boolean = false, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            let task = thisRoom.Public_expand(disRoom, shard, num, Cnum, time, defend)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[expand] 房间${roomName}挂载扩张援建计划成功 -(${shard})-> ${disRoom}`, 'green')
            }
            return colorful(`[expand] 房间${roomName}挂载扩张援建计划失败 -(${shard})-> ${disRoom}`, 'red')
        },
        remove(roomName: string, disRoom: string, shard: shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '扩张援建' && i.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[expand] 房间${roomName}删除去往${disRoom}(${shard})的扩张援建任务成功`, 'green')
                }
            return colorful(`[expand] 房间${roomName}删除去往${disRoom}(${shard})的扩张援建任务失败`, 'red')
        },
    },
    war: {
        /**
         * 
         * @param roomName 发布房间名字
         * @param FlagName 旗子名字
         * @param num 发布爬数量
         * @param shard shard
         * @param time 间隔
         * @returns 
         */
        disaio(roomName: string, FlagName: string, num: number = 1, level: number = 2, time?: number, shard?: string, shardData: shardRoomData[] = null): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            if (level != 1 && level != 2 && level != 3 && level != 10) return `level 只限  1 或者 2 或者 3`
            let task = thisRoom.Public_AIO(FlagName, num, level, shard, time)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[war] 房间${roomName}挂载一体机任务成功 -> ${FlagName}`, 'green')
            }
            return colorful(`[war] 房间${roomName}挂载一体机任务失败 -> ${FlagName}`, 'red')
        },
        Cdisaio(roomName: string, FlagName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '一体机' && i.Data.FlagName == FlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[plan] 房间${roomName}删除一体机任务成功`, 'green')
                }
            }
            return colorful(`[war] 房间${roomName}删除一体机任务失败`, 'red')
        },
        double(roomName: string, FlagName: string, type: string = 'attack', num: number = 1, time?: number, shard?: string, shardData: shardRoomData[] = null) {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            if (type != 'attack' && type != 'work') return `type 只限 attack 或者 work`
            let task = thisRoom.Public_doubleDismantle(FlagName, type, num, shard, time)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[war] 房间${roomName}挂载双人攻击任务成功 -> ${FlagName}`, 'green')
            }
            return colorful(`[war] 房间${roomName}挂载双人攻击任务失败 -> ${FlagName}`, 'red')
        },
        Cdouble(roomName: string, FlagName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '双人攻击' && i.Data.FlagName == FlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[plan] 房间${roomName}删除双人攻击任务成功`, 'green')
                }
            }
            return colorful(`[war] 房间${roomName}删除双人攻击任务失败`, 'red')
        },
        dismantle(roomName: string, disRoom: string, num: number = 1, boost?: boolean, interval?: number, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '黄球拆迁' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
                }
            let interval_ = interval ? interval : 1000
            let task = thisRoom.Public_dismantle(disRoom, num, interval_, boost, shard)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[war] 房间${roomName}挂载拆迁任务成功 -> ${disRoom}`, 'green')
            }
            return colorful(`[war] 房间${roomName}挂载拆迁任务失败 -> ${disRoom}`, 'red')
        },
        Cdismantle(roomName: string, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '黄球拆迁' && i.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[plan] 房间${roomName}删除拆迁任务成功`, 'green')
                }
            }
            return colorful(`[war] 房间${roomName}删除拆迁任务失败`, 'red')
        },
        support(roomName: string, disRoom: string, shard: shardName, sType: 'double', num: number, interval: number = 1000, boost: boolean = true): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var oi of thisRoom.memory.Misson['Creep'])
                if (oi.name == '紧急支援' && oi.Data.disRoom == disRoom && oi.Data.shard == shard) {
                    return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
                }
            let task = thisRoom.Public_support(disRoom, sType, shard, num, boost)
            if (thisRoom.AddMission(task))
                return colorful(`[war] 房间${roomName}挂载紧急支援任务成功 -> ${disRoom}`, 'green')
            return colorful(`[war] 房间${roomName}挂载紧急支援任务失败 -> ${disRoom}`, 'red')
        },
        Csupport(roomName: string, disRoom: string, rType: string, shard: shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '紧急支援' && i.Data.disRoom == disRoom && i.Data.sType == rType && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[war] 房间${roomName}-(${shard})->${disRoom}|[${rType}]紧急支援任务删除成功`, 'green')
                }
            }
            return colorful(`[war] 房间${roomName}-(${shard})->${disRoom}|[${rType}]紧急支援任务删除失败`, 'red')
        },
        control(roomName: string, disRoom: string, body: number = 1, num: number = 1, interval: number = 1000, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var oi of thisRoom.memory.Misson['Creep'])
                if (oi.name == '控制攻击' && oi.Data.disRoom == disRoom && oi.Data.shard == shard) {
                    return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
                }
            if (body != 1 && body != 2) return `body 只限1或者2`;
            let task = thisRoom.Public_control(disRoom, body, num, interval, shard)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[war] 房间${roomName}挂载控制攻击任务成功 -> ${disRoom}`, 'green')
            }
            return colorful(`[war] 房间${roomName}挂载控制攻击任务失败 -> ${disRoom}`, 'red')
        },
        Ccontrol(roomName: string, disRoom: string, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '控制攻击' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[war] 房间${roomName}取消控制攻击任务成功`, 'green')
                }
            }
            return colorful(`[war] 房间${roomName}控制攻击任务失败`, 'red')
        },
        squad(roomName: string, disRoom: string, mtype: 'R' | 'A' | 'D' | 'Aio' | 'RA' | 'DA' | 'DR', time: number = 1000, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var oi of myRoom.memory.Misson['Creep'])
                if (oi.name == '四人小队' && oi.Data.disRoom == disRoom && oi.Data.shard == shard && oi.Data.flag == mtype) {
                    return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的<${mtype}>四人小队任务了!`
                }
            let thisTask: MissionModel
            if (mtype == 'R') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 2, 0, 0, 2, 0, mtype)//蓝绿
            }
            else if (mtype == 'A') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 0, 2, 0, 2, 0, mtype)//红绿
            }
            else if (mtype == 'D') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 0, 0, 2, 2, 0, mtype)//黄绿
            }
            else if (mtype == 'Aio') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 0, 0, 0, 0, 4, mtype)//一体机
            }
            else if (mtype == 'RA') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 1, 1, 0, 2, 0, mtype)//蓝红绿
            }
            else if (mtype == 'DA') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 0, 1, 1, 2, 0, mtype)//红黄绿
            }
            else if (mtype == 'DR') {
                thisTask = myRoom.public_squad(disRoom, shard, time, 1, 0, 1, 2, 0, mtype)//蓝黄绿
            }
            if (myRoom.AddMission(thisTask)) {
                if (shardData) thisTask.Data.shardData = shardData
                return `[war] 四人小队任务挂载成功! ${Game.shard.name}/${roomName} -> ${shard}/${disRoom}`
            }

            return `[war] 四人小队挂载失败!`
        },
        Csquad(roomName: string, disRoom: string, mtype: 'R' | 'A' | 'D' | 'Aio' | 'RA' | 'DA' | 'DR', shard: shardName = Game.shard.name as shardName): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var i of myRoom.memory.Misson['Creep']) {
                if (i.name == '四人小队' && i.Data.disRoom == disRoom && i.Data.shard == shard && i.Data.flag == mtype) {
                    if (myRoom.DeleteMission(i.id))
                        return `[war] 删除去往${shard}/${disRoom}的四人小队任务成功!`
                }
            }
            return `[war] 删除去往${shard}/${disRoom}的四人小队任务失败!`
        }
    },
    upgrade: {
        quick(roomName: string, num: number, boostType: null | ResourceConstant = null): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[upgrade] 不存在房间${roomName}`
            var thisTask = thisRoom.Public_quick(num, boostType)
            if (thisTask && thisRoom.AddMission(thisTask))
                return `[upgrade] 房间${roomName}挂载急速冲级任务成功`
            return `[upgrade] 房间${roomName}挂载急速冲级任务失败`
        },
        Cquick(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '急速冲级') {
                    if (thisRoom.DeleteMission(i.id))
                        return `[upgrade] 房间${roomName}删除急速冲级任务成功`
                }
            return `[upgrade] 房间${roomName}删除急速冲级任务失败!`
        },
        Nquick(roomName: string, num: number): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '急速冲级') {
                    i.CreepBind['rush'].num = num
                    return `[upgrade] 房间${roomName}急速冲级任务数量修改为${num}`
                }
            return `[upgrade] 房间${roomName}修改急速冲级任务数量失败!`
        },
        normal(roomName: string, num: number, boostType: null | ResourceConstant): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[upgrade] 不存在房间${roomName}`
            var thisTask = thisRoom.public_normal(num, boostType)
            if (thisTask && thisRoom.AddMission(thisTask))
                return `[upgrade] 房间${roomName}挂载普通冲级任务成功`
            return `[upgrade] 房间${roomName}挂载普通冲级任务失败`
        },
        Cnormal(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '普通冲级') {
                    if (thisRoom.DeleteMission(i.id))
                        return `[upgrade] 房间${roomName}删除普通冲级任务成功`
                }
            return `[upgrade] 房间${roomName}删除普通冲级任务失败!`
        },
    },
    carry: {
        special(roomName: string, res: ResourceConstant, sP: RoomPosition, dP: RoomPosition, CreepNum?: number, ResNum?: number): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[carry] 不存在房间${roomName}`
            let time = 99999
            if (!ResNum) time = 30000
            var thisTask = thisRoom.Public_Carry({ 'truck': { num: CreepNum ? CreepNum : 1, bind: [] } }, time, sP.roomName, sP.x, sP.y, dP.roomName, dP.x, dP.y, res, ResNum ? ResNum : undefined)
            if (thisRoom.AddMission(thisTask)) return `[carry] 房间${roomName}挂载special搬运任务成功`
            return `[carry] 房间${roomName}挂载special搬运任务失败`
        },
        Cspecial(roomName: string): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[carry] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '物流运输' && i.CreepBind['truck']) {
                    if (thisRoom.DeleteMission(i.id))
                        return `[carry] 房间${roomName}删除special搬运任务成功`
                }
            return `[carry] 房间${roomName}删除special搬运任务失败`
        },
    },
    /* 白名单api */
    whitesheet: {
        add(username: string): string {
            if (!Memory.whitesheet) Memory.whitesheet = []
            Memory.whitesheet = _.uniq([...Memory.whitesheet, username])
            return `[whitesheet]已添加用户${username}进白名单！\n${this.show()}`
        },
        show(): string {
            if (!Memory.whitesheet || Memory.whitesheet.length <= 0) return "[whitesheet]当前白名单为空！"
            return `[whitesheet]白名单列表：${Memory.whitesheet.join(' ')}`
        },
        clean(): string {
            Memory.whitesheet = []
            return '[whitesheet]当前白名单已清空'
        },
        remove(username: string): string {
            // if (! (username in Memory.whitesheet)) return `[whitesheet]白名单里没有玩家“${username}”`
            if (!Memory.whitesheet) Memory.whitesheet = []
            if (Memory.whitesheet.length <= 0) delete Memory.whitesheet
            else Memory.whitesheet = _.difference(Memory.whitesheet, [username])
            return `[whitesheet]已移除${username}出白名单`
        }
    },

    support: {
        // 紧急援建
        build(roomName: string, disRoom: string, num: number = 2, interval: number = 1000, shard: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            let task = thisRoom.Public_helpBuild(disRoom, num, shard, interval)
            if (thisRoom.AddMission(task)) {
                if (shardData) task.Data.shardData = shardData
                return colorful(`[support] 房间${roomName}挂载紧急援建任务成功 -> ${disRoom}`, 'green')
            }
            return colorful(`[support] 房间${roomName}挂载紧急援建任务失败 -> ${disRoom}`, 'red')
        },
        Cbuild(roomName: string, disRoom: string, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '紧急援建' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`[support] 房间${roomName}取消紧急援建任务成功`, 'green')
                }
            }
            return colorful(`[support] 房间${roomName}紧急援建任务失败`, 'red')
        },
    },

    /* 核弹相关 */
    nuke: {
        /* 发射核弹 */
        launch(roomName: string, disRoom: string, x_: number, y_: number): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[nuke]房间错误，请确认房间${roomName}！`
            var nuke_ = Game.getObjectById(myRoom.memory.StructureIdData.NukerID) as StructureNuker
            if (!nuke_) return `[nuke]核弹查询错误!`
            if (nuke_.launchNuke(new RoomPosition(x_, y_, disRoom)) == OK)
                return colorful(`[nuke]${roomName}->${disRoom}的核弹发射成功!预计---500000---ticks后着陆!`, 'yellow', true)
            else
                return colorful(`[nuke]${roomName}->${disRoom}的核弹发射失败!`, 'yellow', true)
        },
        add(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[nuker] 不存在房间${roomName}`
            var thisTask = thisRoom.public_Nuker()
            if (thisRoom.AddMission(thisTask)) return `[nuker] ${roomName} 的核弹填充任务挂载成功！`
            return `[nuker] ${roomName} 的核弹填充任务挂载失败！`
        },
        remove(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[nuker] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Structure']) {
                if (i.name == '核弹填充') {
                    if (thisRoom.DeleteMission(i.id)) {
                        return `[nuker] ${roomName} 的核弹填充任务删除成功！`
                    }
                }
            }
            return `[nuker] ${roomName} 的核弹填充任务删除失败！`
        }
    },

    sign: {
        /**房间签名 */
        sig(roomName: string, disRoom: string, text: string, shard?: shardName, shardData: shardRoomData[] = null) {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[roomName]不是我的房间，请确认房间${roomName}！`;
            let sig = myRoom.Public_sig(disRoom, text, shard);
            if (!sig) return `[签名]任务挂载失败`;
            if (myRoom.AddMission(sig)) {
                if (shardData) sig.Data.shardData = shardData
                return colorful(`[签名] 房间${roomName}挂载签名任务成功 -> ${disRoom}`, 'green')
            }
            return colorful(`[签名] 房间${roomName}挂载签名任务失败 -> ${disRoom}`, 'red')
        },

        Csig(roomName: string, disRoom: string, shard?: shardName) {
            var thisRoom = Game.rooms[roomName];
            if (!shard) shard = Game.shard.name as shardName;
            if (!thisRoom) return `[签名] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '签名' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`删除 [签名] 房间${roomName}任务成功`, 'green')
                }
            }
            return colorful(`[签名] 房间${roomName}签名任务失败`, 'red')
        }
    },

    loot: {
        /**
         * 
         * @param roomName 我的房间
         * @param sourceFlagName 要掠夺的旗子名称
         * @param targetStructureId 要放入我的容器
         * @returns 
         */
        loot(roomName: string, sourceFlagName: string, targetStructureId: string, num: number) {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `不是我的房间，请确认房间${roomName}！`;
            if (!targetStructureId || !sourceFlagName) return `[掠夺任务] 发布失败，请填写 旗子名称 和 要存放到的建筑的id`
            let loot_ = myRoom.Public_loot(sourceFlagName, targetStructureId, num);
            if (!loot_) return `[掠夺]任务挂载失败`;
            if (myRoom.AddMission(loot_))
                return colorful(`[掠夺] 房间${roomName}挂载掠夺任务成功 -> ${sourceFlagName}`, 'green')
            return colorful(`[掠夺] 房间${roomName}挂载掠夺任务失败 -> ${sourceFlagName}`, 'red')
        },

        Cloot(roomName: string, sourceFlagName: string) {
            var thisRoom = Game.rooms[roomName];
            if (!thisRoom) return `不是我的房间，请确认房间${roomName}！`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '掠夺者' && i.Data.sourceFlagName == sourceFlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`删除 [掠夺] 房间${roomName}任务成功`, 'green')
                }
            }
            return colorful(`删除 [签名] 房间${roomName}任务失败`, 'red')
        },

        carryShard(roomName: string, naFlagName: string, toFlagName: string, cnum: number, level: number = 0, rtype: ResourceConstant, rnum: number, interval: number = 1500, nashardName: shardName = Game.shard.name as shardName, toshardName: shardName = Game.shard.name as shardName, shardData: shardRoomData[] = null): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `不是我的房间，请确认房间${roomName}！`;
            if (!naFlagName || !toFlagName || !cnum || !rtype || !rnum) return `参数不全，请重新输入!!!`
            let loot_ = myRoom.public_carry_shard(naFlagName, toFlagName, cnum, level, rtype, rnum, interval, nashardName, toshardName)
            if (myRoom.AddMission(loot_)) {
                if (shardData) loot_.Data.shardData = shardData
                return colorful(`[跨shard运输] 房间${roomName}挂载跨shard运输任务成功 -> ${naFlagName}:${nashardName}->${toFlagName}:${toshardName}`, 'green')
            }
            return colorful(`[跨shard运输] 房间${roomName}挂载跨shard运输任务失败 -> ${naFlagName}:${nashardName}->${toFlagName}:${toshardName}`, 'red')
        },

        CcarryShard(roomName: string, naFlagName: string, toFlagName: string) {
            var thisRoom = Game.rooms[roomName];
            if (!thisRoom) return `不是我的房间，请确认房间${roomName}！`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '跨shard运输' && i.Data.naFlagName == naFlagName && i.Data.toFlagName == toFlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return colorful(`删除 [跨shard运输] 房间${roomName}任务成功`, 'green')
                }
            }
            return colorful(`删除 [跨shard运输] 房间${roomName}任务失败`, 'red')
        }
    },

    /* 全局资源传送 */
    give: {
        set(roomName: string, rType: ResourceConstant, num: number, pass?: boolean): string {
            if (num > 300000) return `[give] 资源数量太多!不能挂载全局资源传送任务!`
            if (!Game.rooms[roomName] && !pass) {
                // 不是自己房间需要确认
                return `[give] 未授权的传送命令,目标房间非自己房间!`
            }
            for (var i of Memory.ResourceDispatchData) {
                if (i.sourceRoom == roomName && i.rType == rType)
                    return `[give] 已经存在全局资源传送任务了!`
            }
            let dispatchTask: RDData = {
                sourceRoom: roomName,
                rType: rType,
                num: num,
                delayTick: 1500,
                conditionTick: 500,
                buy: false,
            }
            Memory.ResourceDispatchData.push(dispatchTask)
            return `[give] 全局资源传送任务发布,房间${roomName},资源类型${rType},数量${num}`
        },
        remove(roomName: string, rType: ResourceConstant): string {
            for (var i of Memory.ResourceDispatchData) {
                if (i.sourceRoom == roomName && i.rType == rType) {
                    let index = Memory.ResourceDispatchData.indexOf(i)
                    Memory.ResourceDispatchData.splice(index, 1)
                    return `[give] 成功删除房间${roomName}[${rType}]全局资源传送任务!`
                }
            }
            return `[give] 未发现房间${roomName}[${rType}]全局资源传送任务!`
        }
    },

}