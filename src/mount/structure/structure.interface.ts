interface StructureLink {
    ManageMission(): void
}
interface StructureTerminal {
    ManageMission(): void
    ResourceBalance(): void
    ResourceSend(task: MissionModel): void
    ResourceDeal(task: MissionModel): void
    OrderEnergy(type: MarketResourceConstant, num: number, max: number): string
    CreatingResourceBalance(type: ResourceConstant, num: number, fill: boolean): void
    init(num: number, fill: boolean): void
}

interface StructureObserver {
    stats(): string
    work(): void
    setmax(type: 'powerbank' | 'deposit', max: number): string
}
interface StructureFactory {
    ManageMission(): void
    addData(type: CommodityConstant | MineralConstant | "energy" | "G", num: number): string
}
interface RoomMemory {
    TerminalData: { [resource: string]: { num: number, fill?: boolean } }
    market: MarketData
    Factory: {
        factoryData: { [resource in CommodityConstant | MineralConstant | "energy" | "G"]?: { num?: number, fill?: boolean } }                       //资源平衡
        produce: { [resource in CommodityConstant | MineralConstant | "energy" | "G"]?: boolean }               //合成
        dataProduce: { [resource in CommodityConstant | MineralConstant | "energy" | "G"]?: { num?: number } }//固定数量合成
        automation_Bar: { [resource in CommodityConstant | MineralConstant | "energy" | "G"]?: { num?: number } }//监测化合物自动合成bar
        level: number
    }
    pausePS?: boolean//powerSpawn的开关
    energyPS: number //powerSpawn的限制最低能量
    // observer 内存
    observer: {
        // 上个 tick 已经 ob 过的房间名
        checkRoomName?: string
        // 遍历 watchRooms 所使用的索引
        watchIndex: number
        // 监听的房间列表
        watchRooms: string[]
        // 当前已经找到的 powerBank 和 deposit 的数量，observer 找到后会增加该数值，采集 creep 采集完之后会减少该数值
        pbNumber: number
        depositNumber: number
        // 和上面两个对应，分别是 powerBank 和 deposit 的查找上限，由玩家通过 api 指定。两者默认值均为 1
        pbMax: number
        depositMax: number
        // 是否暂停，为 true 时暂停
        pause?: boolean
        //是否boost
        boost?: any
    }
}

interface MarketData {
    [kind: string]: LittleMarketData[]
}
interface LittleMarketData {
    rType: ResourceConstant
    num: number
    price?: number
    unit?: number    // terminal量
    id?: string      // 交易ID
    continue?: boolean   // 卖完了一批次是否填充
    changePrice?: boolean    // 是否需要修改价格
    time?: number
}