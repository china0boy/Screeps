/**
 * 任务相关声明
 */
interface Creep{
    ManageMisson():void

    // 任务
    handle_feed():void
    handle_carry():void
    handle_repair():void
    handle_planC():void
    handle_dismantle():void
    handle_quickRush():void
    handle_expand():void
    handle_support():void
    handle_control():void
    handle_helpBuild():void
    handle_sig():void
    
}

interface CreepMemory{
    MissionData?:any
    double?:string  // 双人小队
    captain?:boolean
    swith?:boolean
}