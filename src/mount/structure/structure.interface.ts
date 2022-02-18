interface StructureLink{
    ManageMission():void
}
interface StructureTerminal{
    ManageMission():void
    ResourceBalance():void
}

interface RoomMemory{
    TerminalData:{[resource:string]:{num:number,fill?:boolean}}
    MarketData:marketData
}

interface marketData{
    [str:string]:{
        [res:string]:{
            num:number
            mType?:'buy'|'sell'
            value:number    // 创建订单时的权重值
            max?:number // 最大价值
            min?:number // 最小值
            range?:number   // 最大范围
        }
    }
}