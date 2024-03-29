interface PowerCreepMemory {
    role?: string
    belong?: string
    spawn?: string
    MissionData?: any  // 处理任务过程中任务的信息
    MissionState?: number
    shard?: shardName
    working?: boolean
    nuke?: { on?: boolean, exitRoom?: string, exitPos?: { x: number, y: number, roomName: string } }   //躲避核弹
}

interface PowerCreep {
    ManageMisson(): void
    OpsPrepare(): boolean

    handle_nuke(): boolean
    handle_pwr_storage(): void
    handle_pwr_tower(): void
    handle_pwr_lab(): void
    handle_pwr_extension(): void
    handle_pwr_spawn(): void
    handle_pwr_factory(): void
    handle_pwr_powerspawn(): void
    handle_pwr_source(): void
    handle_pwr_mineral(): void 

    withdraw_(distination: Structure, rType: ResourceConstant): void
    transfer_(distination: Structure, rType: ResourceConstant): void
    optTower(otype: 'heal' | 'attack', creep: PowerCreep): void 
}