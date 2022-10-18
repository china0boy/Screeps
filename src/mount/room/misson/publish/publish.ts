import { LabMap } from "@/constant/ResourceConstant"
import { isInArray, zipPosition } from "@/utils"
import { times } from "lodash"

/* 房间原型拓展   --任务  --任务发布便捷函数 */
export default class RoomMissonPublish extends Room {
    /**
     * 搬运任务发布函数
     * @param creepData 爬虫绑定信息，例如：{'repair':{num:1,bind:[]},'build':{num:2,bind:[]}}
     * @param delayTick 任务的超时时间，如果不想设置超时可以设置为99999 
     * @param sR        提取资源的建筑所在房间
     * @param sX        提取资源的建筑X坐标
     * @param sY        提取资源的建筑Y坐标
     * @param tR        存放资源的建筑所在房间
     * @param tX        存放资源的建筑X坐标
     * @param tY        存放资源的建筑Y坐标
     * @param rType     资源类型[可选] 例如： 'energy' 或者 'XLH2O'等 没有则默认为全部资源
     * @param num       要搬运的数量[可选]
     * @returns         任务对象
     */
    public Public_Carry(creepData: BindData, delayTick: number, sR: string, sX: number, sY: number, tR: string, tX: number, tY: number, rType?: ResourceConstant, num?: number): MissionModel {
        var thisTask: MissionModel =
        {
            name: '物流运输',
            CreepBind: creepData,
            range: 'Creep',
            delayTick: delayTick,
            cooldownTick: 1,
            maxTime: 3,
            Data: {
                sourceRoom: sR,
                sourcePosX: sX,
                sourcePosY: sY,
                targetRoom: tR,
                targetPosX: tX,
                targetPosY: tY,
            }
        }
        if (rType) thisTask.Data.rType = rType
        if (num) thisTask.Data.num = num
        return thisTask
    }

