
declare module "autoPlanner63" {
    const HelperVisual:HelperVisual
    const ManagerPlanner:ManagerPlanner
    const Loop:()=>void

    export interface HelperVisual {
        showText(roomNameOrObj:string | RoomObject,
            text:string,objOrPos?:RoomPosition | RoomObject,
            color?:string,font?:number):void

        showRoomStructures(roomName:string,map:StructMap):void
    }

    export interface ManagerPlanner{
        computeManor(roomName:string,flagPos:[Flag,Flag,Flag,Flag]):StructsData
    }

    export type StructsData = {
        roomName:string,
        storagePos:{x:number,y:number},
        labPos:{x:number,y:number},
        structMap:StructMap
    }

    export type StructMap = {
        [key:string]:[number,number][]
    }
}







