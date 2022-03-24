import { checkDispatch, checkSend } from '@/module/fun/funtion';
import { createHelp } from '../help/help'
import { StatisticalResources } from '@/utils'
export class factoryExtension extends StructureFactory {
    public ManageMission(): void {
        this.ResourceBalance();
        this.factoryProduce();
        this.automation_Bar();
    }

    /**
     * 资源平衡函数，用于平衡房间中资源数量以及资源在factory和storage中的分布，尤其是能量和原矿
     */
    public ResourceBalance(): void {
        this.RsourceMemory();
        if (Game.time % 7) return
        // factory资源平衡
        let terminal_ = global.Stru[this.room.name]['terminal'] as StructureTerminal
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        if (!storage_) { console.log(`找不到global.Stru['${this.room.name}']['storage]!`); return }
        if (!this.room.memory.Factory || !this.room.memory.Factory.factoryData) return;
        var anytype = Object.keys(this.store)
        for (let i in this.room.memory.Factory.factoryData) if (i) anytype = _.uniq([...anytype, i])//把所有资源遍历一遍
        for (let i of anytype) {
            let CreepStore = this.room.memory.Factory.factoryData[i] && this.room.memory.Factory.factoryData[i].num < 500 ? 0 : 2450;//爬的容量
            let numT = terminal_ ? terminal_.store[i] : 0   //终端数量
            if (this.room.RoleMissionNum('manage', '物流运输') > 2) return
            let num = this.store[i]     // 数量
            if (!this.room.memory.Factory || !this.room.memory.Factory.factoryData[i] || !this.room.memory.Factory.factoryData[i].num) {//内存没有就全拿走
                if (storage_.store.getFreeCapacity() < 10000) continue
                let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 10, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num)
                this.room.AddMission(thisTask)
            }
            else {//多了就拿走
                if (num > this.room.memory.Factory.factoryData[i].num + CreepStore) {
                    if (storage_.store.getFreeCapacity() < 10000) continue
                    let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 10, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num - this.room.memory.Factory.factoryData[i].num)
                    this.room.AddMission(thisTask)
                }
                else if ((num < (this.room.memory.Factory.factoryData[i].num - CreepStore) || num < 500) && this.room.memory.Factory.factoryData[i].fill) {//少了就放入
                    if (this.store.getFreeCapacity() < 3000 || this.room.memory.Factory.factoryData[i].num == num) continue
                    if (i == 'energy') {
                        if (storage_.store.getUsedCapacity('energy') <= 20000) continue
                    }
                    else {
                        if (storage_.store.getUsedCapacity(i as ResourceConstant) + numT < this.room.memory.Factory.factoryData[i].num - num) {//不够就资源调度
                            if (!(checkDispatch(this.room.name, i as ResourceConstant) || checkSend(this.room.name, i as ResourceConstant))) {
                                //计算调度的时候需要的量 分为固定数量合成计算 和 无脑和计算  防止你需要合大量资源的时候频繁调度小单
                                let num = 5000, a = StatisticalResources(i as ResourceConstant);
                                for (let j in this.room.memory.Factory.dataProduce) {//寻找是否是固定数量合成 因为你无法从原料来判断它是否是什么方法合成 所以只能通过合成物来看原料是不是它的
                                    if (COMMODITIES[j] && COMMODITIES[j].components[i])//固定数量合成计算
                                    {
                                        //总底物需要的数量 = 总数量*底物单次合成的数量/单次合成的数量 - 罐子 - 终端 - 工厂
                                        num = this.room.memory.Factory.dataProduce[j].num * COMMODITIES[j].components[i] / COMMODITIES[j].amount - storage_.store[i] - numT - this.store[i];
                                        num = num > a ? a : num;//看看是否全局资源比就算少，少就按全局资源来算，多就按需要的资源算
                                        for (; num >= 150000; num /= 2) { }//防止太多无法调度成功
                                        break;
                                    }
                                }
                                //无脑合计算 (大部分用不到，因为都是固定数量合)
                                if (num == 5000) {//num为5000说明上面的没找到
                                    for (let j in this.room.memory.Factory.produce) {
                                        if (COMMODITIES[j] && COMMODITIES[j].components[i]) {
                                            if (COMMODITIES[j].level) num = COMMODITIES[j].components[i] * 2;
                                            else num = COMMODITIES[j].components[i] * 5
                                            break
                                        }
                                    }
                                }
                                //资源调度
                                if (num > 0) {
                                    let dispatchTask: RDData = {
                                        sourceRoom: this.room.name,   // 请求调度资源的房间
                                        rType: i as ResourceConstant,  // 资源类型
                                        num: num,      // 数量
                                        delayTick: 500,        // 超时时间 默认 500 tick
                                        buy: false,        // 超时过后是否会寻求购买
                                    }
                                    Memory.ResourceDispatchData.push(dispatchTask);
                                }
                            }
                        }
                    }
                    if (!storage_.store[i]) continue
                    let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 10, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, i as ResourceConstant, Math.abs(this.room.memory.Factory.factoryData[i].num - num))
                    this.room.AddMission(thisTask)
                }
            }
        }
    }
    //Game.getObjectById(this.room.memory.StructureIdData.FactoryId) as StructureFactory
    /**
     * 资源记忆更新函数
     * */
    public RsourceMemory(): void {
        /* factory自身资源管理 */
        var factorylData = this.room.memory.Factory.factoryData

        /* factory自身等级管理 */
        if (this.level) { if (this.level != this.room.memory.Factory.level) this.room.memory.Factory.level = this.level }
        else this.room.memory.Factory.level = 0

        let produce = this.room.memory.Factory.produce;
        for (var i in factorylData) {
            /* 数量小于0就删除数据，节省memory */
            if (factorylData[i].num <= 0) delete factorylData[i]
        }
        for (var i in produce) {
            if (!produce[i]) delete produce[i];
        }
    }

    /**
     * 创建资源平衡
     */
    public CreatingResourceBalance(type: CommodityConstant | MineralConstant | "energy" | "G", num: number = 5000, fill: boolean = true): string {
        this.room.memory.Factory.factoryData[type] = { num: num, fill: fill };
        return `创建成功${type}:{num:${num} , fill:${fill}}`
    }

    /**
     * 删除资源平衡
     */
    public removeCreatingResourceBalance(type: CommodityConstant | MineralConstant | "energy" | "G"): string {
        if (this.room.memory.Factory.factoryData[type]) { delete this.room.memory.Factory.factoryData[type]; return `删除资源平衡成功${type}` }
        else return `删除资源平衡失败${type}`
    }

    /**
    * 添加合成
    */
    public add(type: CommodityConstant | MineralConstant | "energy" | "G"): string {
        this.room.memory.Factory.produce[type] = true;
        return `添加合成${type}`;
    }

    /**
    * 查看合成
    */
    public stats(): string {
        let Factory = this.room.memory.Factory;
        let a = '';
        for (let i in Factory.produce) {
            a += i + " ";
            if (Factory.dataProduce[i])
                a += ":" + Factory.dataProduce[i].num + "  ";
        }
        return a;
    }

    /**
    * 删除合成
    */
    public remove(type: CommodityConstant | MineralConstant | "energy" | "G"): string {
        if (this.room.memory.Factory.produce[type]) { delete this.room.memory.Factory.produce[type]; return `删除合成${type}成功`; }
        else return `删除合成${type}失败`;
    }

    /**
     * 工厂合成
     */
    public factoryProduce(): void {
        if (this.cooldown) return
        let Factory = this.room.memory.Factory;
        for (let i in Factory.dataProduce) {
            if (!COMMODITIES[i]) { delete Factory.dataProduce[i]; continue }
            if (Factory.dataProduce[i].num > 0) {
                if (COMMODITIES[i].level) {
                    if (this.levelProduce(i as CommodityConstant | MineralConstant | "energy" | "G")) return;
                }
                else {
                    if (this.Produce(i as CommodityConstant | MineralConstant | "energy" | "G")) return;
                }
            }
            //根据合成固定数量的资源创建或者删除资源平衡 专门不用else 因为上面改变了内存数量，有可能顺便就执行了这步
            if (Factory.dataProduce[i].num <= 0) {
                for (let j in COMMODITIES[i].components)//根据要合成的原料删除资源平衡
                {
                    if (Factory.factoryData[j]) this.removeCreatingResourceBalance(j as CommodityConstant | MineralConstant | "energy" | "G")
                }
                this.remove(i as CommodityConstant | MineralConstant | "energy" | "G")//删除合成
                delete Factory.dataProduce[i]//删除单个物品合成
            }
        }
    }

    /**
     * 无等级工厂合成
     */
    public Produce(type: CommodityConstant | MineralConstant | "energy" | "G"): boolean {
        let Factory = this.room.memory.Factory;
        if (!Factory.produce[type]) this.add(type as CommodityConstant | MineralConstant | "energy" | "G");//添加合成
        for (let j in COMMODITIES[type].components) {//根据要合成的原料添加资源平衡
            if (!Factory.factoryData[j]) {
                let num = 4900
                this.CreatingResourceBalance(j as CommodityConstant | MineralConstant | "energy" | "G", num);
            }
        }
        let a = Factory.produce[type] && this.produce(type)//合成
        if (a == 0) {
            if (Factory.dataProduce[type]) {//如果有单个物品合成就减少数量，没有的话就无脑合
                Factory.dataProduce[type].num -= COMMODITIES[type].amount //api里的自带的查询合成数量
            }
            return true
        }

        return false
    }


    /**
     * 有等级工厂合成
     */
    public levelProduce(type: CommodityConstant | MineralConstant | "energy" | "G"): boolean {
        let Factory = this.room.memory.Factory;
        if (!Factory.produce[type]) {
            if (Game.time % 10) return false
            for (let j in COMMODITIES[type].components) {//根据要合成的原料添加资源平衡
                if (j == 'energy' && !Factory.factoryData['energy']) {
                    this.CreatingResourceBalance('energy', 4900);
                    continue
                }

                //总底物需要的数量 = 总数量*底物单次合成的数量/单次合成的数量 
                let num = Factory.dataProduce[type].num * COMMODITIES[type].components[j] / COMMODITIES[type].amount;
                //统计全局所有的这种资源数量
                let numAll = StatisticalResources(j as CommodityConstant | MineralConstant | "energy" | "G")
                console.log(`合成：${type} 底物:${j} 需要数量:${num}   全局数量:${numAll} `)
                //我的资源是否够合高级资源，不够就先合低级  够就创建资源平衡
                if (numAll >= num) {
                    if (!Factory.factoryData[j]) {
                        let num = COMMODITIES[type].components[j]
                        if (COMMODITIES[type].level < 4)
                            num *= 4
                        this.CreatingResourceBalance(j as CommodityConstant | MineralConstant | "energy" | "G", num);
                    }
                    continue
                }
                else {
                    //检测我的房间或者其他房间是否在合成这种资源
                    if (this.findProduce(j as CommodityConstant | MineralConstant | "energy" | "G")) return false;
                    else {//创建原料合成
                        if (COMMODITIES[j].level) {//有等级就在别的房间创建生产
                            let room = this.findFactoryLevel(COMMODITIES[j].level)
                            if (!room) {//找不到这个等级的工厂就删掉
                                console.log(`因为原料不够 合成${j}时找不到${COMMODITIES[j].level}等级的工厂 删除${type}合成`);
                                Factory.dataProduce[type].num = 0;
                            }
                            else {//找到就创建生产
                                let factory = Game.getObjectById(room.memory.StructureIdData.FactoryId) as factoryExtension;
                                factory.addDataProduce(j as CommodityConstant | MineralConstant | "energy" | "G", num - numAll);
                                console.log(`合成${type}需要底物${j}不足 在${room.name}:创建${j}合成`)
                            }
                        }
                        else {//无等级就在自己的房间创建生产
                            console.log(`因为合成 ${type} 时 ${j} 不够,在 ${this.room.name} 创建 ${j} 生产`)
                            this.addDataProduce(j as CommodityConstant | MineralConstant | "energy" | "G", num - numAll)
                        }
                    }
                    return false
                }
            }
        }
        if (!Factory.produce[type]) this.add(type as CommodityConstant | MineralConstant | "energy" | "G");//添加合成

        let a = this.produce(type)//合成
        if (a == 0) {
            if (Factory.dataProduce[type]) {//如果有单个物品合成就减少数量，没有的话就无脑合
                Factory.dataProduce[type].num -= COMMODITIES[type].amount //api里的自带的查询合成数量
            }
            return true
        }
        if (a == ERR_BUSY && Factory.level == COMMODITIES[type].level && Game.powerCreeps[`${this.room.name}/queen/${Game.shard.name}`])
            this.room.enhance_factory();
        return false
    }

    /**
     * 查找其他房间是否有此物品的合成
     */
    public findProduce(type: CommodityConstant | MineralConstant | "energy" | "G"): boolean {
        for (let name in Memory.RoomControlData) {
            let room = Game.rooms[name];
            if (!room) continue;
            let Factory = room.memory.Factory;
            if (Factory.dataProduce[type]) return true;
        }
        return false;
    }

    /**
     * 查找这个等级工厂的房间
     */
    public findFactoryLevel(level: number): Room {
        for (let name in Memory.RoomControlData) {
            let room = Game.rooms[name];
            if (!room) continue;
            if (room.memory.Factory.level == level) return room;
            else continue;
        }
        return;
    }

    /**
     * 添加单个物品合成
     */
    public addDataProduce(type: CommodityConstant | MineralConstant | "energy" | "G", num: number): string {
        if (!COMMODITIES[type]) return `${type}不可合成`
        let Factory = this.room.memory.Factory
        if (!Factory.dataProduce) Factory.dataProduce = {}
        Factory.dataProduce[type] = {}
        Factory.dataProduce[type].num = num;
        return `添加合成${type} 数量:${num}`;
    }

    /**
     * 删除单个物品合成
     */
    public removeDataProduce(type: CommodityConstant | MineralConstant | "energy" | "G"): string {
        if (this.room.memory.Factory.dataProduce[type]) { this.room.memory.Factory.dataProduce[type].num = 0; return `删除合成${type}成功`; }
        else return `删除合成${type}失败`;
    }

    /**
     * 资源平衡初始化
     */
    public init(): string {
        let produce = this.room.memory.Factory.produce;
        for (var i in produce) {
            delete produce[i];
        }
        return `初始化完成`
    }

    /**
     * 确定工厂等级
     */
    public enhance_factory(): string {
        if (!Game.powerCreeps[`${this.room.name}/queen/${Game.shard.name}`]) return `${this.room.name}此房间无pc请先生成pc`
        this.room.enhance_factory();
        return `发布pc确定工厂等级任务成功`
    }

    /**
     * 添加自动检测合成压缩包
     */
    public add_Bar(types: CommodityConstant | MineralConstant | "energy" | "G", num: number): string {
        if (this.room.memory.Factory.automation_Bar === undefined) this.room.memory.Factory.automation_Bar = {}
        let type = ['U', 'L', 'K', 'Z', 'X', 'O', 'H', 'battery'];
        if (type.indexOf(types) != -1) {
            this.room.memory.Factory.automation_Bar[types] = { num: num }
            return `添加 ${type} 数量高于 ${num} 将自动发布合成压缩包任务`
        } else {
            return `输入参数不是 ${type} 中的一种  请重新输入`
        }
    }

    /**
     * 删除自动检测合成压缩包
     */
    public remove_Bar(type): string {
        if (this.room.memory.Factory.automation_Bar[type]) { delete this.room.memory.Factory.automation_Bar[type]; return `删除成功 ${type} 自动合成压缩包` }
        else return `工厂无 ${type} 自动合成  删除失败`
    }

    /**
     * 初始化自动检测合成压缩包
     */
    public init_Bar(num: number): string {
        if (this.room.memory.Factory.automation_Bar === undefined) this.room.memory.Factory.automation_Bar = {}
        let type = ['U', 'L', 'K', 'Z', 'X', 'O', 'H'];
        for (let i of type) {
            this.room.memory.Factory.automation_Bar[i] = { num: num }
        }
        return `以初始化 ${type} 数量高于 ${num} 将自动发布合成压缩包任务`
    }

    /**
     * 清空检测合成压缩包
     */
    public clear_Bar(): string {
        this.room.memory.Factory.automation_Bar = {}
        return `已清空所有自动合成压缩包`
    }

    /**
     * 自动检测合成压缩包
     */
    public automation_Bar(): void {
        if (Game.time % 1000) return
        let storage_ = global.Stru[this.room.name]['storage'] as StructureStorage
        let type = ['U', 'L', 'K', 'Z', 'X', 'O', 'H'];
        let Factory = this.room.memory.Factory
        if (Factory.automation_Bar === undefined) Factory.automation_Bar = {}
        for (let i of type) {
            if (Factory.automation_Bar[i] && storage_.store[i] >= Factory.automation_Bar[i].num) {
                for (let j in COMMODITIES[i].components) {
                    if (j != 'energy' && !Factory.dataProduce[j]) {
                        console.log(`${this.room.name}:${i}>=${Factory.automation_Bar[i].num} 自动添加合成  ${j}`)
                        this.addDataProduce(j as CommodityConstant | MineralConstant | "energy" | "G", Factory.automation_Bar[i].num * COMMODITIES[i].components[j] / COMMODITIES[i].amount); return
                    }
                }
            }
        }
    }
}


