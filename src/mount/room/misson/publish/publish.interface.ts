interface Room {
    Public_Carry(creepData:BindData,delayTick:number,sR:string,sX:number,sY:number,tR:string,tX:number,tY:number,rType?:ResourceConstant,num?:number):MissionModel
    public_repair(Rtype:'global' | 'special' | 'nuker',num:number,boostType:ResourceConstant,vindicate:boolean):MissionModel
    public_planC(disRoom:string,Cnum:number,upNum:number,shard?:shardName,):MissionModel
    Public_link(structure:string[],disStructure:string,level:number,delayTick?:number):MissionModel
    Public_dismantle(disRoom:string,num:number,interval?:number,boost?:boolean):MissionModel
    Check_Lab(misson:MissionModel,role:string,tankType:'storage' | 'terminal' | 'complex')
    Public_quick(num:number,boostType:ResourceConstant | null):MissionModel
    Public_expand(disRoom:string,num:number,cnum?:number):MissionModel
    Public_support(disRoom:string,sType:'double' | 'aio' | 'squard',shard?:string):MissionModel
    Public_control(disRoom:string,shard:shardName,interval:number):MissionModel
    Public_helpBuild(disRoom:string,num:number,shard?:string,time?:number):MissionModel
    Public_sig(disRoom: string, text: string, shard?: string): MissionModel
    Public_loot(sourceFlagName: string, targetStructureId: string): MissionModel 
}