    /**
     * 修墙任务的发布函数
     * @param Rtype     维修范围： global->全局维修 special->黄黑旗下建筑维修 nuker->核弹防御
     * @param num       任务相关维修爬数量
     * @param boostType boost类型 null->无boost LH/LH2O/XLH2O是boost类型
     * @param vindicate 是否减少爬虫部件(一般用于正常维护，而非战时)
     * @returns         任务对象
     */
    public public_repair(Rtype: 'global' | 'special' | 'nuker', num: number, boostType: ResourceConstant, vindicate: boolean): MissionModel {
        var thisTask: MissionModel = {
            name: '墙体维护',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                RepairType: Rtype,
                num: num,
                boostType: boostType,
                vindicate: vindicate
            },
            maxTime: 3
        }
        thisTask.CreepBind = { 'repair': { num: num, bind: [] } }
        if (boostType && isInArray(['LH', 'LH2O', 'XLH2O'], boostType)) {
            thisTask.LabMessage = { [boostType]: 'boost' }
        }
        thisTask.maxTime = 3
        return thisTask
    }

    /**
     *                  C计划 即占领一个房间开启安全模式，建造wall，保护主房
     * @param disRoom   目标房间
     * @returns         任务对象
     */
    public public_planC(disRoom: string, Cnum: number, upNum: number, shard?: shardName,): MissionModel {
        var thisTask: MissionModel = {
            name: 'C计划',
            range: 'Creep',
            delayTick: 20500,
            level: 10,
            Data: {
                state: 0,
                disRoom: disRoom,
            },
        }
        thisTask.reserve = true
        if (!shard) {
            thisTask.Data.shard = Game.shard.name
            thisTask.CreepBind = { 'cclaim': { num: Cnum, bind: [] }, 'cupgrade': { num: upNum, bind: [] } }
        }
        else {
            thisTask.Data.shard = shard
            thisTask.CreepBind = { 'cclaim': { num: Cnum, bind: [], interval: 1000 }, 'cupgrade': { num: upNum, bind: [], interval: 1000 } }
        }
        return thisTask
    }

    /**
     *                  link传任务发布函数
     * @param structure 传送的link
     * @param dislink   目的link
     * @param level     传送任务等级
     * @param delayTick 过期时间
     * @returns         任务对象
     */
    public Public_link(structure: string[], dislink: string, level: number, delayTick?: number): MissionModel {
        var thisTask: MissionModel = {
            name: '链传送能',
            range: 'Structure',
            delayTick: 20,
            structure: structure,
            level: level,
            Data: {
                disStructure: dislink
            }
        }
        if (delayTick) thisTask.delayTick = delayTick
        return thisTask
    }

    /**
     *                  拆迁任务发布函数
     * @param disRoom   目标房间
     * @param num       数量
     * @param interval  时间间隔
     * @param boost     是否boost
     * @returns         任务对象
     */
    public Public_dismantle(disRoom: string, num: number, interval?: number, boost?: boolean, shard?: shardName): MissionModel {
        var thisTask: MissionModel = {
            name: '黄球拆迁',
            range: 'Creep',
            delayTick: 20500,
            level: 10,
            Data: {
                disRoom: disRoom,
                num: num,
                shard: shard
            },
        }
        thisTask.reserve = true
        if (this.controller.level <= 5) thisTask.Data.boost = false
        if (boost) {
            thisTask.Data.boost = true
            thisTask.LabMessage = { 'XZHO2': 'boost', 'XZH2O': 'boost' }
        }
        thisTask.CreepBind = { 'dismantle': { num: 0, interval: interval ? interval : 1200, bind: [], MSB: (boost ? true : false) } }
        return thisTask
    }

    public public_Nuker(): MissionModel {
        var thisTask: MissionModel = {
            name: '核弹填充',
            range: 'Structure',
            delayTick: 1000,
            maxTime: 1
        }
        return thisTask
    }
    /* 外矿开采任务发布函数 */
    public public_OutMine(sourceRoom: string, x: number, y: number, disRoom: string): MissionModel {
        var pos = new RoomPosition(x, y, sourceRoom)
        if (!this.memory.StructureIdData.storageID) return null
        if (!pos) return null
        // 检查是否已经存在重复任务了
        for (var i of this.memory.Misson['Creep']) {
            if (i.name == '外矿开采' && i.Data.disRoom == disRoom)
                return null
        }
        var thisTask: MissionModel = {
            name: '外矿开采',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                disRoom: disRoom,
                startpoint: zipPosition(pos)
            },
        }
        thisTask.CreepBind = { 'out-claim': { num: 0, bind: [] }, 'out-harvest': { num: 0, bind: [], MSB: true }, 'out-mineral': { num: 0, bind: [] }, 'out-car': { num: 0, bind: [] }, 'out-defend': { num: 0, bind: [] } }
        return thisTask
    }

    /* 外矿红球防守任务发布函数 */
    public public_red_out(disRoom: string): MissionModel {
        var thisTask: MissionModel = {
            name: '外矿红球防守',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                disRoom: disRoom,
            },
            maxTime: 1//同时存在任务数
        }
        thisTask.CreepBind = { 'out-attack': { num: 1, bind: [] } }
        return thisTask
    }

    /* 红球防御任务发布函数 */
    public public_red_defend(num: number): MissionModel {
        var thisTask: MissionModel = {
            name: '红球防御',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {},
        }
        thisTask.CreepBind = {}
        thisTask.CreepBind['defend-attack'] = { num: num, bind: [] }
        thisTask.LabMessage = { 'XZHO2': 'boost', 'XUH2O': 'boost' }
        return thisTask
    }

    /* 蓝球防御任务发布函数 */
    public public_blue_defend(num: number): MissionModel {
        var thisTask: MissionModel = {
            name: '蓝球防御',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {}
        }
        thisTask.CreepBind = {}
        thisTask.CreepBind['defend-range'] = { num: num, bind: [] }
        thisTask.LabMessage = { 'XZHO2': 'boost', 'XKHO2': 'boost' }
        return thisTask
    }

    /* 双人小队防御任务发布函数 */
    public public_double_defend(num: number): MissionModel {
        var thisTask: MissionModel = {
            name: '双人防御',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {}
        }
        thisTask.CreepBind = {}
        thisTask.CreepBind['defend-douAttack'] = { num: num, bind: [] }
        thisTask.CreepBind['defend-douHeal'] = { num: num, bind: [] }
        thisTask.LabMessage = { 'XZHO2': 'boost', 'XUH2O': 'boost', 'XLHO2': 'boost', 'XGHO2': 'boost' }
        return thisTask
    }

    /* 控制器攻击 */
    public Public_control(disRoom: string, body: number, num: number, interval: number, shard: shardName): MissionModel {
        var thisTask: MissionModel = {
            name: '控制攻击',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                disRoom: disRoom,
                shard: shard,
                num: num,
                body: body,
                interval: interval,
            },
        }
        thisTask.reserve = true
        if (body == 1)
            thisTask.CreepBind = { 'claim-attack': { num: num, interval: interval, bind: [] } }
        if (body == 2)
            thisTask.CreepBind = { 'out-claim': { num: num, interval: interval, bind: [] } }
        return thisTask
    }

    /* 普通冲级任务发布函数 */
    public public_normal(num: number, boostType: ResourceConstant | null): MissionModel {
        var thisTask: MissionModel = {
            name: '普通冲级',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
            },
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'rush': { num: num > 2 ? 2 : num, bind: [] } }
        if (boostType) {
            thisTask.LabMessage = { [boostType]: 'boost' }
        }
        return thisTask
    }

    /* 急速冲级任务发布函数 */
    public Public_quick(num: number, boostType: ResourceConstant | null): MissionModel {
        var thisTask: MissionModel = {
            name: '急速冲级',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                boost: boostType ? true : false
            },
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'rush': { num: num, bind: [] } }
        if (boostType && isInArray(['GH', 'GH2O', 'XGH2O'], boostType)) {
            thisTask.LabMessage = { [boostType]: 'boost' }
        }
        return thisTask
    }

    /* 扩张援建任务发布函数 */
    public Public_expand(disRoom: string, shard: shardName, num: number, cnum?: number, time?: number, defend: boolean = false): MissionModel {
        var thisTask: MissionModel = {
            name: '扩张援建',
            range: 'Creep',
            delayTick: 99999,
            level: 10,
            Data: {
                disRoom: disRoom,
                shard: shard,
                defend: defend
            },
        }
        thisTask.reserve = true
        thisTask.CreepBind = {
            'claim': { num: cnum, bind: [], interval: time ? time : 1000, MSB: defend },
            'Ebuild': { num: num, bind: [], interval: time ? time : 1000, MSB: defend },
            'Eupgrade': { num: num, bind: [], interval: time ? time : 1000, MSB: defend }
        }
        return thisTask
    }

    /* 紧急援建任务发布函数 */
    public Public_helpBuild(disRoom: string, num: number, shard?: string, time?: number): MissionModel {
        var thisTask: MissionModel = {
            name: '紧急援建',
            range: 'Creep',
            delayTick: 20000,
            level: 10,
            Data: {
                disRoom: disRoom,
                num: num,
                shard: shard ? shard : Game.shard.name
            },
            maxTime: 2,
            reserve: true
        }
        thisTask.reserve = true
        thisTask.CreepBind = {
            'architect': { num: num, bind: [], interval: time ? time : 1000 },
        }
        thisTask.LabMessage = { 'XZHO2': 'boost', 'XLH2O': 'boost', 'XLHO2': 'boost', 'XGHO2': 'boost', 'XKH2O': 'boost' }
        return thisTask
    }

    /* 紧急支援任务发布函数 */
    public Public_support(disRoom: string, sType: 'double', shard: shardName, num: number = 1, boost: boolean): MissionModel {
        var thisTask: MissionModel = {
            name: '紧急支援',
            range: 'Creep',
            delayTick: 20000,
            level: 10,
            Data: {
                disRoom: disRoom,
                sType: sType,
                boost: boost
            },
            maxTime: 3
        }
        thisTask.reserve = true
        if (sType == 'double') {
            thisTask.CreepBind = { 'double-attack': { num: num, bind: [], interval: 1000 }, 'double-heal': { num: num, bind: [], interval: 1000 } }
        }
        else if (sType == 'aio') {

        }
        if (shard) thisTask.Data.shard = shard
        else thisTask.Data.shard = Game.shard.name

        return thisTask
    }

    /* 双人攻击发布函数 */
    public Public_doubleDismantle(FlagName: string, type: string, num: number, shard?: string, time?: number): MissionModel {
        var thisTask: MissionModel = {
            name: '双人攻击',
            range: 'Creep',
            delayTick: 99999,
            level: 3,
            Data: {
                FlagName: FlagName,
                shard: shard ? shard : Game.shard.name
            },
            maxTime: 5//同时存在任务数
        }
        thisTask.reserve = true
        if (type == 'attack') {
            thisTask.CreepBind = { 'double-attack': { num: num, bind: [], interval: time ? time : 1000 }, 'double-heal': { num: num, bind: [], interval: time ? time : 1000 } }
            thisTask.LabMessage = { 'XZHO2': 'boost', 'XUH2O': 'boost', 'XLHO2': 'boost', 'XGHO2': 'boost', 'XKHO2': 'boost' }
        }
        if (type == 'work') {
            thisTask.CreepBind = { 'double-work': { num: num, bind: [], interval: time ? time : 1000 }, 'double-heal': { num: num, bind: [], interval: time ? time : 1000 } }
            thisTask.LabMessage = { 'XZHO2': 'boost', 'XZH2O': 'boost', 'XLHO2': 'boost', 'XGHO2': 'boost' }
        }
        return thisTask
    }

    /* 签名任务发布函数 */
    public Public_sig(disRoom: string, text: string, shard?: string): MissionModel {
        var thisTask: MissionModel = {
            name: '签名',
            range: 'Creep',
            delayTick: 10,
            level: 20,
            Data: {
                disRoom: disRoom,
                text: text,
            },
            reserve: true
        }
        if (shard) thisTask.Data.shard = shard;
        else thisTask.Data.shard = Game.shard.name;
        thisTask.CreepBind = { 'sig': { num: 1, bind: [] } };
        return thisTask;
    }

    /* 掠夺者任务发布函数 */
    public Public_loot(sourceFlagName: string, targetStructureId: string, num: number): MissionModel {
        var thisTask: MissionModel = {
            name: '掠夺者',
            range: 'Creep',
            delayTick: 99999,
            level: 11,
            Data: {
                sourceFlagName: sourceFlagName,
                targetStructureId: targetStructureId,
                myroomname: this.name,
            }
        }
        thisTask.CreepBind = { 'loot': { num: num ? num : 1, bind: [] } };
        return thisTask;
    }

    /* 一体机任务发布函数 */
    public Public_AIO(FlagName: string, num: number, level: number, shard?: string, time?: number): MissionModel {
        var thisTask: MissionModel = {
            name: '一体机',
            range: 'Creep',
            delayTick: 99999,
            level: 3,
            Data: {
                FlagName: FlagName,
                level: level,
                shard: shard ? shard : Game.shard.name
            },
            maxTime: 5//同时存在任务数
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'AIO': { num: num, bind: [], interval: time ? time : 1000, MSB: true }, }
        if (level != 3)
            thisTask.LabMessage = { 'XZHO2': 'boost', 'XGHO2': 'boost', 'XLHO2': 'boost', 'XKHO2': 'boost' }
        return thisTask
    }



    /* 资源传送任务发布函数 */
    public Public_Send(disRoom: string, rType: ResourceConstant, num: number): MissionModel {
        if (!this.memory.StructureIdData.terminalID) return null
        var terminal = Game.getObjectById(this.memory.StructureIdData.terminalID) as StructureTerminal
        if (!terminal) {
            delete this.memory.StructureIdData.terminalID
            return null
        }
        var thisTask: MissionModel = {
            name: '资源传送',
            range: 'Structure',
            delayTick: 2500,
            structure: [terminal.id],
            level: 5,
            Data: {
                disRoom: disRoom,
                rType: rType,
                num: num
            },
            maxTime: 8
        }
        return thisTask
    }

    /**
     *  资源购买任务发布函数 做多同时允许3个
     * @param res   要购买的资源
     * @param num   要购买的数量
     * @param range 价格波动可接受区间
     * @param max   最高接受的价格
     * @param type   'buy' | 'sell'
     * @returns     任务对象
     */
    public Public_Buy(type: 'deal' | 'sell', res: ResourceConstant, num: number, range: number, max: number, time?: number): MissionModel {
        if (!this.memory.StructureIdData.terminalID) return null
        var terminal = Game.getObjectById(this.memory.StructureIdData.terminalID) as StructureTerminal
        if (!terminal) {
            delete this.memory.StructureIdData.terminalID
            return null
        }
        /* 开始进行任务 */
        var thisTask: MissionModel = {
            name: '资源购买',
            range: 'Structure',
            structure: [terminal.id],
            delayTick: time ? time : 60,
            level: 10,
            maxTime: 3,
            Data: {
                rType: res,
                num: num,
                range: range,
                type: type
            }
        }
        thisTask.Data.maxPrice = max ? max : 35
        return thisTask
    }

    /* 资源合成 */
    public public_Compound(num: number, disResource: ResourceConstant): MissionModel {
        // 检验阶段
        if (!this.memory.StructureIdData.labInspect || Object.keys(this.memory.StructureIdData.labInspect).length < 3) return null
        var raw1 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw1) as StructureLab
        var raw2 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw2) as StructureLab
        if (!raw1) { delete this.memory.StructureIdData.labInspect.raw1; return }
        if (!raw2) { delete this.memory.StructureIdData.labInspect.raw2; return }
        for (var i of this.memory.StructureIdData.labInspect.com) {
            var thisLab = Game.getObjectById(i) as StructureLab
            if (!thisLab) {
                var index = this.memory.StructureIdData.labInspect.com.indexOf(i)
                this.memory.StructureIdData.labInspect.com.splice(index, 1)
                continue
            }
        }
        var raw1str = LabMap[disResource].raw1
        var raw2str = LabMap[disResource].raw2
        /* 开始进行任务 */
        var thisTask: MissionModel = {
            name: '资源合成',
            range: 'Room',
            delayTick: 99999,
            processing: true,
            level: 10,
            LabBind: {
            },
            Data: {
                num: num
            }
        }
        thisTask.LabMessage = {}
        thisTask.LabMessage[raw1str] = 'raw'
        thisTask.LabMessage[raw2str] = 'raw'
        thisTask.LabMessage[disResource] = 'com'
        thisTask.Data.raw1 = raw1str
        thisTask.Data.raw2 = raw2str
        return thisTask
    }


    public public_pb_attack(myroomname: string, FlagName: string, healerCreepName: string, num: number, time: number, boost: string): MissionModel {
        var thisTask: MissionModel = {
            name: 'pb',
            range: 'Creep',
            delayTick: 5000,
            level: 11,
            Data: {
                myroomname: myroomname,
                FlagName: FlagName,
                healerCreepName: healerCreepName,
                boost: boost,
            },
            maxTime: 3//同时存在任务数
        }
        thisTask.reserve = true
        if (boost == 't1') {
            thisTask.LabMessage = { 'UH': 'boost', 'LO': 'boost' }
        }
        else if (boost == 't2') {
            thisTask.LabMessage = { 'UH2O': 'boost', 'LHO2': 'boost' }
        }
        else if (boost == 't3') {
            thisTask.LabMessage = { 'XUH2O': 'boost', 'XLHO2': 'boost' }
        }
        thisTask.CreepBind = { 'pb_attack': { num: num, bind: [], interval: time ? time : 1000 }, 'pb_heal': { num: num, bind: [], interval: time ? time : 1000 } }
        return thisTask
    }
    public public_pb_transfer(myroomname: string, FlagName: string, pbroomname: string, pbx: number, pby: number, num: number, time: number): MissionModel {
        var thisTask: MissionModel = {
            name: 'pb',
            range: 'Creep',
            delayTick: 2200,
            processing: true,
            level: 12,
            Data: {
                myroomname: myroomname,
                pbroomname: pbroomname,
                FlagName: FlagName,
                pbx: pbx,
                pby: pby,
            },
            maxTime: 3//同时存在任务数
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'pb_transfer': { num: num, bind: [], interval: time ? time : 100000 }, }
        return thisTask
    }
    public public_dp_harvest(myroomname: string, FlagName: string, transferCreepName: string, num: number, time: number, boost: string): MissionModel {
        var thisTask: MissionModel = {
            name: 'dp_harvest',
            range: 'Creep',
            delayTick: 50000,
            level: 12,
            Data: {
                myroomname: myroomname,
                FlagName: FlagName,
                transferCreepName: transferCreepName,
                boost: boost,
            },
            maxTime: 5//同时存在任务数
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'dp_harvest': { num: num, bind: [], interval: time ? time : 1000, MSB: boost ? true : undefined }, }
        if (boost == 't1') {
            thisTask.LabMessage = { 'UO': 'boost' }
        }
        else if (boost == 't2') {
            thisTask.LabMessage = { 'UHO2': 'boost' }
        }
        else if (boost == 't3') {
            thisTask.LabMessage = { 'XUHO2': 'boost' }
        }
        return thisTask
    }
    public public_dp_transfer(myroomname: string, FlagName: string, harvestCreepName: string, num: number, time: number): MissionModel {
        var thisTask: MissionModel = {
            name: 'dp_transfer',
            range: 'Creep',
            delayTick: 50000,
            level: 12,
            Data: {
                myroomname: myroomname,
                FlagName: FlagName,
                transferCreepName: harvestCreepName,
                creeptimebool: true,
            },
            maxTime: 5//同时存在任务数
        }
        thisTask.reserve = true
        thisTask.CreepBind = { 'dp_transfer': { num: num, bind: [], interval: time ? time : 1000 }, }
        return thisTask
    }

    /* 四人小队任务发布函数 */
    public public_squad(disRoom: string, shard: shardName, interval: number, RNum: number, ANum: number, DNum: number, HNum: number, AIONum: number, flag: string): MissionModel {
        var thisTask: MissionModel = {
            name: '四人小队',
            range: 'Creep',
            delayTick: 40000,
            level: 10,
            Data: {
                disRoom: disRoom,
                shard: shard,
                flag: flag
            },
            CreepBind: {},
            maxTime: 3,
            reserve: true
        }
        if (RNum + ANum + DNum + HNum + AIONum != 4) return null    // 防止数量不对
        if (HNum != 2 && AIONum != 4) return null   // 防止搭配不均
        let creepData = {
            'x-range': { num: RNum, bd: ['XZHO2', 'XLHO2', 'XKHO2', 'XGHO2'] },//篮球
            'x-heal': { num: HNum, bd: ['XZHO2', 'XLHO2', 'XKHO2', 'XGHO2'] },//绿球
            'x-aio': { num: AIONum, bd: ['XZHO2', 'XLHO2', 'XKHO2', 'XGHO2'] },//一体机
            'x-attack': { num: ANum, bd: ['XZHO2', 'XUH2O', 'XGHO2'] },//红球
            'x-dismantle': { num: DNum, bd: ['XZHO2', 'XZH2O', 'XGHO2'] },//黄球
        }
        let tbd = []
        for (var i in creepData) {
            if (creepData[i].num > 0) {
                thisTask.CreepBind[i] = { num: creepData[i].num, bind: [], interval: interval }
                for (var j of creepData[i].bd) {
                    if (!isInArray(tbd, j)) tbd.push(j)
                }
            }
        }
        let mes: LabMessageData = {}
        for (let tbdRes of tbd) {
            mes[tbdRes] = 'boost'
        }
        thisTask.LabMessage = mes
        return thisTask
    }

    /* 资源转移任务发布函数 */
    public public_resource_transfer(disRoom: string, resource?: ResourceConstant, num?: number): MissionModel {
        var thisTask: MissionModel = {
            name: '资源转移',
            range: 'Room',
            delayTick: 40000,
            level: 10,
            Data: {
                disRoom: disRoom,
                rType: resource ? resource : null,
                num: num ? num : 8000000,
            },
            maxTime: 1,
        }
        return thisTask
    }

    /**
     * @param naFlagName 拿资源建筑上的旗子名字
     * @param toFlagName 放资源建筑上的旗子名字
     * @param cnum 爬的数量
     * @param level 防御等级 0无强化 1强化 2有防御强化 3双人小队
     * @param rtype 运输的资源类型
     * @param rnum 资源数量
     * @param interval 孵化间隔时间
     * @param nashardName 拿资源的shard
     * @param toshardName 放资源的shard
     */
    public public_carry_shard(naFlagName: string, toFlagName: string, cnum: number, level: number, rtype: ResourceConstant, rnum: number, interval: number, nashardName: shardName = Game.shard.name as shardName, toshardName: shardName = Game.shard.name as shardName): MissionModel {
        var thisTask: MissionModel = {
            name: '跨shard运输',
            range: 'Creep',
            delayTick: 99999,
            level: 3,
            Data: {
                naFlagName: naFlagName,
                toFlagName: toFlagName,
                level: level,
                type: rtype,
                num: rnum,
                nashardName: nashardName,
                toshardName: toshardName
            },
            maxTime: 5//同时存在任务数
        }
        thisTask.reserve = true
        if (level >= 3) thisTask.CreepBind = { 'carryShard': { num: cnum, bind: [], interval: interval, MSB: true }, 'double-heal': { num: cnum, interval: interval, bind: [] } }
        else thisTask.CreepBind = { 'carryShard': { num: cnum, bind: [], interval: interval, MSB: true }, }
        switch (level) {
            case 1: thisTask.LabMessage = { 'XKH2O': 'boost', 'XZHO2': 'boost' }; break
            case 2: thisTask.LabMessage = { 'XKH2O': 'boost', 'XZHO2': 'boost', 'XGHO2': 'boost', 'XLHO2': 'boost' }; break
            case 3: thisTask.LabMessage = { 'XKH2O': 'boost', 'XZHO2': 'boost', 'XGHO2': 'boost', 'XLHO2': 'boost' }; break
        }
        return thisTask
    }
}