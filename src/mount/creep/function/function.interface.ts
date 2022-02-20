/**
 * 功能相关声明
 */
interface Creep {
    workstate(rType: ResourceConstant): void
    harvest_(source_: Source): void
    transfer_(distination: Structure, rType: ResourceConstant): ScreepsReturnCode
    upgrade_(): void
    build_(distination: ConstructionSite): void
    repair_(distination: Structure): void
    withdraw_(distination: Structure | Ruin, rType: ResourceConstant): ScreepsReturnCode
    BoostCheck(boostBody: string[]): boolean
}