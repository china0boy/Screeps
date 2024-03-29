import { ResourceCanDispatch } from "@/module/dispatch/resource"
import { checkDispatch, checkSend, DispatchNum, resourceMap } from "@/module/fun/funtion"
import { colorful, isInArray, StatisticalResources } from "@/utils"

/* 房间原型拓展   --任务  --基本功能 */
export default class RoomMissonBehaviourExtension extends Room {
    // 搬运基本任务
    public Task_Carry(misson: MissionModel): void {
        /* 搬运任务需求 sourcePosX,Y sourceRoom targetPosX,Y targetRoom num  rType  */
        // 没有任务数据 或者数据不全就取消任务
        if (!misson.Data) this.DeleteMission(misson.id)
        if (!misson.CreepBind) this.DeleteMission(misson.id)
    }

    // 建造任务
    public Constru_Build(): void {
        if (Game.time % 51) return
        if (this.controller.level < 5) return
        var myConstrusion = new RoomPosition(Memory.RoomControlData[this.name].center[0], Memory.RoomControlData[this.name].center[1], this.name).findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
        if (myConstrusion) {
            /* 添加一个进孵化队列 */
            this.NumSpawn('build', 1)
        }
        else {
            delete this.memory.SpawnConfig['build']
        }
    }

    // 资源link资源转移至centerlink中
    public Task_CenterLink(): void {
        if ((global.Gtime[this.name] - Game.time) % 3) return
        if (!this.memory.StructureIdData.source_links) this.memory.StructureIdData.source_links = []
        if (!this.memory.StructureIdData.center_link || this.memory.StructureIdData.source_links.length <= 0) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link) { delete this.memory.StructureIdData.center_link; return }
        //else { if (center_link.store.getUsedCapacity('energy') > 700) return }
        for (let id of this.memory.StructureIdData.source_links) {
            let source_link = Game.getObjectById(id) as StructureLink
            if (!source_link) {
                let index = this.memory.StructureIdData.source_links.indexOf(id)
                this.memory.StructureIdData.source_links.splice(index, 1)
                return
            }
            // 先判断消费link是否需要能量
            if (this.memory.StructureIdData.comsume_link && this.memory.StructureIdData.comsume_link.length > 0) {
                for (var i of this.memory.StructureIdData.comsume_link) {
                    let l = Game.getObjectById(i) as StructureLink
                    if (!l) {
                        let index = this.memory.StructureIdData.comsume_link.indexOf(i)
                        this.memory.StructureIdData.comsume_link.splice(index, 1)
                    }
                    else if (l.store.getUsedCapacity('energy') <= 400 && this.Check_Link(source_link.pos, l.pos)) {
                        var thisTask = this.Public_link([source_link.id], l.id, 5)
                        this.AddMission(thisTask)
                        continue
                    }
                }
            }
            // 在判断升级link是否需要能量
            if (source_link.store.getUsedCapacity('energy') >= 700 && this.Check_Link(source_link.pos, center_link.pos)) {
                var thisTask = this.Public_link([source_link.id], center_link.id, 5)
                this.AddMission(thisTask)
                return
            }
        }
    }

    // 消费link请求资源 例如升级Link
    public Task_ComsumeLink(): void {
        if ((global.Gtime[this.name] - Game.time) % 7) return
        if (!this.memory.StructureIdData.center_link || this.MissionNum('Structure', '链传送能') > 0) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link) { delete this.memory.StructureIdData.center_link; return }
        if (this.memory.StructureIdData.upgrade_link || this.memory.StructureIdData.comsume_link) {
            let upgrade_link = Game.getObjectById(this.memory.StructureIdData.upgrade_link) as StructureLink
            if (!upgrade_link) { delete this.memory.StructureIdData.upgrade_link; }
            if (upgrade_link && upgrade_link.store.getUsedCapacity('energy') < 500) {
                var thisTask = this.Public_link([center_link.id], upgrade_link.id, 25)
                this.AddMission(thisTask)
                return
            }
            if (this.memory.StructureIdData.comsume_link && this.memory.StructureIdData.comsume_link.length > 0) {
                for (var i of this.memory.StructureIdData.comsume_link) {
                    let l = Game.getObjectById(i) as StructureLink
                    if (!l) {
                        let index = this.memory.StructureIdData.comsume_link.indexOf(i)
                        this.memory.StructureIdData.comsume_link.splice(index, 1)
                        return
                    }
                    if (l.store.getUsedCapacity('energy') <= 400) {
                        var thisTask = this.Public_link([center_link.id], l.id, 35)
                        this.AddMission(thisTask)
                        return
                    }
                }
            }
        }
    }

    // lab合成任务 （底层）
    public Task_Compound(misson: MissionModel): void {
        if (Game.time % 5) return
        if (!this.memory.StructureIdData.labInspect || Object.keys(this.memory.StructureIdData.labInspect).length < 3) return
        let storage_ = this.storage
        let terminal_ = this.terminal
        if (misson.Data.num <= -50 || !storage_ || !terminal_) {
            this.DeleteMission(misson.id)
            return
        }
        let raw1 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw1) as StructureLab
        let raw2 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw2) as StructureLab
        if (!raw1 || !raw2) {
            this.DeleteMission(misson.id)
            return
        }
        //清空源lab杂质
        if (raw1.mineralType && raw1.mineralType != misson.Data.raw1 && this.Check_Carry('transport', raw1.pos, storage_.pos, raw1.mineralType)) {
            var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, raw1.pos.x, raw1.pos.y, this.name, storage_.pos.x, storage_.pos.y, raw1.mineralType, raw1.store.getUsedCapacity(raw1.mineralType))
            this.AddMission(thisTask)
            return
        }
        if (raw2.mineralType && raw2.mineralType != misson.Data.raw2 && this.Check_Carry('transport', raw2.pos, storage_.pos, raw2.mineralType)) {
            var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, raw2.pos.x, raw2.pos.y, this.name, storage_.pos.x, storage_.pos.y, raw2.mineralType, raw2.store.getUsedCapacity(raw2.mineralType))
            this.AddMission(thisTask)
            return
        }
        let re = false
        let comData = []
        for (let bindLab in misson.LabBind) {
            if (!isInArray([misson.Data.raw1, misson.Data.raw2], misson.LabBind[bindLab]) && this.memory.RoomLabBind[bindLab] && this.memory.RoomLabBind[bindLab].type == 'com') comData.push(bindLab)
        }
        for (let i of comData) {
            var thisLab = Game.getObjectById(i) as StructureLab
            if (!thisLab) {
                let index = this.memory.StructureIdData.labs.indexOf(i)
                this.memory.StructureIdData.labs.splice(index, 1)
                continue
            }
            if (thisLab.mineralType && thisLab.mineralType != misson.LabBind[i] && this.Check_Carry('transport', thisLab.pos, storage_.pos, thisLab.mineralType)) {
                // 说明该lab内有异物
                var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, thisLab.pos.x, thisLab.pos.y, this.name, storage_.pos.x, storage_.pos.y, thisLab.mineralType, thisLab.store.getUsedCapacity(thisLab.mineralType))
                this.AddMission(thisTask)
                return
            }
            if (thisLab.cooldown) continue
            let comNum = 5
            if (thisLab.effects && thisLab.effects.length > 0) {
                for (var effect_ of thisLab.effects) {
                    if (effect_.effect == PWR_OPERATE_LAB) {
                        var level = effect_.level
                        comNum += level * 2
                    }
                }
            }
            if (thisLab.runReaction(raw1, raw2) == OK) { misson.Data.num -= comNum }
            if (thisLab.mineralType && thisLab.store.getUsedCapacity(thisLab.mineralType) >= 2500 && this.RoleMissionNum('transport', '物流运输') < 2 && this.Check_Carry('transport', thisLab.pos, storage_.pos, thisLab.mineralType)) {
                /* 资源快满了就要搬运 */
                re = true
                var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, thisLab.pos.x, thisLab.pos.y, this.name, storage_.pos.x, storage_.pos.y, thisLab.mineralType, thisLab.store.getUsedCapacity(thisLab.mineralType))
                this.AddMission(thisTask)
                continue
            }
        }
        if (re) return
        /* 源lab缺资源就运 */
        if (storage_.store.getUsedCapacity(misson.Data.raw1) > 0)
            if (raw1.store.getUsedCapacity(misson.Data.raw1) < 500 && this.RoleMissionNum('transport', '物流运输') < 2 && this.Check_Carry('transport', storage_.pos, raw1.pos, misson.Data.raw1)) {
                var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, storage_.pos.x, storage_.pos.y, this.name, raw1.pos.x, raw1.pos.y, misson.Data.raw1, storage_.store.getUsedCapacity(misson.Data.raw1) >= 1000 ? 1000 : storage_.store.getUsedCapacity(misson.Data.raw1))
                this.AddMission(thisTask)
            }
        if (storage_.store.getUsedCapacity(misson.Data.raw2) > 0)
            if (raw2.store.getUsedCapacity(misson.Data.raw2) < 500 && this.RoleMissionNum('transport', '物流运输') < 2 && this.Check_Carry('transport', storage_.pos, raw2.pos, misson.Data.raw2)) {
                var thisTask = this.Public_Carry({ 'transport': { num: 1, bind: [] } }, 30, this.name, storage_.pos.x, storage_.pos.y, this.name, raw2.pos.x, raw2.pos.y, misson.Data.raw2, storage_.store.getUsedCapacity(misson.Data.raw2) >= 1000 ? 1000 : storage_.store.getUsedCapacity(misson.Data.raw2))
                this.AddMission(thisTask)
            }
        /* 资源调度 */
        var needResource: ResourceConstant[] = [misson.Data.raw1, misson.Data.raw2]
        if (this.MissionNum('Structure', '资源购买') > 1) return // 存在资源购买任务的情况下，不执行资源调度
        if (DispatchNum(this.name) >= 2) return // 资源调度数量过多则不执行资源调度
        for (let resource_ of needResource) {
            // 原矿 资源调用
            if (storage_.store.getUsedCapacity(resource_) + terminal_.store.getUsedCapacity(resource_) < 10000 && isInArray(['H', 'O', 'K', 'L', 'X', 'U', 'Z'], resource_)) {
                let num = StatisticalResources(resource_)
                // 遍历所有房间有没有资源合成任务，排除掉resource_的情况
                for(let i in Game.rooms){
                    let room = Game.rooms[i]
                    if(!room||!room.memory.Misson||!room.memory.Misson.Room) continue
                    let misson = room.MissionName('Room','资源合成')
                    if(misson){
                        if(misson.Data.raw1 == resource_||misson.Data.raw2 == resource_){
                            num -= room.storage.store.getUsedCapacity(resource_)
                        }
                    }
                }

                if (num >= 10000 || num >= misson.Data.num) {
                    if (checkDispatch(this.name, resource_)) continue  // 已经存在调用信息的情况
                    if (checkSend(this.name, resource_)) continue  // 已经存在其它房间的传送信息的情况
                    console.log(colorful(`[资源调度]<lab com> 房间${this.name}没有足够的资源[${resource_}],将执行资源调度!`, 'yellow'))
                    let dispatchTask: RDData = {
                        sourceRoom: this.name,
                        rType: resource_,
                        num: num >= 9800 ? 9800 : misson.Data.num,
                        delayTick: 200,
                        conditionTick: 35,
                        buy: false,
                        mtype: 'deal'
                    }
                    Memory.ResourceDispatchData.push(dispatchTask)

                } else {
                    let FactoryId = this.memory.StructureIdData.FactoryId as Id<StructureFactory>
                    if (!FactoryId) continue
                    let numBar = 0
                    for (let j in COMMODITIES[resource_].components) {
                        if (j != 'energy') {
                            numBar = StatisticalResources(j as ResourceConstant)
                        }
                    }
                    if (misson.Data.num >= 0) {
                        let addNum = misson.Data.num / 10
                        if (addNum / 5 <= numBar) {
                            let num = Math.ceil(addNum)
                            let Factory = Game.getObjectById(FactoryId)
                            if (Factory && !this.memory.Factory.dataProduce[resource_]) {
                                Factory.addData(resource_ as CommodityConstant, Math.ceil(500 - num % 500 + num))
                                console.log(colorful(`房间${this.name}没有足够的资源[${resource_}],将合成[${resource_}],数量[${addNum}]!`, 'yellow'))
                            }
                        }
                    }

                }
            }
            // 其他中间物 资源调用
            else if (storage_.store.getUsedCapacity(resource_) + terminal_.store.getUsedCapacity(resource_) < 500 && !isInArray(['H', 'O', 'K', 'L', 'X', 'U', 'Z'], resource_)) {
                let num = StatisticalResources(resource_)
                if (num >= 5000 || num >= misson.Data.num) {
                    if (checkDispatch(this.name, resource_)) continue  // 已经存在调用信息的情况
                    if (checkSend(this.name, resource_)) continue  // 已经存在其它房间的传送信息的情况
                    console.log(colorful(`[资源调度]<lab com> 房间${this.name}没有足够的资源[${resource_}],将执行资源调度!`, 'yellow'))
                    let dispatchTask: RDData = {
                        sourceRoom: this.name,
                        rType: resource_,
                        num: num >= 4900 ? 4900 : misson.Data.num,
                        delayTick: 100,
                        conditionTick: 25,
                        buy: false,
                        mtype: 'deal'
                    }
                    Memory.ResourceDispatchData.push(dispatchTask)
                    return
                }
                else console.log(colorful(`[资源调度]<lab com> 房间${this.name}没有足够的资源[${resource_}],请补充资源!`, 'orange'))
            }
        }
    }

    // 合成规划     (中层)    目标化合物 --> 安排一系列合成
    public Task_CompoundDispatch(): void {
        if ((Game.time - global.Gtime[this.name]) % 50) return
        if (this.RoleMissionNum('transport', '物流运输') > 0) return
        if (this.memory.switch.AutoDefend) return
        if (Object.keys(this.memory.ComDispatchData).length <= 0) return //  没有合成规划情况
        if (this.MissionNum('Room', '资源合成') > 0) return  // 有合成任务情况
        var storage_ = this.storage
        if (!storage_) return
        var terminal_ = this.terminal
        if (!terminal_) return
        /* 没有房间合成实验室数据，不进行合成 */
        if (!this.memory.StructureIdData.labInspect.raw1) { console.log(`房间${this.name}不存在合成实验室数据！`); return }
        /**
         * 正式开始合成规划
         *  */
        var data = this.memory.ComDispatchData
        LoopA:
        for (var disType in data) {
            let storeNum = storage_.store.getUsedCapacity(disType as ResourceConstant)
            let dispatchNum = this.memory.ComDispatchData[disType].dispatch_num
            // 不是最终目标资源的情况下
            if (Object.keys(data)[Object.keys(data).length - 1] != disType)
                if (storeNum + 50 < dispatchNum) {   // +50 是误差容许
                    let diff = dispatchNum - storeNum
                    /* 先判定一下是否已经覆盖，如果已经覆盖就不合成 例如：ZK 和 G的关系，只要G数量满足了就不考虑 */
                    var mapResource = resourceMap(disType as ResourceConstant, Object.keys(data)[Object.keys(data).length - 1] as ResourceConstant)
                    if (mapResource.length > 0) {
                        for (var mR of mapResource) {
                            if (storage_.store.getUsedCapacity(mR) >= data[disType].dispatch_num)
                                continue LoopA
                        }
                    }
                    // 先判断能不能调度，如果能调度，就暂时 return
                    let identify = ResourceCanDispatch(this, disType as ResourceConstant, dispatchNum - storeNum)
                    if (identify == 'can') {
                        console.log(`[dispatch]<lab> 房间${this.name}将进行资源为${disType}的资源调度!`)
                        let dispatchTask: RDData = {
                            sourceRoom: this.name,
                            rType: disType as ResourceConstant,
                            num: dispatchNum - storeNum,
                            delayTick: 220,
                            conditionTick: 35,
                            buy: false,
                        }
                        Memory.ResourceDispatchData.push(dispatchTask)
                    }
                    else if (identify == 'running') return
                    // 如果terminal存在该类型资源，就暂时return
                    if (terminal_.store.getUsedCapacity(disType as ResourceConstant) > (this.memory.TerminalData[disType] ? this.memory.TerminalData[disType].num : 0)) return
                    // 如果存在manage搬运任务 就 return
                    if (this.Check_Carry("manage", terminal_.pos, storage_.pos, disType as ResourceConstant)) return
                    // 下达合成命令
                    var thisTask = this.public_Compound(diff, disType as ResourceConstant)
                    if (this.AddMission(thisTask)) {
                        data[disType].ok = true
                    }
                    return
                }
            // 是最终目标资源的情况下
            if (Object.keys(data)[Object.keys(data).length - 1] == disType) {
                // 下达合成命令
                var thisTask = this.public_Compound(data[disType].dispatch_num, disType as ResourceConstant)
                if (!this.AddMission(thisTask)) this.memory.ComDispatchData = {}
                return
            }

        }
    }
}