import { t3 } from "@/constant/ResourceConstant"
import { Colorful, compare, isInArray } from "@/utils"
import { loop } from "@/main"
import { avePrice, haveOrder, highestPrice } from "@/module/fun/funtion"

// terminal 扩展
export default class terminalExtension extends StructureTerminal {
    public ManageMission(): void {
        if (this.room.MissionNum('Creep', '急速冲级') > 0) return   // 急速冲级状态下停止terminal功能
        var allmyTask = []
        for (var task of this.room.memory.Misson['Structure']) {
            if (!task.structure) continue
            if (isInArray(task.structure, this.id)) {
                allmyTask.push(task)
            }
        }
        let thisTask = null
        /* 按照优先级排序 */
        if (allmyTask.length >= 1)
            allmyTask.sort(compare('level'))
        thisTask = allmyTask[0]
        if (!thisTask || !isInArray(['资源传送'], thisTask.name)) {
            /* terminal默认操作*/
            this.ResourceBalance()  // 资源平衡
            this.ResourceMarket()   // 资源买卖
            if (!thisTask) return
        }
        if (thisTask.delayTick < 99995)
            thisTask.delayTick--
        switch (thisTask.name) {
            case "资源传送": { this.ResourceSend(thisTask); break }
            case "资源购买": { this.ResourceDeal(thisTask); break }
        }
    }

