import { t3 } from "@/constant/ResourceConstant"
import { Colorful, compare, isInArray } from "@/utils"
import { loop } from "@/main"
import { avePrice, haveOrder, highestPrice } from "@/module/fun/funtion"

// terminal 扩展
export default class terminalExtension extends StructureTerminal {
    public ManageMission(): void {
        if (this.room.MissionNum('Creep', '急速冲级') > 0 || this.room.controller.level < 6) return   // 急速冲级状态下停止terminal功能
        let allmyTask: MissionModel[] = []
        for (let task of this.room.memory.Misson['Structure']) {
            if (!task.structure) continue
            if (isInArray(task.structure, this.id)) {
                allmyTask.push(task)
            }
        }
        let thisTask: MissionModel = null
        /* 按照优先级排序 */
        if (allmyTask.length >= 1)
            allmyTask.sort(compare('level'))

        let a = 1;
        for (let i = 0; i <= 1; i++) {
            thisTask = allmyTask[i]
            if (thisTask && isInArray(['资源传送'], thisTask.name)) {
                a = 0; break
            }
        }
        for (let i = 0; i <= 1; i++) {
            thisTask = allmyTask[i]
            if (!thisTask || !isInArray(['资源传送'], thisTask.name)) {
                /* terminal默认操作*/
                if (a) this.ResourceBalance()  // 资源平衡
                this.ResourceMarket()   // 资源买卖
                if (!thisTask) return
            }
            if (thisTask.delayTick < 99995)
                thisTask.processing = true
            switch (thisTask.name) {
                case "资源传送": { this.ResourceSend(thisTask); break }
                case "资源购买": { this.ResourceDeal(thisTask); break }
            }
        }
    }

