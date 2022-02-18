import { times } from "lodash";

/* 房间原型拓展   --行为  --维护任务 */
export default class RoomMissonVindicateExtension extends Room {
    public Task_Repair(mission: MissionModel): void {
        if (mission.LabBind) {
            if (!this.Check_Lab(mission, 'transport', 'complex')) return
        }
        if (mission.Data.RepairType == 'global') {

        }
        else if (mission.Data.RepairType == 'special') {

        }
        else if (mission.Data.RepairType == 'nuker') {

        }
    }

    /* 急速冲级 */
    public Task_Quick_upgrade(mission: MissionModel): void {
        if (this.controller.level >= 8) { this.DeleteMission(mission.id); console.log(`房间${this.name}等级已到8级，删除任务!`); return }
        if (!this.memory.StructureIdData.terminalID) return
        /* 能量购买 */
        let terminal_ = Game.getObjectById(this.memory.StructureIdData.terminalID) as StructureTerminal
        if (!terminal_) return
        if (!mission.Data.standed) mission.Data.standed = true
        /* 如果terminal附近已经充满了爬虫，则standed为false */
        let creeps = terminal_.pos.findInRange(FIND_MY_CREEPS, 1)
        if (creeps.length >= 8) mission.Data.standed = false
        else mission.Data.standed = true
        if (!this.Check_Lab(mission, 'transport', 'complex')) return
        if (Game.time % 40) return
        if (terminal_.store.getUsedCapacity('energy') < 100000 && Game.market.credits >= 1000000) {
            /* 查找市场上能量订单 */
            /* 计算平均价格 */
            let history = Game.market.getHistory('energy')
            let allprice = 0
            for (var ii = 13; ii < 15; ii++)
                allprice += history[ii].avgPrice
            let avePrice = allprice / 2 + 0.6 // 平均能量价格
            if (avePrice > 20) avePrice = 20
            /* 清理过期订单 */
            if (Object.keys(Game.market.orders).length > 150) {
                for (let j in Game.market.orders) {
                    let order = Game.market.getOrderById(j)
                    if (!order.active) delete Game.market.orders[j]
                }
            }
            /* 判断有无自己的订单 */
            let thisRoomOrder = Game.market.getAllOrders(order =>
                order.type == ORDER_BUY && order.resourceType == 'energy' && order.price >= avePrice - 0.5 && order.roomName == this.name)
            /* 没有就创建订单 */
            if ((!thisRoomOrder || thisRoomOrder.length <= 0) && terminal_.store.getUsedCapacity('energy') <= 100000) {
                console.log("订单操作中")
                Game.market.createOrder({
                    type: ORDER_BUY,
                    resourceType: 'energy',
                    price: avePrice,
                    totalAmount: 100000,
                    roomName: this.name
                });
                console.log(`房间${this.name}创建能量订单，价格:${avePrice};数量:100000`)
            }
        }
    }

    /* 紧急援建 */
    public Task_HelpBuild(mission: MissionModel): void {
        if ((Game.time - global.Gtime[this.name]) % 9) return
        if (mission.LabBind) {
            if (!this.Check_Lab(mission, 'transport', 'complex')) return
        }

    }

    /* 紧急支援 */
    public Task_HelpDefend(mission: MissionModel): void {
        // if ((Game.time - global.Gtime[this.name]) % 9) return
        if (mission.LabBind) {
            if (!this.Check_Lab(mission, 'transport', 'complex')) return
        }
    }
}