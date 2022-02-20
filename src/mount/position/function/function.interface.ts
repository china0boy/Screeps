interface RoomPosition {
    getRangedStructure(sr:StructureConstant[],range:number,mode:number):Structure[] |undefined | Structure
    getClosestStructure(sr:StructureConstant[],mode:number):Structure | undefined
    directionToPos(direction: DirectionConstant) : RoomPosition | undefined
    getClosestStore():StructureExtension | StructureSpawn | StructureLab | undefined
    getSourceVoid():RoomPosition[]
    getSourceLinkVoid():RoomPosition[]
    GetStructure(stru:StructureConstant):Structure
    GetStructureList(stru:StructureConstant[]):StructureStorage[]
    GetRuin():Ruin
}
