import { checkDispatch, checkSend, DispatchNum } from "@/module/fun/funtion";
import { Colorful, compare, isInArray } from "@/utils";
import { OptCost } from "./constant";

export default class PowerCreepMissonBase extends PowerCreep {
    // pc处理任务专用函数
    public ManageMisson(): void {
        let myroom = Game.rooms[this.memory.belong]
        /* 获取名字 */
        var name = this.name
        var info = name.split('/')
        /* pc姓名 如： E41S45/home/shard3/1 */
        if (info.length != 3) { this.say("名字有问题!"); return }
        if (!this.memory.belong) this.memory.belong = info[0]    // 所属房间
        if (!this.memory.role) this.memory.role = info[1]   // 角色
        if (!this.memory.shard) this.memory.shard = info[2] as shardName    // 所属shard
        if (!myroom) return
        var thisSpawn = Game.getObjectById(Game.rooms[this.memory.belong].memory.StructureIdData.PowerSpawnID) as StructurePowerSpawn
        if (!thisSpawn) return
        else {
            if (this.hits < this.hitsMax - 200) {
                this.goTo(thisSpawn.pos, 1)
                if (this.room.name == this.memory.belong)
                    this.optTower('heal', this);
            }
        }
        if (!this.memory.spawn) {
            this.memory.spawn = thisSpawn.id
        }

        //躲避核弹
        if (this.handle_nuke()) return
        // 房间没开power去开power
        if (!myroom.controller.isPowerEnabled) {
            /* 没有允许Power就自动激活power开关 */
            if (!this.pos.isNearTo(myroom.controller)) this.goTo(myroom.controller.pos, 1)
            else this.enableRoom(myroom.controller)
            return
        }
        // 不在出生房间就回去
        if (this.room.name != this.memory.belong) {
            this.goTo(new RoomPosition(24, 24, this.memory.belong), 21);
        }
        // 快没生命了去renew
        if (this.room.name == this.memory.belong && this.memory.shard == Game.shard.name) {
            if (this.ticksToLive < 1000) {
                if (!this.pos.isNearTo(thisSpawn)) { this.goTo(thisSpawn.pos, 1) }
                else this.renew(thisSpawn)
                return
            }
        }
        if (!this.memory.MissionData) this.memory.MissionData = {}
        if (!myroom.memory.Misson['PowerCreep'])
            myroom.memory.Misson['PowerCreep'] = []
        if (Object.keys(this.memory.MissionData).length <= 0) {
            /* 领取任务 */
            var taskList = myroom.memory.Misson['PowerCreep']
            var thisTaskList: MissionModel[] = []
            for (var Stask of taskList) {
                if (Stask.CreepBind && isInArray(Object.keys(Stask.CreepBind), this.memory.role))
                    thisTaskList.push(Stask)
            }
            /* 根据优先等级排列，领取最优先的任务 */
            thisTaskList.sort(compare('level'))
            /* 还没有绑定的任务，就等待接取任务 */
            LoopBind:
            for (var t of thisTaskList) {
                if (t.CreepBind && t.CreepBind[this.memory.role] && t.CreepBind[this.memory.role].bind.length < t.CreepBind[this.memory.role].num) {
                    /* 绑定任务了就输入任务数据 */
                    t.processing = true // 领取任务后，任务开始计时
                    t.CreepBind[this.memory.role].bind.push(this.name)
                    this.memory.MissionData.id = t.id           // 任务id
                    this.memory.MissionData.name = t.name        // 任务名
                    this.memory.MissionData.delay = t.delayTick ? t.delayTick : 150  // 爬虫处理任务的超时时间
                    this.memory.MissionData.Data = t.Data ? t.Data : {}    // 任务数据传输
                    break LoopBind
                }
            }
            if (Object.keys(this.memory.MissionData).length <= 0) {
                /* 没有任务就生产ops */
                if (this.powers[PWR_GENERATE_OPS] && !this.powers[PWR_GENERATE_OPS].cooldown) { this.usePower(PWR_GENERATE_OPS) }
                // 如果ops过多，就转移ops
                if (this.store.getUsedCapacity('ops') == this.store.getCapacity()) {
                    var storage_ = Game.rooms[this.memory.belong].storage
                    if (!storage_) return
                    if (this.transfer(storage_, 'ops', Math.ceil(this.store.getUsedCapacity('ops') / 4)) == ERR_NOT_IN_RANGE)
                        this.goTo(storage_.pos, 1)
                }
            }
            return
        }
        else {
            /* 处理任务 */
            this.memory.MissionData.delay--     // 爬虫内置Tick计时
            if (this.memory.MissionData.delay <= 0) {
                this.memory.MissionData = {}
                return
            }
            switch (this.memory.MissionData.name) {
                case "仓库扩容": { this.handle_pwr_storage(); break; }
                case '塔防增强': { this.handle_pwr_tower(); break; }
                case '合成加速': { this.handle_pwr_lab(); break; }
                case '扩展填充': { this.handle_pwr_extension(); break; }
                case '虫卵强化': { this.handle_pwr_spawn(); break; }
                case '工厂强化': { this.handle_pwr_factory(); break; }
                case 'power强化': { this.handle_pwr_powerspawn(); break; }
                case 'source强化': { this.handle_pwr_source(); break; }
                case 'mineral强化': { this.handle_pwr_mineral(); break; }
            }
        }
    }

