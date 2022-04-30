/**
 * 功能相关声明
 */
interface Creep {
    handle_nuke(): boolean 
    workstate(rType: ResourceConstant): void
    harvest_(source_: Source | Mineral): void
    transfer_(distination: Structure, rType: ResourceConstant): ScreepsReturnCode
    upgrade_(): void
    build_(distination: ConstructionSite): void
    harvest_Mineral(creep: Creep): void
    repair_(distination: Structure): void
    withdraw_(distination: Structure | Ruin, rType: ResourceConstant): ScreepsReturnCode
    BoostCheck(boostBody: string[]): boolean
    unBoost(): boolean
    optTower(otype:'heal'|'attack',creep:Creep):void
    isInDefend(creep:Creep):boolean
    closestCreep(creep:Creep[],hurt?:boolean):Creep
}