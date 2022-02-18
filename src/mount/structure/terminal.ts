import { Colorful, compare, isInArray } from "@/utils"

// terminal 扩展
export default class terminalExtension extends StructureTerminal {
    public ManageMission():void{
        if (this.room.MissionNum('Creep','急速冲级') > 0) return   // 急速冲级状态下停止terminal功能
        var allmyTask = []
        for (var task of this.room.memory.Misson['Structure'])
        {
            if (!task.structure) continue
            if (isInArray(task.structure,this.id))
            {
                allmyTask.push(task)
            }
        }
        let thisTask = null
        /* 按照优先级排序 */
        if (allmyTask.length >= 1)
            allmyTask.sort(compare('level'))
        thisTask = allmyTask[0]
        if (!thisTask || !isInArray(['资源传送'],thisTask[0].name))
        {
            /* terminal默认操作*/
            this.ResourceBalance()  // 资源平衡
            this.ResourceMarket()   // 资源购买
            if (!thisTask) return
        }
        if (thisTask.delayTick < 99995)
            thisTask.delayTick--
        switch (thisTask.name){
            case "资源传送":{break}
            case "资源购买":{break}
        }
    }

    /**
     * 资源平衡函数，用于平衡房间中资源数量以及资源在terminal和storage中的分布，尤其是能量和原矿
     */
    public ResourceBalance():void{
        this.RsourceMemory()
        // terminal资源平衡
        if ((Game.time - global.Gtime[this.room.name]) % 7) return
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        if (!storage_) {console.log(`找不到global.Stru['${this.room.name}']['storage]!`);return}
        for (var i in this.store)
        {
            if (this.room.RoleMissionNum('manage','物流运输') >= 1) return
            let num = this.store[i]     // 数量
            if (!this.room.memory.TerminalData[i] || !this.room.memory.TerminalData[i].num)  // terminalData里没有该数据
            {
                if (storage_.store.getFreeCapacity() < 40000) continue
                let thisTask = this.room.Public_Carry({'manage':{num:1,bind:[]}},20,this.room.name,this.pos.x,this.pos.y,this.room.name,storage_.pos.x,storage_.pos.y,i as ResourceConstant,num)
                this.room.AddMission(thisTask)
            }
            else
            {
                if (num > this.room.memory.TerminalData[i].num)
                {
                    if (storage_.store.getFreeCapacity() < 40000) continue
                    let thisTask = this.room.Public_Carry({'manage':{num:1,bind:[]}},20,this.room.name,this.pos.x,this.pos.y,this.room.name,storage_.pos.x,storage_.pos.y,i as ResourceConstant,num-this.room.memory.TerminalData[i].num)
                    this.room.AddMission(thisTask)
                }
                else if (num < this.room.memory.TerminalData[i].num)
                {
                    if (this.store.getFreeCapacity() < 5000) continue
                    if (i == 'energy')
                    {
                        if (storage_.store.getUsedCapacity('energy') <= 20000) continue
                    }
                    else
                    {
                        if ( storage_.store.getUsedCapacity(i as ResourceConstant) <= 500 && storage_.store.getUsedCapacity(i as ResourceConstant) + num < this.room.memory.TerminalData[i].num) continue
                    }
                    let thisTask = this.room.Public_Carry({'manage':{num:1,bind:[]}},20,this.room.name,storage_.pos.x,storage_.pos.y,this.room.name,this.pos.x,this.pos.y,i as ResourceConstant,this.room.memory.TerminalData[i].num - num)
                    this.room.AddMission(thisTask)
                }
            }
        }

    }   

    /**
     * 资源记忆更新函数
     * */
    public RsourceMemory():void{
        /* terminal自身资源管理 */
        var terminalData = this.room.memory.TerminalData
        for (var i in terminalData)
        {
            /* 数量小于0就删除数据，节省memory */
            if (terminalData[i].num <= 0) delete terminalData[i]
        }
    }

    /**
     * 资源买卖函数 未完成
     */
    public ResourceMarket():void{
        if ((Game.time - global.Gtime[this.room.name]) % 27) return
        // 能量自动购买区 [与MarketData无关] storage内能量小于200000时自动购买
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        if (!storage_) {console.log(`找不到global.Stru['${this.room.name}']['storage]!`);return}
        if (storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy') < 250000)
        {
            /* 计算平均价格 */
            let history = Game.market.getHistory('energy')
            let allprice = 0
            for (var ii=12;ii<15;ii++)
                allprice += history[ii].avgPrice
            let avePrice = allprice/3 + (Memory.marketAdjust['energy']?Memory.marketAdjust['energy']:0.5) // 平均能量价格
            if (avePrice > 20) avePrice = 20    // 最大不超过20
            /* 清理过期订单 */
            if (Object.keys(Game.market.orders).length > 150)
            {
                for (let j in Game.market.orders)
                {
                    let order = Game.market.getOrderById(j);
                    if (order.amount <=0 || !order.active) Game.market.cancelOrder(j);
                }
            }
            /* 下单 */
            let thisRoomOrder = Game.market.getAllOrders(order =>
                order.type == ORDER_BUY && order.resourceType == 'energy' && order.price >= avePrice - 0.5 && order.roomName == this.room.name)
            if ((!thisRoomOrder || thisRoomOrder.length <= 0))
            {
                console.log("房间",this.room.name,"订单操作中")
                Game.market.createOrder({
                    type: ORDER_BUY,
                    resourceType: 'energy',
                    price: avePrice,
                    totalAmount: 100000,
                    roomName: this.room.name   
                });
                console.log(Colorful(`房间${this.room.name}创建能量订单，价格:${avePrice};数量:100000`,'yellow',true))
            }
        }
        // 其他类型资源的买卖函数 暂缺
    }
}