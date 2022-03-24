import { random, slice } from "lodash"

/**
 * Memory初始化
 */
export function MemoryInit():void {
    if(!Memory.whitesheet) Memory.whitesheet = []
    if(!Memory.bypassRooms) Memory.bypassRooms = []
    if (!Memory.ignoreMissonName) Memory.ignoreMissonName = []
    if (!global.Gtime) global.Gtime = {}
    for (let i in Memory.RoomControlData) if (!global.Gtime[i])global.Gtime[i] = Game.time - random(1,20,false)
    if (!global.SpecialBodyData) global.SpecialBodyData = {}
    for (let i in Memory.RoomControlData) if (!global.SpecialBodyData[i])global.SpecialBodyData[i]={}
    if (!global.intervalData) global.intervalData = {}
    for (let i in global.intervalData) if (!global.intervalData[i])global.intervalData[i]={}
    if (!global.Stru)global.Stru = {}
    if (!Memory.marketAdjust)Memory.marketAdjust = {}
    if (!Memory.ResourceDispatchData)Memory.ResourceDispatchData = []
    if (!global.ResourceLimit)global.ResourceLimit = {}
    if (!Memory.outMineData) Memory.outMineData = {}
}
