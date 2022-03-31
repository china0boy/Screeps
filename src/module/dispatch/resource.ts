/* 资源调度模块 */

import { t1, t2, t3 } from "@/constant/ResourceConstant"
import { Colorful, isInArray } from "@/utils"
import { avePrice, haveOrder, checkLabBindResource, highestPrice } from "../fun/funtion"


// 主调度函数
export function ResourceDispatch(thisRoom: Room): void {
    if ((Game.time - global.Gtime[thisRoom.name]) % 15) return
    // 处理订单前检查
    let storage_ = global.Stru[thisRoom.name]['storage'] as StructureStorage
    let terminal_ = global.Stru[thisRoom.name]['terminal'] as StructureTerminal
    if (thisRoom.controller.level < 6 || !storage_ || !terminal_) return
    if (thisRoom.MissionNum('Structure', '资源传送') >= 1) return    // 如果房间有资源传送任务，则不执行
    // ResourceLimit更新
    ResourceLimitUpdate(thisRoom)
    /* 对资源调度进行操作 */
    for (let i of Memory.ResourceDispatchData) {
        // 执行资源调度
        if (i.sourceRoom == thisRoom.name) {
            // 执行买操作
            if (i.conditionTick <= 0 && i.buy) {
                if (i.mtype == 'order') {
                    // 基础资源
                    /**
                     *       1.获取近两天的平均价格
                     *       2.拉取平均价格+10以内价格最高的订单
                     *       3.发布订单的价格比最高的订单的价格多0.01
                    */
                    console.log(Colorful(`[资源调度] 房间${thisRoom.name}需求资源[${i.rType}]无法调度,将进行购买! 购买方式为${i.mtype},购买数量${i.num}`, 'yellow'))
                    let ave = avePrice(i.rType, 2)
                    if (!haveOrder(thisRoom.name, i.rType, 'buy', ave)) {
                        let highest = highestPrice(i.rType, 'buy', ave + 10)
                        let result = Game.market.createOrder({
                            type: ORDER_BUY,
                            resourceType: i.rType,
                            price: highest + 0.01,
                            totalAmount: i.num,
                            roomName: thisRoom.name
                        });
                        if (result != OK) { console.log("[资源调度]创建能量订单出错,房间", thisRoom.name); continue }
                        console.log(Colorful(`房间${thisRoom.name}创建${i.rType}订单,价格:${highest + 0.01};数量:${i.num}`, 'green', true))
                        i.delayTick = 0
                    }
                    continue
                }
                else if (i.mtype == 'deal') {
                    if (thisRoom.Check_Buy(i.rType) || thisRoom.MissionNum('Structure', '资源购买') >= 2) continue
                    // 在一定范围内寻找最便宜的订单deal 例如平均价格20 范围 10 最高价格31 便只能接受30以下的价格 （根据资源不同选择不同参数）
                    console.log(Colorful(`[资源调度] 房间${thisRoom.name}需求资源[${i.rType}]无法调度,将进行购买! 购买方式为${i.mtype},购买数量:${i.num}`, 'yellow'))
                    // 能量 ops
                    if (isInArray(['ops', 'energy'], i.rType)) {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 5, 10);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                    // 原矿 中间化合物
                    else if (isInArray(['X', 'L', 'H', 'O', 'Z', 'K', 'U', 'G', 'OH', 'ZK', 'UL'], i.rType)) {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 10, 30);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                    else if (isInArray(t3, i.rType)) {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 50, 150);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                    // power
                    else if (i.rType == 'power') {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 20, 70);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                    // t1 t2
                    else if (isInArray(t2, i.rType) || isInArray(t1, i.rType)) {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 20, 65);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                    // 其他商品类资源 bar类资源
                    else {
                        let task = thisRoom.Public_Buy(i.rType, i.num, 50, 200);
                        if (task) { thisRoom.AddMission(task); i.delayTick = 0 }; continue
                    }
                }
                else {
                    // 未定义i.mtype 便按照默认的执行
                    if (i.rType == 'energy') i.mtype = 'order'
                    else i.mtype = 'deal'
                    continue
                }
            }
        }
        else {
            if (i.dealRoom) continue
            if (storage_.store.getUsedCapacity(i.rType))
                var limitNum = global.ResourceLimit[thisRoom.name][i.rType] ? global.ResourceLimit[thisRoom.name][i.rType] : 0
            if (storage_.store.getUsedCapacity(i.rType) <= 0) continue  // 没有就删除
            // storage里资源大于等于调度所需资源
            if ((storage_.store.getUsedCapacity(i.rType) - limitNum) >= i.num) {
                var SendNum = i.num > 50000 ? 50000 : i.num
                let task = thisRoom.Public_Send(i.sourceRoom, i.rType, SendNum)
                if (task && thisRoom.AddMission(task)) {
                    if (i.num <= 50000) i.dealRoom = thisRoom.name // 如果调度数量大于50k 则只减少num数量
                    console.log(Colorful(`房间${thisRoom.name}接取房间${i.sourceRoom}的资源调度申请,资源:${i.rType},数量:${SendNum}`, 'green'))
                    i.num -= SendNum
                    return
                }
            }
            // sotrage里资源小于调度所需资源
            if ((storage_.store.getUsedCapacity(i.rType) - limitNum) > 0 && storage_.store.getUsedCapacity(i.rType) - limitNum < i.num) {
                let SendNum = storage_.store.getUsedCapacity(i.rType) - limitNum
                let task = thisRoom.Public_Send(i.sourceRoom, i.rType, SendNum)
                if (task && thisRoom.AddMission(task)) {
                    console.log(Colorful(`房间${thisRoom.name}接取房间${i.sourceRoom}的资源调度申请,资源:${i.rType},数量:${SendNum}`, 'green'))
                    i.num -= SendNum
                    return
                }
            }
        }
    }
}