    /**
     * 资源平衡函数，用于平衡房间中资源数量以及资源在terminal和storage中的分布，尤其是能量和原矿
     */
    public ResourceBalance(): void {
        this.RsourceMemory()
        // terminal资源平衡
        if (Game.time % 7) return
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        if (!storage_) { console.log(`找不到global.Stru['${this.room.name}']['storage]!`); return }
        var anytype = Object.keys(this.store)
        for (let i in this.room.memory.TerminalData) if (i) anytype = _.uniq([...anytype, i])//把所有资源遍历一遍
        for (var i of anytype) {
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
        for (var i of anytype) {
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
        var terminalData = this.room.memory.TerminalData
        for (var i in terminalData) {
            /* 数量小于0就删除数据，节省memory */
            if (terminalData[i].num <= 0) delete terminalData[i]
        }
    }

    /**
     * 资源买卖函数 只买能量、挂单、卖 (不deal买资源)
     */
    public ResourceMarket(): void {
        if ((Game.time - global.Gtime[this.room.name]) % 27) return
        //* 清理过期订单 */
        if (Object.keys(Game.market.orders).length > 40) {
            for (let j in Game.market.orders) {
                let order = Game.market.getOrderById(j)
                if (!order.remainingAmount) Game.market.cancelOrder(j)
            }
        }
        // 能量自动购买区 [与MarketData无关] storage内能量小于200000时自动购买
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        if (!storage_) { console.log(`找不到global.Stru['${this.room.name}']['storage]!`); return }
        if (storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy') < 200000) {
            //购买能量
            this.OrderEnergy('energy', 50000, 4);
        }
        /* 仓库资源过于饱和就卖掉能量 */
        if (storage_.store.getFreeCapacity() < 50000) {
            /* 如果仓库饱和(小于200k空间)，而且仓库能量超过400K,就卖能量 */
            if (storage_.store.getFreeCapacity() < 200000 && storage_.store.getUsedCapacity('energy') > 350000) {
                if (!this.room.memory.market) this.room.memory.market = {}
                if (!this.room.memory.market['deal']) this.room.memory.market['deal'] = []
                var bR = true
                for (var od of this.room.memory.market['deal']) {
                    if (od.rType == 'energy')
                        bR = false
                }
                if (bR) {
                    /* 下达自动deal的任务 */
                    this.room.memory.market['deal'].push({ rType: 'energy', num: 100000 })
                }
            }
        }
        // 其他类型资源的交易 【考虑到已经有了资源调度模块的存在，这里主要是卖】
        LoopA:
        for (var t in this.room.memory.market) {
            // deal类型
            if (t == 'deal') {
                if (this.store.getUsedCapacity('energy') < 50000) continue LoopA // terminal空闲资源过少便不会继续
                LoopB:
                for (var i of this.room.memory.market['deal']) {
                    if (i.rType != 'energy') {
                        this.room.memory.TerminalData[i.rType] = { num: i.unit ? i.unit : 5000, fill: true }
                    }
                    /* 数量少了就删除 */
                    if (i.num <= 0) {
                        if (i.rType != 'energy')
                            delete this.room.memory.TerminalData[i.rType]
                        var index = this.room.memory.market['deal'].indexOf(i)
                        this.room.memory.market['deal'].splice(index, 1)
                        continue LoopB
                    }
                    if (this.cooldown) continue LoopA   // 冷却模式下进行不了其他deal了
                    let a = 1000, b = 30000;
                    COMMODITIES[i.rType] && COMMODITIES[i.rType].level ? a = 0 : a//防止商品单搜不到
                    var orders = Game.market.getAllOrders(order => order.resourceType == i.rType && i.price <= order.price &&
                        order.type == ORDER_BUY && order.amount >= a && order.amount <= b)
                    if (orders.length <= 0) continue LoopB
                    /* 按价格从低到高排列 */
                    var newOrderList = orders.sort(compare('price'))
                    // 倒数第二 没有就倒数第一
                    var thisDealOrder = newOrderList.length > 1 ? newOrderList[newOrderList.length - 2] : newOrderList[newOrderList.length - 1]
                    if (!thisDealOrder) continue LoopB
                    if (storage_.store.getUsedCapacity(i.rType) <= 0 && !this.store[i.rType] && this.room.RoleMissionNum('manage', '物流运输') <= 0) {
                        if (i.rType != 'energy')
                            delete this.room.memory.TerminalData[i.rType]
                        var index = this.room.memory.market['deal'].indexOf(i)
                        this.room.memory.market['deal'].splice(index, 1)
                        continue LoopB
                    }
                    if (thisDealOrder.amount >= this.store.getUsedCapacity(i.rType)) {
                        Game.market.deal(thisDealOrder.id, this.store.getUsedCapacity(i.rType), this.room.name)
                        i.num -= this.store.getUsedCapacity(i.rType)
                        break LoopA
                    }
                    else {
                        Game.market.deal(thisDealOrder.id, thisDealOrder.amount, this.room.name)
                        i.num -= thisDealOrder.amount
                        break LoopA
                    }
                }
            }
            // order类型
            else if (t == 'order') {
                LoopC:
                for (var l of this.room.memory.market['order']) {
                    if (l.rType != 'energy') {
                        this.room.memory.TerminalData[l.rType] = { num: l.unit ? l.unit : 5000, fill: true }
                    }
                    // 查询有无订单
                    if (!l.id) {
                        let myOrder = haveOrder(this.room.name, l.rType, 'sell')
                        if (!myOrder) {
                            console.log(Colorful(`[market] 房间${this.room.name}-rType:${l.rType}创建订单!`, 'yellow'))
                            // 没有就创建订单
                            let result = Game.market.createOrder({
                                type: ORDER_SELL,
                                resourceType: l.rType,
                                price: l.price,
                                totalAmount: l.num,
                                roomName: this.room.name
                            });
                            if (result != OK) continue LoopC
                        }
                        LoopO:
                        for (let o in Game.market.orders) {
                            let order = Game.market.getOrderById(o);
                            if (order.remainingAmount <= 0) { Game.market.cancelOrder(o); continue LoopO; }
                            if (order.roomName == this.room.name && order.resourceType == l.rType && order.type == 'sell')
                                l.id = o
                        }
                        continue LoopC
                    }
                    else {
                        let order = Game.market.getOrderById(l.id)
                        if (!order || !order.remainingAmount)   // 取消订单信息
                        {
                            if (l.rType != 'energy')
                                delete this.room.memory.TerminalData[l.rType]
                            console.log(Colorful(`[market] 房间${this.room.name}订单ID:${l.id},rType:${l.rType}的删除订单!`, 'blue'))
                            var index = this.room.memory.market['order'].indexOf(l)
                            this.room.memory.market['order'].splice(index, 1)
                            continue LoopC
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
            if (Game.time % 10) return  /* 每10tick监测一次 */
            if (task.Data.num <= 0 || task.Data.num == undefined) this.room.DeleteMission(task.id)
            if (this.room.RoleMissionNum('manage', '物流运输') > 0) return // manage爬虫有任务时就不管
            // 路费
            var wastage = Game.market.calcTransactionCost(task.Data.num, this.room.name, task.Data.disRoom)
            /* 如果非能量资源且路费不够，发布资源搬运任务，优先寻找storage */
            var storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
            // terminal的剩余资源
            var remain = this.store.getFreeCapacity()
            /* 路费判断 */
            if (wastage > this.store.getUsedCapacity('energy')) {
                /* 只有在能量富裕的情况下才会允许进入下一阶段 */
                if (storage_ && (storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy') - 5000) > wastage && remain > (wastage - this.store.getUsedCapacity('energy'))) {
                    /* 下布搬运任务 */
                    var thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, 'energy', wastage - this.store.getUsedCapacity('energy'))
                    this.room.AddMission(thisTask)
                    return
                }
                /* 条件不满足就自动删除任务 */
                this.room.DeleteMission(task.id)
                return
            }
            /* 资源判断 */
            var cargoNum: number = task.Data.rType == 'energy' ? this.store.getUsedCapacity(task.Data.rType) - wastage : this.store.getUsedCapacity(task.Data.rType)
            console.log(
                Colorful(`                     资源传送任务监控中\n`, 'blue') +
                Colorful(`———————————————————————————————————————————————————————————\n`, 'blue') +
                Colorful(`房间：${this.room.name}--->${task.Data.disRoom}  运送资源：${task.Data.rType}\n`, 'blue') +
                Colorful(`———————————————————————————————————————————————————————————\n`, 'blue') +
                Colorful(`路费:${wastage} energy\t终端拥有能量:${this.store.getUsedCapacity('energy')} energy\n`, 'blue') +
                Colorful(`终端拥有资源量:${cargoNum}\t仓库拥有资源量:${storage_.store.getUsedCapacity(task.Data.rType)}\t任务所需资源量:${task.Data.num}\n`, 'blue') +
                Colorful(`———————————————————————————————————————————————————————————\n`, 'blue'))
            if (task.Data.num > cargoNum) {
                let MaxStore: number;
                switch (this.room.controller.level) {
                    case 6: MaxStore = 800;
                    case 7: MaxStore = 1000;
                    case 8: MaxStore = 2450;
                }
                if (MaxStore && storage_ && (storage_.store.getUsedCapacity(task.Data.rType) + this.store.getUsedCapacity(task.Data.rType)) >= (task.Data.num - MaxStore) && remain > task.Data.num - cargoNum) {
                    /* 下布搬运任务 */
                    var thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, task.Data.rType, task.Data.num - cargoNum)
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
        if ((Game.time - global.Gtime[this.room.name]) % 10) return
        if (this.cooldown || this.store.getUsedCapacity('energy') < 50000) return
        if (!task.Data) { this.room.DeleteMission(task.id); return }
        let money = Game.market.credits
        if (money <= 0 || task.Data.num > 50000) { this.room.DeleteMission(task.id); return }
        let rType = task.Data.rType
        let num = task.Data.num
        var HistoryList = Game.market.getHistory(rType)
        let HistoryLength = HistoryList.length;
        if (HistoryLength < 3) { console.log("资源购买出错"); return }
        var allNum: number = 0
        for (var iii = HistoryLength - 3; iii < HistoryLength; iii++) {
            allNum += HistoryList[iii].avgPrice
        }
        var avePrice = allNum / 3     // 平均价格 [近3天]
        // 获取该资源的平均价格
        var maxPrice = avePrice + (task.Data.range ? task.Data.range : 50)  // 范围
        /* 在市场上寻找 */
        var orders = Game.market.getAllOrders(order => order.resourceType == rType &&
            order.type == ORDER_SELL && order.price <= maxPrice)
        if (orders.length <= 0) return
        /* 寻找价格最低的 */
        var newOrderList = orders.sort(compare('price'))
        for (var ii of newOrderList) {
            if (ii.price > maxPrice) return
            if (ii.amount >= num) {
                if (Game.market.deal(ii.id, num, this.room.name) == OK) {
                    this.room.DeleteMission(task.id)
                    return
                }
                else return
            }
            else {
                if (Game.market.deal(ii.id, ii.amount, this.room.name) == OK)
                    task.Data.num -= ii.amount
                return
            }
        }
    }


    /**
     * 创建市场最高购买订单 
     * @param type 资源类型
     * @param num 购买数量
     * @param max 接受最大价格
     * @returns 
     */
    public OrderEnergy(type: MarketResourceConstant, num: number, max: number): string {
        let history = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: type });
        let avePrice = 0;
        let j = -1;
        for (let i = 0; i < history.length; i++) {
            if (history[i].price > avePrice && history[i].price <= max && history[i].roomName != this.room.name && history[i].amount >= 1000) { avePrice = history[i].price + 0.001; }//符合条件
        }
        /* 判断有无自己的订单 */
        let thisOrder = Game.market.orders;
        let thisRoomOrder: Order;
        for (let i in thisOrder) {
            let Order = thisOrder[i];
            if (Order.roomName == this.room.name && Order.type == 'buy' && Order.resourceType == type && Order.remainingAmount > 0) { thisRoomOrder = Order; break; }
        }
        /* 没有就创建订单 或者添加容量 ，有就更新最高价格*/
        if (!thisRoomOrder) {
            for (let i in thisOrder) {
                let Order = thisOrder[i];
                if (Order.roomName == this.room.name && Order.type == 'buy' && Order.resourceType == type && Order.remainingAmount == 0) {
                    Game.market.extendOrder(Order.id, num);//添加容量
                    Game.market.changeOrderPrice(Order.id, avePrice)//修改单价 不管高低都要刷新，因为怕被人钓鱼
                    return;
                }
            }

            console.log("订单创建中")
            if (
                Game.market.createOrder({
                    type: ORDER_BUY,
                    resourceType: type,
                    price: avePrice,
                    totalAmount: num,
                    roomName: this.room.name
                }) == 0
            ) return `房间${this.room.name}:${type}不足,创建订单  价格:${avePrice} 数量:${num}`
            else `房间${this.room.name}:${type}不足,创建订单失败`
        }
        else {
            Game.market.changeOrderPrice(thisRoomOrder.id, avePrice)//修改单价
        }
    }

}