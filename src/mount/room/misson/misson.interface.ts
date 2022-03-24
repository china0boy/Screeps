interface Room {
    /* 任务框架 */
    MissionManager(): void
    AddMission(mis: MissionModel): boolean
    DeleteMission(id: string): boolean
    RoleMissionNum(role: string, name: string): number
    GainMission(id: string): MissionModel | null
    MissionNum(range: string, name: string): number
    Check_Carry(role: string, source: RoomPosition, pos: RoomPosition, rType?: ResourceConstant): boolean
    Check_Lab(misson: MissionModel, role: string, tankType: 'storage' | 'terminal' | 'complex'): boolean
    Check_Link(source: RoomPosition, pos: RoomPosition): boolean
    Check_Buy(resource:ResourceConstant):boolean
    MissionName(range:string,name:string):MissionModel|null

    // 主动任务
    Spawn_Feed(): void
    Constru_Build(): void
    Tower_Feed(): void
    Lab_Feed(): void
    Nuker_Feed(): void
    Task_CenterLink(): void
    Task_Clink(): void
    Task_ComsumeLink(): void
    Nuke_Defend(): void
    Task_CompoundDispatch():void
    Task_Auto_Defend():void

    // 被动任务
    Task_Carry(misson: MissionModel): void
    Task_Repair(mission: MissionModel): void
    Task_dismantle(mission: MissionModel): void
    Task_AIO(mission: MissionModel): void
    Task_Quick_upgrade(mission: MissionModel): void
    Task_HelpDefend(mission: MissionModel): void
    Task_doubleDismantle(mission: MissionModel): void
    Task_HelpBuild(mission: MissionModel): void
    Task_Compound(misson:MissionModel):void
    Task_Red_Defend(mission:MissionModel):void
    Task_Blue_Defend(mission:MissionModel):void
    Task_Double_Defend(mission:MissionModel):void
    Task_OutMine(misson:MissionModel):void
    Task_squad(mission:MissionModel):void
}

interface RoomMemory {
    Misson: { [range: string]: MissionModel[] }  // 任务
    RoomLabBind?: RoomLabBind
    CoolDownDic: { [Name: string]: number }      /* 冷却时间的哈希表 key为任务名 */
    nukeID?: string[]
    nukeData?: NukeData
    ComDispatchData?:{[re in ResourceConstant]?:{ok?:boolean,dispatch_num:number}}
    enemy?:enemyAllotData
}

interface NukeData {
    damage: { [str: string]: number }// 地形伤害数据
    rampart: { [str: string]: number }   // 初始rampart防御数据
}
/* 房间任务模板 */
interface MissionModel {
    /* 所有任务都必须有 */
    name: string     // 任务名称
    range: 'Room' | 'Creep' | 'Structure' | 'PowerCreep'    // 任务所属范围  新增powerCreep任务
    delayTick: number    // 过期时间
    bind?: BindData      // 绑定数据
    structure?: string[] // 与任务有关的建筑id
    state?: number       // 任务状态
    maxTime?: number     // 最大重复任务数   默认1
    LabBind?: MissonLabBind        // 实验室绑定
    cooldownTick?: number // 冷却时间        默认10
    CreepBind?: BindData  // 爬虫绑定
    level?: number        // 任务等级，越小优先级越高  默认10
    Data?: any           // 数据
    //Sata?:any           // 断链数据 [需要复制到爬虫记忆里的数据，好让爬虫自己处理]
    reserve?: boolean      //死后内存是否删除 默认删除
    /* 自动处理属性 */
    processing?: boolean // 任务是否正在被处理
    id?: string       // 每个任务的唯一标识
}

/* 任务角色绑定数据 */
interface BindData {
    [role: string]: { num: number, bind: string[], interval?: number }
}

/* 任务实验室绑定数据 */
interface MissonLabBind {
    [id: string]: string     // 建筑id 资源
}

/* 房间记忆实验室绑定数据格式 */
interface RoomLabBind {
    [id: string]: { missonID: string[], rType: ResourceConstant, occ?: boolean }     // occ为true时不允许新增占用lab
}


interface enemyAllotData{
    [myCreepName:string]:string[]   // 敌人分配
}