    // queen类型pc执行任务前执行的准备
    public OpsPrepare(): boolean {
        var storage_ = Game.rooms[this.memory.belong].storage
        var terminal_ = Game.rooms[this.memory.belong].terminal
        var structure = storage_ && terminal_ ? (storage_.store.ops >= terminal_.store.ops ? storage_ : terminal_) : storage_ ? (storage_.store.ops ? storage_ : null) : terminal_ ? (terminal_.store.ops ? terminal_ : null) : null
        if (!structure) {
            if (storage_ || terminal_) {
                // 资源调度
                let room_ = Game.rooms[this.memory.belong]
                if (room_.MissionNum('Structure', '资源购买') <= 0)
                    if (DispatchNum(room_.name) < 2 && !checkSend(room_.name, 'ops') && !checkDispatch(room_.name, 'ops'))   // 已经存在其它房间的传送信息的情况
                    {
                        console.log(Colorful(`[资源调度] 房间${this.name}没有足够的资源[${'ops'}],将执行资源调度!`, 'yellow'))
                        let dispatchTask: RDData = {
                            sourceRoom: room_.name,
                            rType: 'ops',
                            num: 4900,
                            delayTick: 200,
                            conditionTick: 35,
                            buy: true,
                            mtype: 'deal'
                        }
                        Memory.ResourceDispatchData.push(dispatchTask)
                    }
            }
            return false
        }
        // 先去除杂质
        for (let i in this.store) {
            if (i != 'ops') {
                this.transfer_(structure, i as ResourceConstant)
                return false
            }
        }
        let num = this.store.getUsedCapacity('ops')
        if (num < 200 || num < Math.ceil(this.store.getCapacity() / 4)) {
            this.usePower(PWR_GENERATE_OPS)
            // 过少就去提取ops资源
            if (structure.store.getUsedCapacity('ops') < 2500) {
                // 资源调度
                let room_ = Game.rooms[this.memory.belong]
                if (room_.MissionNum('Structure', '资源购买') <= 3)
                    if (DispatchNum(room_.name) < 5 && !checkSend(room_.name, 'ops') && !checkDispatch(room_.name, 'ops'))   // 已经存在其它房间的传送信息的情况
                    {
                        console.log(Colorful(`[资源调度] 房间${this.memory.belong}没有足够的资源[${'ops'}],将执行资源调度!`, 'yellow'))
                        let dispatchTask: RDData = {
                            sourceRoom: room_.name,
                            rType: 'ops',
                            num: 4900,
                            delayTick: 200,
                            conditionTick: 35,
                            buy: true,
                            mtype: 'deal'
                        }
                        Memory.ResourceDispatchData.push(dispatchTask)
                    }
            }
            if (structure.store.getUsedCapacity('ops') > Math.ceil(this.store.getCapacity() / 2))
                if (this.withdraw(structure, 'ops', Math.ceil(this.store.getCapacity() / 2) > this.store.getFreeCapacity() ? this.store.getFreeCapacity() : Math.ceil(this.store.getCapacity() / 2)) == ERR_NOT_IN_RANGE) {
                    this.goTo(structure.pos, 1)
                }
            return false
        }
        else
            return true
    }
}