    /**
     * 资源平衡函数，用于平衡房间中资源数量以及资源在terminal和storage中的分布，尤其是能量和原矿
     */
    public ResourceBalance(): void {
        this.RsourceMemory()
        // terminal资源平衡
        if (Game.time % 7) return
        let storage_ = this.room.storage
        if (!storage_) { return }
        let anytype = Object.keys(this.store)
        for (let i in this.room.memory.TerminalData) if (i) anytype = _.uniq([...anytype, i])//把所有资源遍历一遍
        for (let i of anytype) {
            if (this.room.RoleMissionNum('manage', '物流运输') >= 1) return
            let num = this.store[i]     // 数量
            if (!this.room.memory.TerminalData[i] || !this.room.memory.TerminalData[i].num)  // terminalData里没有该数据
            {
                if (storage_.store.getFreeCapacity() < 10000) continue
                let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 20, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num)
                this.room.AddMission(thisTask)
            }
            else {
                if (num > this.room.memory.TerminalData[i].num) {
                    if (storage_.store.getFreeCapacity() < 10000) continue
                    let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 20, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num - this.room.memory.TerminalData[i].num)
                    this.room.AddMission(thisTask)
                }
            }
        }
        for (let i of anytype) {
            if (this.room.RoleMissionNum('manage', '物流运输') >= 1) return
            if (!this.room.memory.TerminalData[i] || !this.room.memory.TerminalData[i].fill) continue
            let num = this.store.getUsedCapacity(i as ResourceConstant)
            if (num < this.room.memory.TerminalData[i].num) {
                if (this.store.getFreeCapacity() < 5000) continue
                if (i == 'energy') {
                    if (storage_.store.getUsedCapacity('energy') <= 20000) continue
                }
                else {
                    if (storage_.store.getUsedCapacity(i as ResourceConstant) <= 0 && storage_.store.getUsedCapacity(i as ResourceConstant) + num < this.room.memory.TerminalData[i].num) continue
                }
                let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 20, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, i as ResourceConstant, Math.abs(this.room.memory.TerminalData[i].num - num))
                this.room.AddMission(thisTask)
            }
        }
    }

    /**
     * 资源记忆更新函数
     * */
    public RsourceMemory(): void {
        /* terminal自身资源管理 */
        let terminalData = this.room.memory.TerminalData
        for (let i in terminalData) {
            /* 数量小于0就删除数据，节省memory */
            if (terminalData[i].num <= 0) delete terminalData[i]
        }
    }

    /**
     * 资源买卖函数 只买能量、挂单、卖 (不deal买资源)
     */
    public ResourceMarket(): void {
        let storage_ = this.room.storage
        if (!storage_) { return }
        if ((Game.time - global.Gtime[this.room.name]) % 27 == 0) {
            //* 清理过期订单 */
            if ((Game.time - global.Gtime[this.room.name]) % 100 == 0 && Object.keys(Game.market.orders).length > 40) {
                for (let j in Game.market.orders) {
                    let order = Game.market.getOrderById(j)
                    if (!order.remainingAmount) Game.market.cancelOrder(j)
                }
            }
            let energyNum = storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy')
            // 能量自动购买区 [与MarketData无关] storage内能量小于200000时 优先从别的房间能量多的房间获取，获取不到就购买能量
            if (energyNum < 200000) {
                /* 先从能量多的房间获取能量，获取不到就购买 */
                let toRoom: Room;
                for (let name in Memory.RoomControlData) {
                    let room = Game.rooms[name];
                    if (room && room.controller.my && room != this.room && room.terminal) {
                        let storage = room.storage;
                        if (storage && storage.store.energy >= 300000 && room.MissionNum('Creep', '急速冲级') <= 0) {
                            if (toRoom) {
                                if (storage.store.energy > toRoom.storage.store.energy) toRoom = room
                            }
                            else toRoom = room
                        }
                    }
                }
                if (toRoom) {
                    if (toRoom.MissionNum('Structure', '资源传送') <= 0) {
                        if (toRoom.AddMission(toRoom.Public_Send(this.pos.roomName, 'energy', 50000))) console.log(Colorful(`房间${this.pos.roomName}能量太少 房间${toRoom.name}-->${this.pos.roomName}资源: energy 传送挂载成功! 数量: 50000`, 'orange', true))
                        else console.log(Colorful(`房间${this.pos.roomName}能量太少 房间${toRoom.name}-->${this.pos.roomName}资源: energy 传送挂载失败! 数量: 50000`, 'red', true))
                    }
                }
                else {
                    //购买能量
                    if (Game.market.credits >= 10000000)
                        this.OrderEnergy('energy', 10000, 60 - energyNum / 10000);// energyNum <= 80000 ? 60 - energyNum / 10000 : 20 - energyNum / 10000
                }
            }

            /* 仓库资源过于饱和就卖掉能量 或者转移*/
            if (storage_.store.getFreeCapacity() < 70000 && storage_.store.getCapacity() >= storage_.store.getUsedCapacity()) {
                /* 先转移到空间大的房间 */
                if (storage_.store.energy + this.store.energy >= 50000) {
                    let toRoom: string;
                    //先找自己的房间
                    for (let name in Memory.RoomControlData) {
                        let room = Game.rooms[name];
                        if (room && room.controller.my && room.controller.level >= 6 && room != this.room && room.terminal) {
                            let storage = room.storage;
                            if (storage && storage.store.getFreeCapacity() >= 200000) {
                                if (toRoom) {
                                    if (storage.store.getFreeCapacity() > Game.rooms[toRoom].storage.store.getFreeCapacity()) toRoom = room.name
                                }
                                else toRoom = room.name
                            }
                        }
                    }

                    //在找别的房间
                    if (!toRoom && Memory.sendRoom) {
                        let inde = Math.floor(Math.random() * (Memory.sendRoom.length))
                        toRoom = Memory.sendRoom[inde]
                    }

                    // 找到storage里最多的资源
                    let max = 0;
                    let maxType: ResourceConstant;
                    let amountToTransfer = 50000; // 更新要转移的资源量
                    for (let i in storage_.store) {
                        if (storage_.store[i] > max) {
                            max = storage_.store[i]
                            maxType = i as ResourceConstant
                        }
                    }
                    if (storage_.store[maxType] < amountToTransfer) amountToTransfer = storage_.store[maxType]
                    // 转移资源
                    if (toRoom && this.room.MissionNum('Structure', '资源传送') <= 0) {

                        if (this.room.AddMission(this.room.Public_Send(toRoom, maxType, amountToTransfer))) {
                            console.log(Colorful(`房间${this.pos.roomName}资源太多 房间${this.pos.roomName}-->${toRoom}资源: ${maxType} 传送挂载成功! 数量: ${amountToTransfer}`, 'orange', true));
                        } else {
                            console.log(Colorful(`房间${this.pos.roomName}资源太多 房间${this.pos.roomName}-->${toRoom}资源: ${maxType} 传送挂载失败! 数量: ${amountToTransfer}`, 'red', true));
                        }
                    }
                }
                /* 如果仓库饱和(小于 空间)，而且仓库能量超过  ,就卖能量 */
                if (storage_.store.getFreeCapacity() < 40000 && storage_.store.energy > 500000) {
                    if (!this.room.memory.market) this.room.memory.market = {}
                    if (!this.room.memory.market['deal']) this.room.memory.market['deal'] = []
                    let bR = true
                    for (let od of this.room.memory.market['deal']) {
                        if (od.rType == 'energy')
                            bR = false
                    }
                    if (bR) {
                        /* 下达自动deal的任务 */
                        this.room.memory.market['deal'].push({ rType: 'energy', num: 100000, price: 20 })
                    }
                }
            }
        }
        // 其他类型资源的交易 【考虑到已经有了资源调度模块的存在，这里主要是卖】
        LoopA:
        for (let t in this.room.memory.market) {
            // deal类型
            if (t == 'deal') {
                if (this.cooldown || Game.time % 5) return
                if (this.store.getUsedCapacity('energy') < 40000) continue LoopA // terminal空闲资源过少便不会继续
                LoopB:
                for (let i of this.room.memory.market['deal']) {
                    if (i.rType != 'energy') {
                        this.room.memory.TerminalData[i.rType] = { num: i.unit ? i.unit : 5000, fill: true }
                    }
                    /* 数量少了就删除 */
                    if (i.num <= 0) {
                        if (i.rType != 'energy')
                            delete this.room.memory.TerminalData[i.rType]
                        let index = this.room.memory.market['deal'].indexOf(i)
                        this.room.memory.market['deal'].splice(index, 1)
                        continue LoopB
                    }
                    if (this.cooldown) continue LoopA   // 冷却模式下进行不了其他deal了
                    let a = 1, b = 30000;//a<=单子的资源数量<=b
                    (COMMODITIES[i.rType] && COMMODITIES[i.rType].level) ? a = 0 : a//防止商品单搜不到
                    let orders = Game.market.getAllOrders(order => order.resourceType == i.rType && i.price <= order.price &&
                        order.type == ORDER_BUY && order.amount >= a)
                    if (orders.length <= 0) continue LoopB
                    /* 按价格从低到高排列 */
                    let newOrderList = orders.sort(compare('price'))
                    // 倒数第1
                    if (newOrderList.length <= 0) continue LoopB
                    let thisDealOrder = newOrderList[newOrderList.length - 1]
                    if (!thisDealOrder) continue LoopB
                    if (storage_.store.getUsedCapacity(i.rType) <= 0 && !this.store[i.rType] && this.room.RoleMissionNum('manage', '物流运输') <= 0) {
                        if (i.rType != 'energy')
                            delete this.room.memory.TerminalData[i.rType]
                        let index = this.room.memory.market['deal'].indexOf(i)
                        this.room.memory.market['deal'].splice(index, 1)
                        continue LoopB
                    }
                    if (thisDealOrder.amount >= this.store.getUsedCapacity(i.rType)) {
                        if (i.num > this.store.getUsedCapacity(i.rType)) {
                            Game.market.deal(thisDealOrder.id, this.store.getUsedCapacity(i.rType), this.room.name)
                            i.num -= this.store.getUsedCapacity(i.rType)
                        }
                        else {
                            Game.market.deal(thisDealOrder.id, i.num, this.room.name)
                            i.num = 0
                        }
                        break LoopA
                    }
                    else {
                        if (i.num > thisDealOrder.amount) {
                            Game.market.deal(thisDealOrder.id, thisDealOrder.amount, this.room.name)
                            i.num -= thisDealOrder.amount
                        }
                        else {
                            Game.market.deal(thisDealOrder.id, i.num, this.room.name)
                            i.num = 0
                        }
                        break LoopA
                    }
                }
            }
            // order类型
            else if (t == 'order') {
                if (Game.time % 20) return
                LoopC:
                for (let l of this.room.memory.market['order']) {
                    if (l.rType != 'energy') {
                        this.room.memory.TerminalData[l.rType] = { num: l.unit ? l.unit : 5000, fill: true }
                    }
                    // 查询有无订单
                    if (!l.id) {
                        let myOrder = haveOrder(this.room.name, l.rType, 'sell')
                        if (!myOrder) {
                            console.log(Colorful(`[market] 房间${this.room.name}-rType:${l.rType}创建订单!`, 'yellow'))
                            // 计算数量
                            let addnum = 50000 > l.num ? l.num : 50000
                            // 没有就创建订单
                            let result = Game.market.createOrder({
                                type: ORDER_SELL,
                                resourceType: l.rType,
                                price: l.price,
                                totalAmount: addnum,
                                roomName: this.room.name
                            });
                            l.num -= addnum
                            if (result != OK) continue LoopC
                        }
                        else {
                            l.id = myOrder.id
                            continue LoopC
                        }
                    }
                    else {
                        let order = Game.market.getOrderById(l.id)
                        if (!order || !order.remainingAmount)   // 取消订单信息
                        {
                            if (l.num > 0) {
                                let addnum = 50000 > l.num ? l.num : 50000
                                // 更新订单
                                if (Game.market.extendOrder(l.id, addnum) == 0) l.num -= addnum
                            }
                            else {
                                if (l.rType != 'energy')
                                    delete this.room.memory.TerminalData[l.rType]
                                console.log(Colorful(`[market] 房间${this.room.name}订单ID:${l.id},rType:${l.rType}的删除订单!`, 'blue'))
                                let index = this.room.memory.market['order'].indexOf(l)
                                this.room.memory.market['order'].splice(index, 1)
                                // 取消订单
                                Game.market.cancelOrder(l.id)
                                continue LoopC
                            }
                        }
                        // 价格
                        let price = order.price
                        let standprice = l.price
                        // 价格太低或太高都会改变订单价格
                        if (standprice <= price / 3 || standprice >= price * 3) {
                            Game.market.changeOrderPrice(l.id, l.price)
                            console.log(`[market] 房间${this.room.name}改变订单ID:${l.id},type:${l.rType}的价格为${l.price}`)
                        }
                        // 收到改变价格指令，也会改变订单价格
                        if (l.changePrice) {
                            Game.market.changeOrderPrice(l.id, l.price)
                            console.log(`[market] 房间${this.room.name}改变订单ID:${l.id},type:${l.rType}的价格为${l.price}`)
                            l.changePrice = false
                        }
                    }
                }
            }
        }
    }

    /**
     * 创建资源平衡
     */
    public CreatingResourceBalance(type: ResourceConstant, num: number = 5000, fill: boolean = true): void {
        this.room.memory.TerminalData[type] = { num: num, fill: fill };
    }

    /**
     * 资源平衡初始化
     */
    public init(num: number = 5000, fill: boolean = true): void {
        for (let i = 0; i < t3.length; i++) {
            this.room.memory.TerminalData[t3[i]] = { num: num, fill: fill };
        }
    }

    /**
     * 资源传送
     */
    public ResourceSend(task: MissionModel): void {
        if (this.cooldown && this.cooldown > 0) return
        if (!task.Data || !task.Data.disRoom)       // 任务数据有问题
        {
            this.room.DeleteMission(task.id)
            return
        }
        if (!task.state) task.state = 1     // 1状态下，搜集资源
        if (task.state == 1) {
            if (Game.time % 5) return  /* 每10tick监测一次 */
            if (task.Data.num <= 0 || task.Data.num == undefined) this.room.DeleteMission(task.id)
            if (this.room.RoleMissionNum('manage', '物流运输') > 0) return // manage爬虫有任务时就不管
            // 路费
            let wastage = Game.market.calcTransactionCost(task.Data.num, this.room.name, task.Data.disRoom)
            /* 如果非能量资源且路费不够，发布资源搬运任务，优先寻找storage */
            let storage_ = this.room.storage
            if (!storage_) if (!storage_) {
                this.room.DeleteMission(task.id)
                return
            }
            // terminal的剩余资源
            let remain = this.store.getFreeCapacity()
            /* 路费判断 */
            if (wastage > this.store.getUsedCapacity('energy')) {
                /* 只有在能量富裕的情况下才会允许进入下一阶段 */
                if (storage_ && (storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy') - 5000) > wastage && remain > (wastage - this.store.getUsedCapacity('energy'))) {
                    /* 下布搬运任务 */
                    let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, 'energy', wastage - this.store.getUsedCapacity('energy'))
                    this.room.AddMission(thisTask)
                    return
                }
                /* 条件不满足就自动删除任务 */
                this.room.DeleteMission(task.id)
                return
            }
            /* 资源判断 */
            let cargoNum: number = task.Data.rType == 'energy' ? this.store.getUsedCapacity(task.Data.rType) - wastage : this.store.getUsedCapacity(task.Data.rType)
            console.log(`<div style="width:530px;height:200px;margin:5px;line-height:20px;border:1px solid #ffce00;background-image:radial-gradient(circle, #ffce00, #ffc200, #ffb500, #ffa900, #ff9c00, #fba000, #f8a500, #f4a900, #e8bf00, #d4d400, #b7ea00, #8bff00);"><h3 style="color:blue;text-align: center;" >资源传送任务监控中</h3><hr width=100% size=100% color=pink><h5 style="color:#a200ff">
房间：${this.room.name}--->${task.Data.disRoom}\t运送资源：${task.Data.rType}

路费:${wastage} energy \t终端拥有能量:${this.store.energy} energy<hr width=100% size=100% color=pink>
终端拥有资源量:${cargoNum}\t仓库拥有资源量:${storage_.store.getUsedCapacity(task.Data.rType)}\t任务所需资源量:${task.Data.num}<hr width=100% size=100% color=pink><h5><div>`)
            if (task.Data.num > cargoNum) {
                let MaxStore: number;
                switch (this.room.controller.level) {
                    case 6: MaxStore = 800;
                    case 7: MaxStore = 1000;
                    case 8: MaxStore = 2450;
                }
                if (MaxStore && storage_ && (storage_.store.getUsedCapacity(task.Data.rType) + this.store.getUsedCapacity(task.Data.rType)) >= (task.Data.num - MaxStore) && remain > task.Data.num - cargoNum) {
                    /* 下布搬运任务 */
                    let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, task.Data.rType, task.Data.num - cargoNum)
                    this.room.AddMission(thisTask)
                    return
                }
                /* 条件不满足就自动删除任务 */
                this.room.DeleteMission(task.id)
                return
            }
            /* 都满足条件了就进入状态2 */
            task.state = 2
        }
        else if (task.state == 2) {
            let result = this.send(task.Data.rType as ResourceConstant, task.Data.num, task.Data.disRoom as string)
            if (result == -6)   /* 能量不够就重新返回状态1 */ {
                console.log(Colorful(`房间${this.room.name}发送资源${task.Data.rType}失败!`, 'read', true))
                task.state = 1
                return
            }
            else if (result == OK) {
                /* 如果传送成功，就删除任务 */
                this.room.DeleteMission(task.id)
                return
            }
        }
    }

    /**
     * 资源购买 (deal)
     */
    public ResourceDeal(task: MissionModel): void {
        if (Game.shard.name == 'shard3') {
            if ((Game.time - global.Gtime[this.room.name]) % 10) return
        }
        else {
            if ((Game.time - global.Gtime[this.room.name]) % 5) return
        }
        if (this.cooldown) return
        if (!task.Data) { this.room.DeleteMission(task.id); return }
        let Data = task.Data;
        let money = Game.market.credits
        if (money <= 0) { this.room.DeleteMission(task.id); return }
        let rType = Data.rType
        let num = Data.num
        if (Data.type == 'deal') {
            if (this.store.getUsedCapacity('energy') < 50000) return
            let allNum: number = 0
            let avePrice
            if (task.Data.maxPrice) {
                avePrice = task.Data.maxPrice
            }
            else {
                let HistoryList = Game.market.getHistory(rType)
                let HistoryLength = HistoryList.length;
                if (HistoryLength < 3) { console.log(`市场资源${rType}的订单太少，无法购买!`); return }
                // 平均价格 [近3天]
                for (let iii = HistoryLength - 3; iii < HistoryLength; iii++) {
                    allNum += HistoryList[iii].avgPrice
                }
                avePrice = allNum / 3
            }
            // 获取该资源的平均价格
            let maxPrice = avePrice + (task.Data.range ? task.Data.range : 50)  // 范围
            /* 在市场上寻找 */
            let orders = Game.market.getAllOrders(order => order.resourceType == rType &&
                order.type == ORDER_SELL && order.price <= maxPrice)
            if (orders.length <= 0) return
            /* 寻找价格最低的 */
            let lowestPriceOrder: Order | undefined;
            for (let order of orders) {
                if (!lowestPriceOrder || order.price < lowestPriceOrder.price) {
                    lowestPriceOrder = order;
                }
            }
            if (!lowestPriceOrder) return;
            if (lowestPriceOrder.amount >= num) {
                if (Game.market.deal(lowestPriceOrder.id, num, this.room.name) == OK) {
                    this.room.DeleteMission(task.id)
                    return
                }
            } else {
                if (Game.market.deal(lowestPriceOrder.id, lowestPriceOrder.amount, this.room.name) == OK) {
                    task.Data.num -= lowestPriceOrder.amount
                }
                return
            }
        }
        else if (Data.type == 'sell') {
            let thisRoomOrder: Order;
            for (let i in Game.market.orders) {
                let Order = Game.market.orders[i];
                if (Order.roomName == this.room.name && Order.type == 'buy' && Order.resourceType == Data.rType && Order.remainingAmount <= 0 && Data.num <= 0) { thisRoomOrder = Order; break; }
            }
            if (thisRoomOrder) {
                this.room.DeleteMission(task.id);
                Game.market.cancelOrder(thisRoomOrder.id)
                return
            }
            else this.OrderEnergy(Data.rType, Data.num, task.Data.maxPrice, task)
        } else this.room.DeleteMission(task.id);

    }


    /**
     * 动态创建市场最高购买订单 
     * @param type 资源类型
     * @param num 购买数量
     * @param max 接受最大价格
     * @returns 
     */
    public OrderEnergy(type: MarketResourceConstant, num: number, max: number, task?: MissionModel): string {
        let maxPrice = 0;
        if (type != "energy" || (type == "energy" && this.room.storage.store.getUsedCapacity("energy") + this.store.getUsedCapacity("energy") < 80000)) {
            let history = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: type });
            let amount = 0
            switch (type) {
                case "energy": amount = 10000; break;
                case "power": amount = 1000; break;
                default: amount = 10000; break;
            }
            for (let i = 0; i < history.length; i++) {
                if (history[i].price > maxPrice && history[i].price <= max && !(history[i].roomName in Memory.RoomControlData) && history[i].amount > amount) { maxPrice = history[i].price + 0.001; }//符合条件
            }
        } else {
            // 计算能量均价
            maxPrice = avePrice(type, 3);
        }
        /* 判断有无自己的订单 */
        let thisOrder = Game.market.orders;
        let thisRoomOrder: Order;
        for (let i in thisOrder) {
            let Order = thisOrder[i];
            if (Order.roomName == this.room.name && Order.type == 'buy' && Order.resourceType == type) { thisRoomOrder = Order; break; }
        }
        if (maxPrice <= 0) maxPrice = 0.001;
        /* 没有就创建订单 或者添加容量 ，有就更新最高价格*/
        if (!thisRoomOrder) {
            // 限制最大购买数量
            let buyNum: number = 0;
            if (num >= 50000) {
                buyNum = 50000
            }
            else buyNum = num
            console.log(`[${type}] 订单创建中`)
            if (
                Game.market.createOrder({
                    type: ORDER_BUY,
                    resourceType: type,
                    price: maxPrice,
                    totalAmount: buyNum,
                    roomName: this.room.name
                }) == 0
            ) {
                if (task) task.Data.num -= buyNum
                return `房间${this.room.name}:${type}不足,创建订单  价格:${maxPrice} 数量:${num}`
            }
            else { return `房间${this.room.name}:${type}不足,创建订单失败` }
        }
        else {
            if (task && thisRoomOrder.remainingAmount <= 20000) {
                let addNum = 50000 - thisRoomOrder.remainingAmount
                if (addNum > task.Data.num) addNum = task.Data.num
                Game.market.extendOrder(thisRoomOrder.id, addNum);//添加容量
                task.Data.num -= addNum
            }
            //更新价格
            Game.market.changeOrderPrice(thisRoomOrder.id, maxPrice)
        }
    }

}