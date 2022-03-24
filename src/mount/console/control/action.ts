import { closestPotalRoom, Colorful, compare, isInArray } from "@/utils"
import { avePrice, haveOrder, highestPrice } from "@/module/fun/funtion"
export default {
    get(id: string) { return Game.getObjectById(id) },
    repair: {
        set(roomName: string, rtype: 'global' | 'special' | 'nuker', num: number = 1, boost: null | ResourceConstant = null, vindicate: boolean = false): string {
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '墙体维护' && i.Data.RepairType == rtype) {
                    return `[repair] 房间${roomName}已经存在类型为${rtype}的刷墙任务了`
                }
            var thisTask = thisRoom.public_repair(rtype, num, boost, vindicate)
            if (thisRoom.AddMission(thisTask))
                return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务成功`
            return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务失败`
        },
        remove(roomName: string, Rtype: 'global' | 'special' | 'nuker'): string {
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
                return Colorful(`[plan] 房间${roomName}挂载C计划成功 -> ${disRoom}`, 'green')
            return Colorful(`[plan] 房间${roomName}挂载C计划失败 -> ${disRoom}`, 'red')
        },
        CC(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == 'C计划') {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[plan] 房间${roomName}删除C计划成功`, 'green')
                }
            return Colorful(`[plan] 房间${roomName}删除C计划失败`, 'red')
        }
    },
    expand: {
        set(roomName: string, disRoom: string, num: number = 1, Cnum: number = 1): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            let task = thisRoom.Public_expand(disRoom, num, Cnum)
            if (thisRoom.AddMission(task))
                return Colorful(`[expand] 房间${roomName}挂载扩张援建计划成功 -> ${disRoom}`, 'green')
            return Colorful(`[expand] 房间${roomName}挂载扩张援建计划失败 -> ${disRoom}`, 'red')
        },
        remove(roomName: string, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
                if (i.name == '扩张援建' && i.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[expand] 房间${roomName}删除扩张援建成功`, 'green')
                }
            return Colorful(`[expand] 房间${roomName}删除扩张援建失败`, 'red')
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
        disaio(roomName: string, FlagName: string, num: number = 1, level: number = 2, shard?: string, time?: number): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            if (level != 1 && level != 2 && level != 10) return `level 只限  1 或者 2`
            let task = thisRoom.Public_AIO(FlagName, num, level, shard, time)
            if (thisRoom.AddMission(task))
                return Colorful(`[war] 房间${roomName}挂载一体机任务成功 -> ${FlagName}`, 'green')
            return Colorful(`[war] 房间${roomName}挂载一体机任务失败 -> ${FlagName}`, 'red')
        },
        Cdisaio(roomName: string, FlagName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '一体机' && i.Data.FlagName == FlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[plan] 房间${roomName}删除一体机任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}删除一体机任务失败`, 'red')
        },
        double(roomName: string, FlagName: string, type: string = 'attack', num: number = 1, shard?: string, time?: number) {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            if (type != 'attack' && type != 'work') return `type 只限 attack 或者 work`
            let task = thisRoom.Public_doubleDismantle(FlagName, type, num, shard, time)
            if (thisRoom.AddMission(task))
                return Colorful(`[war] 房间${roomName}挂载双人攻击任务成功 -> ${FlagName}`, 'green')
            return Colorful(`[war] 房间${roomName}挂载双人攻击任务失败 -> ${FlagName}`, 'red')
        },
        Cdouble(roomName: string, FlagName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '双人攻击' && i.Data.FlagName == FlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[plan] 房间${roomName}删除双人攻击任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}删除双人攻击任务失败`, 'red')
        },
        dismantle(roomName: string, disRoom: string, num: number = 1, boost?: boolean, interval?: number, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            let interval_ = interval ? interval : 1000
            let task = thisRoom.Public_dismantle(disRoom, num, interval_, boost,shard)
            if (thisRoom.AddMission(task))
                return Colorful(`[war] 房间${roomName}挂载拆迁任务成功 -> ${disRoom}`, 'green')
            return Colorful(`[war] 房间${roomName}挂载拆迁任务失败 -> ${disRoom}`, 'red')
        },
        Cdismantle(roomName: string, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '黄球拆迁' && i.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[plan] 房间${roomName}删除拆迁任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}删除拆迁任务失败`, 'red')
        },
        support(roomName: string, disRoom: string, rType: 'double'): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            let task = thisRoom.Public_support(disRoom, rType, 'shard3')
            if (thisRoom.AddMission(task))
                return Colorful(`[war] 房间${roomName}挂载紧急支援任务成功 -> ${disRoom}`, 'green')
            return Colorful(`[war] 房间${roomName}挂载紧急支援任务失败 -> ${disRoom}`, 'red')
        },
        Csupport(roomName: string, disRoom: string, rType: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '紧急支援' && i.Data.disRoom == disRoom && i.Data.sType == rType) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[war] 房间${roomName}紧急支援任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}紧急支援任务失败`, 'red')
        },
        control(roomName: string, disRoom: string,body:number=1 ,interval: number = 800, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            let task = thisRoom.Public_control(disRoom,body, interval,shard)
            if (thisRoom.AddMission(task))
                return Colorful(`[war] 房间${roomName}挂载控制攻击任务成功 -> ${disRoom}`, 'green')
            return Colorful(`[war] 房间${roomName}挂载控制攻击任务失败 -> ${disRoom}`, 'red')
        },
        Ccontrol(roomName: string, disRoom: string, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '控制攻击' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[war] 房间${roomName}取消控制攻击任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}控制攻击任务失败`, 'red')
        },
        squad(roomName:string,disRoom:string,shard:shardName,mtype:'R'|'A'|'D'|'Aio'|'RA'|'DA'|'DR',time:number= 1000):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            let thisTask:MissionModel
            if (mtype == 'R')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,2,0,0,2,0,mtype)
            }
            else if (mtype == 'A')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,2,0,2,0,mtype)
            }
            else if (mtype == 'D')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,0,2,2,0,mtype)
            }
            else if (mtype == 'Aio')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,0,0,0,4,mtype)
            }
            else if (mtype == 'RA')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,1,1,0,2,0,mtype)
            }
            else if (mtype == 'DA')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,1,1,2,0,mtype)
            }
            else if (mtype == 'DR')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,1,0,1,2,0,mtype)
            }
            if (myRoom.AddMission(thisTask))
            return `[war] 四人小队任务挂载成功! ${Game.shard.name}/${roomName} -> ${shard}/${disRoom}`
            return `[war] 四人小队挂载失败!`
        },
        Csquad(roomName:string,disRoom:string,shard:shardName,mtype:'R'|'A'|'D'|'Aio'|'RA'|'DA'|'DR'):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var i of myRoom.memory.Misson['Creep'])
            {
                if (i.name == '四人小队' && i.Data.disRoom == disRoom && i.Data.shard == shard && i.Data.flag == mtype)
                {
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
                if (i.name == '物流运输' && i.CreepBind['truck'] && i.Data.rType) {
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
        build(roomName: string, disRoom: string, num: number = 2, interval: number = 1000, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            let task = thisRoom.Public_helpBuild(disRoom, num, shard, interval)
            if (thisRoom.AddMission(task))
                return Colorful(`[support] 房间${roomName}挂载紧急援建任务成功 -> ${disRoom}`, 'green')
            return Colorful(`[support] 房间${roomName}挂载紧急援建任务失败 -> ${disRoom}`, 'red')
        },
        Cbuild(roomName: string, disRoom: string, shard: shardName = Game.shard.name as shardName): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '紧急援建' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`[support] 房间${roomName}取消紧急援建任务成功`, 'green')
                }
            }
            return Colorful(`[support] 房间${roomName}紧急援建任务失败`, 'red')
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
                return Colorful(`[nuke]${roomName}->${disRoom}的核弹发射成功!预计---500000---ticks后着陆!`, 'yellow', true)
            else
                return Colorful(`[nuke]${roomName}->${disRoom}的核弹发射失败!`, 'yellow', true)
        }
    },

    sign: {
        /**房间签名 */
        sig(roomName: string, disRoom: string, text: string, shard?: shardName) {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[roomName]不是我的房间，请确认房间${roomName}！`;
            let sig = myRoom.Public_sig(disRoom, text, shard);
            if (!sig) return `[签名]任务挂载失败`;
            if (myRoom.AddMission(sig))
                return Colorful(`[签名] 房间${roomName}挂载签名任务成功 -> ${disRoom}`, 'green')
            return Colorful(`[签名] 房间${roomName}挂载签名任务失败 -> ${disRoom}`, 'red')
        },

        csig(roomName: string, disRoom: string, shard?: shardName) {
            var thisRoom = Game.rooms[roomName];
            if (!shard) shard = Game.shard.name as shardName;
            if (!thisRoom) return `[签名] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '签名' && i.Data.disRoom == disRoom && i.Data.shard == shard) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`删除 [签名] 房间${roomName}任务成功`, 'green')
                }
            }
            return Colorful(`[签名] 房间${roomName}签名任务失败`, 'red')
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
                return Colorful(`[掠夺] 房间${roomName}挂载掠夺任务成功 -> ${sourceFlagName}`, 'green')
            return Colorful(`[掠夺] 房间${roomName}挂载掠夺任务失败 -> ${sourceFlagName}`, 'red')
        },

        Cloot(roomName: string, sourceFlagName: string) {
            var thisRoom = Game.rooms[roomName];
            if (!thisRoom) return `不是我的房间，请确认房间${roomName}！`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '掠夺者' && i.Data.sourceFlagName == sourceFlagName) {
                    if (thisRoom.DeleteMission(i.id))
                        return Colorful(`删除 [掠夺] 房间${roomName}任务成功`, 'green')
                }
            }
            return Colorful(`[签名] 房间${roomName}签名任务失败`, 'red')
        }
    },

}