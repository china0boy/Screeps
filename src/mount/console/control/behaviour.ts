import { LabMap, resourceComDispatch } from "@/constant/ResourceConstant"
import { avePrice, haveOrder, highestPrice, RecognizeLab } from "@/module/fun/funtion"
import { Colorful, compare, isInArray, unzipPosition, zipPosition } from "@/utils"
export default {
    /* 终端行为 */
    terminal: {
        // 默认最多8个传送任务
        send(roomName: string, disRoom: string, rType: ResourceConstant, num: number): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[terminal] 不存在房间${roomName}`
            var thisTask = thisRoom.Public_Send(disRoom, rType, num)
            /* 查看资源是否足够 */
            var terminal_ = Game.getObjectById(thisRoom.memory.StructureIdData.terminalID) as StructureTerminal
            var storage_ = Game.getObjectById(thisRoom.memory.StructureIdData.storageID) as StructureStorage
            if (!terminal_ || !storage_) { delete thisRoom.memory.StructureIdData.terminalID; delete thisRoom.memory.StructureIdData.storageID; return Colorful(`[terminal] 房间${roomName}不存在终端/仓房或记忆未更新！`, 'red', true) }
            /* 查询其他资源传送任务中是否有一样的资源 */
            var Num = 0
            if (!thisRoom.memory.Misson['Structure']) thisRoom.memory.Misson['Structure'] = []
            for (var tM of thisRoom.memory.Misson['Structure']) {
                if (tM.name == '资源传送' && tM.Data.rType == rType) Num += tM.Data.num
            }
            /* 计算资源是否满足 */
            if (terminal_.store.getUsedCapacity(rType) + storage_.store.getUsedCapacity(rType) - Num < num)
                return Colorful(`[terminal] 房间${roomName} 资源${rType} 数量总合少于 ${num}，传送任务挂载失败！`, 'yellow', true)
            /* 计算路费 */
            var cost = Game.market.calcTransactionCost(num, roomName, disRoom)
            if (terminal_.store.getUsedCapacity('energy') + storage_.store.getUsedCapacity('energy') < cost || cost > 150000)
                return Colorful(`[terminal] 房间${roomName}-->${disRoom}资源${rType}所需路费少于 ${cost}或大于150000，传送任务挂载失败！`, 'yellow', true)
            if (thisRoom.AddMission(thisTask))
                return Colorful(`[terminal] 房间${roomName}-->${disRoom}资源${rType}传送挂载成功！数量：${num}；路费：${cost}`, 'green', true)
            return Colorful(`[terminal] 房间${roomName}-->${disRoom}资源${rType}传送 不明原因挂载失败！`, 'red', true)
        },
        Csend(roomName: string, disRoom: string, rType: ResourceConstant): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[terminal] 不存在房间${roomName}`
            for (var tM of thisRoom.memory.Misson['Structure']) {
                if (tM.name == '资源传送' && tM.Data.rType == rType && tM.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(tM.id)) return Colorful(`[terminal] 房间${roomName}-->${disRoom}资源${rType}传送任务删除成功!`, 'blue', true)
                }
            }
            return Colorful(`[terminal] 房间${roomName}-->${disRoom}资源${rType}传送 不明原因删除失败！`, 'red', true)
        },
        //添加资源过多自动转移能量房间
        add(...roomName: string[]): string {
            if (!Memory.sendRoom) Memory.sendRoom = []
            Memory.sendRoom = _.uniq([...Memory.sendRoom, ...roomName])
            return `${roomName} 已添加  已有房间${Memory.sendRoom}`
        },
        remove(...roomName: string[]): string {
            if (!Memory.sendRoom) Memory.sendRoom = []
            Memory.sendRoom = _.difference(Memory.sendRoom, roomName)
            return `${roomName} 已删除  已有房间${Memory.sendRoom}`
        },
        /* 查看目前房间/全局的资源传送任务 */
        show(roomName?: string): string {
            var roomList: string[] = []
            if (roomName) roomList = [roomName]
            else {
                if (!Memory.RoomControlData) Memory.RoomControlData = {}
                for (var rN in Memory.RoomControlData) {
                    roomList.push(rN)
                }
            }
            if (roomList.length <= 0) return `[terminal] 未发现房间！`
            for (var rN of roomList) {
                if (!Game.rooms[rN]) return `[terminal] 不存在房间${rN}！`
            }
            var str = ''
            for (var rN of roomList) {
                if (!Game.rooms[rN].memory.Misson['Structure']) Game.rooms[rN].memory.Misson['Structure'] = []
                if (Game.rooms[rN].MissionNum('Structure', '资源传送') <= 0) continue
                str += '房间 ' + Colorful(`${rN}`, 'yellow', true) + '：\n'
                for (var m of Game.rooms[rN].memory.Misson['Structure']) {
                    if (m.name == '资源传送') {
                        str += '    ' + `-->${m.Data.disRoom} | 资源：${m.Data.rType} | 数量：` + m.Data.num + ' \n'
                    }
                }
            }
            if (str == '') return `[terminal] 未发现资源传送任务！`
            return str
        },
    },

    /* 物流 */
    ter: {
        send(roomName: string, disRoom: string, rType?: ResourceConstant, num?: number): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[ter] 不存在房间${roomName}`
            let thisTask = thisRoom.public_resource_transfer(disRoom, rType ? rType : null, num ? num : null)
            if (thisTask && thisRoom.AddMission(thisTask))
                return Colorful(`[ter] 房间${roomName} --> ${disRoom}资源转移任务已经下达，资源类型:${rType ? rType : "所有资源"} | 数量:${num ? num : "所有"}`, 'green')
            return Colorful(`[ter] 房间${roomName} --> ${disRoom}资源转移任务已经下达失败!`, 'red')
        },
        Csend(roomName: string, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[ter] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Room']) {
                if (i.name == '资源转移' && thisRoom.DeleteMission(i.id))
                    return Colorful(`[ter] 房间${roomName} --(${i.Data.rType})--> ${disRoom}资源转移任务删除成功!`, 'green')
            }
            return Colorful(`[ter] 房间${roomName} --> ${disRoom}资源转移任务删除失败!`, 'red')
        },
        // 查询所有房间的资源转移相关的物流信息
        show(): string {
            let result = `[ter] 资源转移物流信息:\n`
            for (var i in Memory.RoomControlData) {
                if (Game.rooms[i] && Game.rooms[i].controller && Game.rooms[i].controller.my) {
                    let room_ = Game.rooms[i]
                    let task = room_.MissionName('Room', '资源转移')
                    if (task) {
                        result += `${room_.name}->${task.Data.disRoom}: 资源类型:${task.Data.rType ? task.Data.rType : "所有资源"},数量:${task.Data.num ? task.Data.num : '所有'}\n`
                    }
                }
            }
            if (result == `[ter] 资源转移物流信息:\n`) return `[logisitic] 未发现资源转移物流信息`
            return result
        },
    },

    /* 外矿 */
    mine: {
        harvest(roomName: string, x: number, y: number, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[mine] 不存在房间${roomName}`
            var thisTask = thisRoom.public_OutMine(roomName, x, y, disRoom)
            thisTask.maxTime = 8
            if (thisRoom.AddMission(thisTask)) return `[mine] ${roomName} -> ${disRoom} 的外矿任务挂载成功！`
            return `[mine] ${roomName} -> ${disRoom} 的外矿任务挂载失败！`
        },
        Charvest(roomName: string, disRoom: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[mine] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep']) {
                if (i.name == '外矿开采' && i.Data.disRoom == disRoom) {
                    if (thisRoom.DeleteMission(i.id)) {
                        if (Memory.outMineData[disRoom]) delete Memory.outMineData[disRoom]
                        return `[mine] ${roomName} -> ${disRoom} 的外矿任务删除成功！`
                    }
                }
            }
            return `[mine] ${roomName} -> ${disRoom} 的外矿任务删除失败！`
        },
        road(roomName: string): string {
            if (!Game.rooms[roomName]) return `[mine] 不存在相应视野`
            let roads = Game.rooms[roomName].find(FIND_STRUCTURES, {
                filter: (stru) => {
                    return stru.structureType == 'road'
                }
            })
            let cons = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES, {
                filter: (cons) => {
                    return cons.structureType == 'road'
                }
            })
            // 去除road记忆
            for (var i of Memory.outMineData[roomName].road) {
                let pos_ = unzipPosition(i) as RoomPosition
                if (pos_.roomName == roomName && !pos_.GetStructure('road')) {
                    let index = Memory.outMineData[roomName].road.indexOf(i)
                    Memory.outMineData[roomName].road.splice(index, 1)
                }
            }
            let posList = []
            for (let r of roads) posList.push(zipPosition(r.pos))
            for (let c of cons) posList.push(zipPosition(c.pos))
            for (let p of posList) {
                if (!isInArray(Memory.outMineData[roomName].road, p))
                    Memory.outMineData[roomName].road.push(p)
            }
            return `[mine] 已经更新房间${roomName}的外矿信息!`
        },
    },

    /* 市场 */
    market: {
        // 交易订单
        deal(roomName: string, id: string, amount: number): number {
            return Game.market.deal(id, amount, roomName);
        },
        // 查询订单
        look(rType: ResourceConstant, marType: "buy" | "sell"): string {
            var HistoryList = Game.market.getHistory(rType)
            var allNum: number = 0
            for (var ii of HistoryList) {
                allNum += ii.avgPrice
            }
            var avePrice = allNum / HistoryList.length
            var list = Game.market.getAllOrders({ type: marType, resourceType: rType });
            /* 按照价格从上到下 */
            var newList = list.sort(compare('price'))
            var result = `当前市场上资源${rType}的${marType}订单如下:\n`
            if (isInArray(['pixel', 'access_key', 'cpu_unlock'], rType)) {
                for (var i of list) {
                    result += `\tID:${i.id} 数量:${i.amount} 价格:${i.price} 坐标:${i.roomName} \n`
                }
                return result
            }
            for (var i of newList) {
                var priceColor = 'green'
                var roomColor = 'green'
                if (i.price > avePrice && i.price - avePrice > 10) priceColor = 'red'
                if (i.price > avePrice && i.price - avePrice <= 10) priceColor = 'yellow'
                if (i.price <= avePrice) priceColor = 'green'
                LoopB:
                for (var roomName in Memory.RoomControlData) {
                    var cost = Game.market.calcTransactionCost(1000, roomName as string, i.roomName)
                    if (cost >= 7000) { roomColor = 'red'; break LoopB }
                    else if (cost < 700 && cost >= 500) { roomColor = 'yellow'; break LoopB }
                    roomColor = 'green'
                }
                result += `\tID:${i.id} ` + `数量:${i.amount} 价格:` + Colorful(`${i.price}`, priceColor ? priceColor : 'blue', true) + ` 坐标: ` + Colorful(`${i.roomName}`, roomColor ? roomColor : 'blue', true) + ' \n'
            }
            return result
        },
        // 下买订单
        buy(roomName: string, rType: ResourceConstant, price: number, amount: number): string {
            var result = Game.market.createOrder({
                type: 'buy',
                resourceType: rType,
                price: price,
                totalAmount: amount,
                roomName: roomName
            });
            if (result == OK) return `[market] ` + Colorful(`买资源${rType}的订单下达成功！ 数量为${amount},价格为${price}`, 'blue', true)
            else return `[market] ` + Colorful(`买资源${rType}的订单出现错误，不能下达！`, 'red', true)
        },
        // 查询平均价格
        ave(rType: ResourceConstant, day: number = 1): string {
            return `[market] 资源${rType}在近${day}天内的平均价格为${avePrice(rType, day)}`
        },
        // 查询是否有订单
        have(roomName: string, res: ResourceConstant, mtype: "sell" | 'buy', p: number = null, r: number = null): string {
            let result = haveOrder(roomName, res, mtype, p, r)
            if (p)
                return `[market] 房间:${roomName};资源:${res};类型:${mtype}[价格:${p + r}以上]的单子--->${result ? "有" : "没有"}`
            else
                return `[market] 房间:${roomName};资源:${res};类型:${mtype}的单子--->${result ? "有" : "没有"}`
        },
        // 查询市场上的最高价格
        highest(rType: ResourceConstant, mtype: 'sell' | 'buy', mprice: number = 0): string {
            let result = highestPrice(rType, mtype, mprice)
            if (mprice)
                return `[market] 资源:${rType};类型:${mtype} 最高价格${result}[低于${mprice}]`
            else
                return `[market] 资源:${rType};类型:${mtype} 最高价格${result}`
        },
        // 卖资源
        sell(roomName: string, rType: ResourceConstant, mType: 'deal' | 'order', num: number, price?: number, unit: number = 2000): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            if (!thisRoom.memory.market) thisRoom.memory.market = {}
            if (mType == 'order') {
                if (!thisRoom.memory.market['order']) thisRoom.memory.market['order'] = []
                var bR = true
                for (var od of thisRoom.memory.market['order']) {
                    if (od.rType == rType)
                        bR = false
                }
                if (bR) {
                    thisRoom.memory.market['order'].push({ rType: rType, num: num, unit: unit, price: price })
                    return `[market] 房间${roomName}成功下达order的资源卖出指令,type:sell,rType:${rType},num:${num},price${price},unit:${unit}`
                }
                else return `[market] 房间${roomName}已经存在${rType}的sell订单了`
            }
            else if (mType == 'deal') {
                if (!thisRoom.memory.market['deal']) thisRoom.memory.market['deal'] = []
                var bR = true
                for (var od of thisRoom.memory.market['deal']) {
                    if (od.rType == rType)
                        bR = false
                }
                if (bR) {
                    thisRoom.memory.market['deal'].push({ rType: rType, num: num, price: price, unit: unit })
                    return `[market] 房间${roomName}成功下达deal的资源卖出指令,type:sell,rType:${rType},num:${num},price:${price},unit:${unit}`
                }
                else return `[market] 房间${roomName}已经存在${rType}的sell订单了`
            }
            else return `参数错误，重新输入`
        },
        // 查询正在卖的资源
        query(roomName: string): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            let result = `[market] 目前房间${roomName}存在如下资源卖出订单:\n`
            for (var mtype in thisRoom.memory.market)
                for (var i of thisRoom.memory.market[mtype])
                    result += `[${mtype}] 资源:${i.rType} 数量:${i.num}\n`
            return result
        },
        // 取消卖资源
        cancel(roomName: string, mtype: 'order' | 'deal', rType: ResourceConstant): string {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            for (let i of thisRoom.memory.market[mtype]) {
                if (i.rType == rType) {
                    if (mtype == 'order') {
                        if (i.rType != 'energy')
                            delete thisRoom.memory.TerminalData[i.rType]
                        let order = Game.market.getOrderById(i.id)
                        if (order) Game.market.cancelOrder(order.id)
                        var index = thisRoom.memory.market['order'].indexOf(i)
                        thisRoom.memory.market['order'].splice(index, 1)
                        return Colorful(`[market] 房间${roomName}取消资源[${rType}----${mtype}]卖出配置成功`, 'blue')
                    }
                    else {
                        if (i.rType != 'energy')
                            delete thisRoom.memory.TerminalData[i.rType]
                        var index = thisRoom.memory.market['deal'].indexOf(i)
                        thisRoom.memory.market['deal'].splice(index, 1)
                        return Colorful(`[market] 房间${roomName}取消资源[${rType}----${mtype}]卖出配置成功`, 'blue')
                    }
                }
            }
            return Colorful(`[market] 房间${roomName}取消资源[${rType}----${mtype}]卖出配置失败`, 'red')
        },
    },

    /* lab */
    lab: {
        init(roomName: string): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[lab] 未找到房间${roomName},请确认房间!`
            /* 初始化 原先配置清零 */
            myRoom.memory.StructureIdData.labInspect = {}
            let result = RecognizeLab(roomName)
            if (result == null) return `[lab] 房间${roomName}初始化合成lab信息失败!`
            myRoom.memory.StructureIdData.labInspect['raw1'] = result.raw1
            myRoom.memory.StructureIdData.labInspect['raw2'] = result.raw2
            myRoom.memory.StructureIdData.labInspect['com'] = result.com
            let str = ''
            str += `[lab] 房间${roomName}初始化lab信息成功!\n`
            str += `底物lab:\n${result.raw1}\n${result.raw2}\n`
            str += "合成lab:\n"
            for (let i of result.com) str += `${i}\n`
            return str
        },
        compound(roomName: string, res: ResourceConstant, num: number): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[lab] 未找到房间${roomName},请确认房间`
            //初始化
            myRoom.memory.StructureIdData.labInspect = {}
            let result = RecognizeLab(roomName)
            if (result == null) return `[lab] 房间${roomName}初始化合成lab信息失败!`
            myRoom.memory.StructureIdData.labInspect['raw1'] = result.raw1
            myRoom.memory.StructureIdData.labInspect['raw2'] = result.raw2
            myRoom.memory.StructureIdData.labInspect['com'] = result.com

            var thisTask = myRoom.public_Compound(num, res)
            if (thisTask === null) return `[lab] 挂载合成任务失败!`
            if (myRoom.AddMission(thisTask))
                return `[lab] 房间${roomName}合成${res}任务挂载成功! ${thisTask.Data.raw1} + ${thisTask.Data.raw2} = ${res}`
            else
                return `[lab] 房间${roomName}挂载合成任务失败!`
        },
        Ccompound(roomName: string): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[lab] 未找到房间${roomName},请确认房间`
            for (var i of myRoom.memory.Misson['Room']) {
                if (i.name == '资源合成') {
                    if (myRoom.DeleteMission(i.id))
                        return Colorful(`[plan] 房间${roomName}删除资源合成任务成功`, 'green')
                }
            }
            return Colorful(`[war] 房间${roomName}删除资源合成任务失败`, 'red')
        },
        dispatch(roomName: string, res: ResourceConstant, num: number): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[lab] 未找到房间${roomName},请确认房间!`
            if (!resourceComDispatch[res]) return `不存在资源${res}!`
            if (Object.keys(myRoom.memory.ComDispatchData).length > 0) return `[lab] 房间${roomName} 已经存在资源合成调度数据`
            myRoom.memory.ComDispatchData = {}
            //初始化
            myRoom.memory.StructureIdData.labInspect = {}
            let result = RecognizeLab(roomName)
            if (result == null) return `[lab] 房间${roomName}初始化合成lab信息失败!`
            myRoom.memory.StructureIdData.labInspect['raw1'] = result.raw1
            myRoom.memory.StructureIdData.labInspect['raw2'] = result.raw2
            myRoom.memory.StructureIdData.labInspect['com'] = result.com

            for (var i of resourceComDispatch[res]) {
                myRoom.memory.ComDispatchData[i] = { res: i, dispatch_num: num }
            }
            return `[lab] 已经修改房间${roomName}的合成规划数据，为${resourceComDispatch[res]}，数量：${num}`
        },
        Cdispatch(roomName: string): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[lab] 未找到房间${roomName},请确认房间!`
            myRoom.memory.ComDispatchData = {}
            return `[lab] 已经修改房间${roomName}的资源调度数据，为{}.本房见现已无资源合成调度`
        },
    },

    /* obs */
    obs: {
        on(): string {
            for (let roomName in Memory.RoomControlData) {
                let obs = Game.rooms[roomName].memory.observer
                if (obs) delete obs.pause
            }
            return `已开启所有房间的挖过道obs`
        },
        off(): string {
            for (let roomName in Memory.RoomControlData) {
                let obs = Game.rooms[roomName].memory.observer
                if (obs) obs.pause = true
            }
            return `已关闭所有房间的挖过道obs`
        },
        //dp pb          t0 t1 t2 t3
        boost(role: string, resource: string): string {
            if (!role || !resource) return `参数不全，重新输入`;
            for (let roomName in Memory.RoomControlData) {
                let obs = Game.rooms[roomName].memory.observer
                if (obs) {
                    if (resource == 't0') {
                        delete obs.boost[role]
                        return `所有房间${role} 关闭boost`;
                    }
                    else obs.boost[role] = resource;
                }
            }
            return `所有房间${role} 开启boost: ${resource}`;
        },
        stats() {
            for (let roomName in Memory.RoomControlData) {
                let obsMemory = Game.rooms[roomName].memory.observer
                if (obsMemory) {
                    let obs = Game.getObjectById(Game.rooms[roomName].memory.StructureIdData.ObserverID) as StructureObserver
                    console.log(obs.stats())
                }
            }
        },
        setmax(type: 'powerbank' | 'deposit', max: number) {
            for (let roomName in Memory.RoomControlData) {
                let obsMemory = Game.rooms[roomName].memory.observer
                if (obsMemory) {
                    let obs = Game.getObjectById(Game.rooms[roomName].memory.StructureIdData.ObserverID) as StructureObserver
                    console.log(obs.setmax(type, max))
                }
            }
        }

    },
    /* pc */
    pc: {
        option(roomName: string, stru: string): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[power] 未找到房间${roomName},请确认房间!`
            let switch_: string
            switch (stru) {
                case 'storage': { switch_ = 'StopEnhanceStorage'; break; }
                case 'tower': { switch_ = 'StopEnhanceTower'; break; }
                case 'lab': { switch_ = 'StopEnhanceLab'; break; }
                case 'extension': { switch_ = 'StopEnhanceExtension'; break; }
                case 'spawn': { switch_ = 'StopEnhanceSpawn'; break; }
                case 'factory': { switch_ = 'StopEnhanceFactory'; break; }
                case 'powerspawn': { switch_ = 'StopEnhancePowerSpawn'; break; }
                case 'source': { switch_ = 'StopEnhanceSource'; break; }
                default: { return `[power] stru数据错误!` }
            }
            if (!myRoom.memory.switch[switch_]) {
                myRoom.memory.switch[switch_] = true
                return `[power] 房间${roomName}的${switch_}选项调整为true! 将不执行对应的power操作`
            }
            else {
                delete myRoom.memory.switch[switch_]
                return `[power] 房间${roomName}的${switch_}选项调整为false! 将执行对应的power操作`
            }
        },
        show(roomName: string): string {
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[power] 未找到房间${roomName},请确认房间!`
            let list = [
                'StopEnhanceStorage',
                'StopEnhanceTower',
                'StopEnhanceLab',
                'StopEnhanceExtension',
                'StopEnhanceFactory',
                'StopEnhancePowerSpawn',
                'StopEnhanceSource'
            ]
            let result = `[power] 房间${roomName}的power操作开关:\n`
            for (var i of list) {
                if (myRoom.memory.switch[i]) result += Colorful(`${i}:true\n`, 'red', true)
                else result += Colorful(`${i}:false\n`, 'green', true)
            }
            return result
        }
    }
}