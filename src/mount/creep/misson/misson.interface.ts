/**
 * 任务相关声明
 */
interface Creep {
    ManageMisson(): void

    // 任务
    handle_feed(): void
    handle_carry(): void
    handle_repair(): void
    handle_planC(): void
    handle_dismantle(): void
    handle_quickRush(): void
    handle_expand(): void
    handle_support(): void
    handle_control(): void
    handle_helpBuild(): void
    handle_sig(): void
    handle_loot(): void
    handle_AIO(): void
    handle_doubleDismantle(): void
    handle_dp(): void
    handle_pb(): void
    handle_outmine(): void
    handle_out_attack(): void
    handle_out_range(): void
    handle_defend_attack(): void
    handle_defend_range(): void
    handle_defend_double(): void
    handle_task_squard(): void
    handle_carry_shard(): void
    handle_normalRush(): void

    //爬的一些动作
    handle_ranged_attack(attackcreep: Creep, bool?: boolean): boolean
    handle_heal(healcreep?: Creep, bool?: boolean): boolean
}

interface CreepMemory {
    MissionData?: any
    double?: string  // 双人小队
    captain?: boolean
    swith?: boolean
    unBoostContainer?: Id<StructureContainer>
    unBoostRoom?: string
    num?: number
    //外矿
    disPos?: string//source的pos
    bindpoint?: string//source的id
    containerId?: string//小罐子的id

    controlledBySquardFrame?: boolean
    squad?: Squad
    arrived?: boolean

    targetFlag?: string

    nuke?: { on?: boolean, exitRoom?: string, exitPos?: { x: number, y: number, roomName: string } }   //躲避核弹
}

/**
 * 包含 store 属性的建筑
 */
type StructureWithStore = StructureStorage | StructureContainer | StructureExtension | StructureFactory | StructureSpawn | StructurePowerSpawn | StructureLink | StructureTerminal | StructureNuker