// 调度信息超时管理器
export function ResourceDispatchTick(): void {
    for (let i of Memory.ResourceDispatchData) {
        // 超时将删除调度信息
        if (!i.delayTick || i.delayTick <= 0 || i.num <= 0 || !i.rType) {
            console.log(Colorful(`[资源调度]房间${i.sourceRoom}的[${i.rType}]资源调度删除!原因:调度任务已部署|超时|无效调度`,'pink'))
            let index = Memory.ResourceDispatchData.indexOf(i)
            Memory.ResourceDispatchData.splice(index, 1)
        }
        if (i.delayTick > 0)
            i.delayTick--
        if (i.conditionTick > 0) {
            if (i.dealRoom) // 有deal房间的时候， conditionTick衰减减慢
            {
                if (Game.time % 5 == 0)
                    i.conditionTick--
            }
            else {
                i.conditionTick--
            }
        }
    }
}

// 调度信息更新器  ResourceLimit 建议放global里
export function ResourceLimitUpdate(thisRoom: Room): void {
    global.ResourceLimit[thisRoom.name] = {}       // 初始化
    global.ResourceLimit[thisRoom.name]['energy'] = 350000
    for (var i of t3) global.ResourceLimit[thisRoom.name][i] = 8000    // 所有t3保存8000基础量，以备应急
    for (var b of ['X', 'L', 'Z', 'U', 'K', 'O', 'H']) global.ResourceLimit[thisRoom.name][b] = 15000 // 所有基础资源保存15000的基础量
    // 监测boost
    if (Object.keys(thisRoom.memory.RoomLabBind).length > 0) {
        for (var l in thisRoom.memory.RoomLabBind) {
            let lab = Game.getObjectById(l) as StructureLab
            if (!lab) continue
            if (!global.ResourceLimit[thisRoom.name][thisRoom.memory.RoomLabBind[l].rType]) global.ResourceLimit[thisRoom.name][thisRoom.memory.RoomLabBind[l].rType] = 8000
            else {
                global.ResourceLimit[thisRoom.name][thisRoom.memory.RoomLabBind[l].rType] = global.ResourceLimit[thisRoom.name][thisRoom.memory.RoomLabBind[l].rType] > 8000 ? global.ResourceLimit[thisRoom.name][thisRoom.memory.RoomLabBind[l].rType] : 8000
            }
        }
    }
    // 监测lab合成
    if (thisRoom.MissionNum('Room', '资源合成') > 0) {
        for (var m of thisRoom.memory.Misson['Room'])
            if (m.name == '资源合成') {
                if (!global.ResourceLimit[thisRoom.name][m.Data.raw1]) global.ResourceLimit[thisRoom.name][m.Data.raw1] = m.Data.num
                else {
                    global.ResourceLimit[thisRoom.name][m.Data.raw1] = global.ResourceLimit[thisRoom.name][m.Data.raw1] > m.Data.num ? global.ResourceLimit[thisRoom.name][m.Data.raw1] : m.Data.num
                }
                if (!global.ResourceLimit[thisRoom.name][m.Data.raw2]) global.ResourceLimit[thisRoom.name][m.Data.raw2] = m.Data.num
                else {
                    global.ResourceLimit[thisRoom.name][m.Data.raw2] = global.ResourceLimit[thisRoom.name][m.Data.raw2] > m.Data.num ? global.ResourceLimit[thisRoom.name][m.Data.raw2] : m.Data.num
                }
            }
    }
    // 监测合成规划
    if (Object.keys(thisRoom.memory.ComDispatchData).length > 0) {
        for (var g in thisRoom.memory.ComDispatchData) {
            if (!global.ResourceLimit[thisRoom.name][g]) global.ResourceLimit[thisRoom.name][g] = thisRoom.memory.ComDispatchData[g].dispatch_num
            else {
                global.ResourceLimit[thisRoom.name][g] = global.ResourceLimit[thisRoom.name][g] > thisRoom.memory.ComDispatchData[g].dispatch_num ? global.ResourceLimit[thisRoom.name][g] : thisRoom.memory.ComDispatchData[g].dispatch_num
            }
        }
    }
    // 监测资源卖出
    for (var mtype in thisRoom.memory.market)
        for (var obj of thisRoom.memory.market[mtype]) {
            if (!global.ResourceLimit[thisRoom.name][obj.rType]) global.ResourceLimit[thisRoom.name][obj.rType] = obj.num
            else {
                global.ResourceLimit[thisRoom.name][obj.rType] = global.ResourceLimit[thisRoom.name][obj.rType] > obj.num ? global.ResourceLimit[thisRoom.name][obj.rType] : obj.num
            }
        }
    // 监测工厂相关
}