export class factoryConsole extends factoryExtension {
    /*
     * 用户操作 - 帮助
     */
    public help(): string {
        return createHelp({
            name: 'Factory 控制台',
            describe: 'Factory 默认关闭，新增资源平衡和合成就会开启。',
            api: [
                {
                    title: '添加工厂合成',
                    params: [
                        { name: 'type', desc: '合成资源类型' }
                    ],
                    functionName: 'add'
                },
                {
                    title: '删除工厂合成',
                    params: [
                        { name: 'type', desc: '删除资源类型' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '添加单个物品固定数量工厂合成',
                    params: [
                        { name: 'type', desc: '合成资源类型' },
                        { name: 'num', desc: '合成资源数量' }
                    ],
                    functionName: 'addDataProduce'
                },
                {
                    title: '删除单个物品固定数量工厂合成',
                    params: [
                        { name: 'type', desc: '删除资源类型' }
                    ],
                    functionName: 'removeDataProduce'
                },
                {
                    title: '创建资源平衡',
                    params: [
                        { name: 'type', desc: '资源类型' },
                        { name: 'num', desc: '平衡数量 (多拿少补 默认5000)' },
                        { name: 'fill', desc: '是否少补 (默认ture)' }
                    ],
                    functionName: 'CreatingResourceBalance'
                },
                {
                    title: '查看合成',
                    functionName: 'stats'
                },
                {
                    title: '确定工厂等级',
                    functionName: 'enhance_factory'
                },
                {
                    title: '添加自动检测合成压缩包',
                    params: [
                        { name: 'type', desc: '资源类型' },
                        { name: 'num', desc: '高于num发布合成压缩包任务' },
                    ],
                    functionName: 'add_Bar'
                },
                {
                    title: '删除自动检测合成压缩包',
                    params: [
                        { name: 'type', desc: '资源类型' },
                    ],
                    functionName: 'remove_Bar'
                },
                {
                    title: '初始化自动检测合成压缩包',
                    params: [
                        { name: 'num', desc: '高于num发布合成压缩包任务' },
                    ],
                    functionName: 'init_Bar'
                },
                {
                    title: '清空检测合成压缩包',
                    functionName: 'clear_Bar'
                },
            ]
        })
    }
}