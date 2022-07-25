interface Room {
    Public_Carry(creepData: BindData, delayTick: number, sR: string, sX: number, sY: number, tR: string, tX: number, tY: number, rType?: ResourceConstant, num?: number): MissionModel
    public_repair(Rtype: 'global' | 'special' | 'nuker', num: number, boostType: ResourceConstant, vindicate: boolean): MissionModel
    public_planC(disRoom: string, Cnum: number, upNum: number, shard?: shardName,): MissionModel
    public_Nuker(): MissionModel
    Public_link(structure: string[], disStructure: string, level: number, delayTick?: number): MissionModel
    Public_dismantle(disRoom: string, num: number, interval?: number, boost?: boolean, shard?: shardName): MissionModel
    Check_Lab(misson: MissionModel, role: string, tankType: 'storage' | 'terminal' | 'complex')
    Public_quick(num: number, boostType: ResourceConstant | null): MissionModel
    Public_expand(disRoom: string, shard: shardName, num: number, cnum?: number, time?: number,defend?:boolean): MissionModel
    Public_support(disRoom: string, sType: 'double', shard: shardName, num: number, boost: boolean): MissionModel
    Public_control(disRoom: string, body: number, num: number, interval: number, shard: shardName): MissionModel
    Public_helpBuild(disRoom: string, num: number, shard?: string, time?: number): MissionModel
    Public_sig(disRoom: string, text: string, shard?: string): MissionModel
    Public_loot(sourceFlagName: string, targetStructureId: string, num: number): MissionModel
    Public_AIO(FlagName: string, num: number, level: number, shard?: string, time?: number): MissionModel
    Public_doubleDismantle(FlagName: string, type: string, num: number, shard?: string, time?: number): MissionModel
    Public_Send(disRoom: string, rType: ResourceConstant, num: number): MissionModel
    public_pb_attack(myroomname: string, FlagName: string, attackCreepName: string, num: number, time: number): MissionModel
    public_pb_transfer(myroomname: string, FlagName: string, pbroomname: string, pbx: number, pby: number, num: number, time: number): MissionModel
    public_dp_harvest(myroomname: string, FlagName: string, transferCreepName: string, num: number, time: number, boost: ResourceConstant): MissionModel
    public_dp_transfer(myroomname: string, FlagName: string, harvestCreepName: string, num: number, time: number): MissionModel
    Public_Buy(type: 'deal' | 'sell', res: ResourceConstant, num: number, range: number, max: number, time?: number): MissionModel
    public_Compound(num: number, disResource: ResourceConstant): MissionModel
    Task_Red_Defend(mission: MissionModel): void
    Task_Blue_Defend(mission: MissionModel): void
    Task_Double_Defend(mission: MissionModel): void
    public_OutMine(sourceRoom: string, x: number, y: number, disRoom: string): MissionModel
    public_red_defend(num: number): MissionModel
    public_blue_defend(num: number): MissionModel
    public_double_defend(num: number): MissionModel
    public_squad(disRoom: string, shard: shardName, interval: number, RNum: number, ANum: number, DNum: number, HNum: number, AIONum: number, flag: string): MissionModel
    public_resource_transfer(disRoom: string, resource?: ResourceConstant, num?: number): MissionModel
    public_carry_shard(naFlagName: string, toFlagName: string, cnum: number, level: number, rtype: ResourceConstant, rnum: number, interval: number, nashardName: shardName, toshardName: shardName): MissionModel
    public_normal(num:number,boostType:ResourceConstant | null):MissionModel
}