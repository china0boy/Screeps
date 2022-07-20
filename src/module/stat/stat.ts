import { AppLifecycleCallbacks } from "../framework/types"
import {stateScanner} from "@/utils"

/* 平均cpu统计相关 */
export function statCPU(): void {
    var mainEndCpu = Game.cpu.getUsed()
    if (!global.CpuData) global.CpuData = []
    global.UsedCpu = mainEndCpu
    let length_i = 200;
    if (global.CpuData.length >= length_i) {
        global.CpuData = global.CpuData.slice(1);
    }    
    global.CpuData.push(global.UsedCpu)
    /* 计算平均cpu */
    var AllCpu = 0
    for (var cData of global.CpuData) {
        AllCpu += cData
    }
    global.AveCpu = AllCpu / global.CpuData.length
}

export function stat():void{
    stateScanner()
    statCPU()
}

export const statMoudle:AppLifecycleCallbacks ={
    tickEnd:stat
}
