/* 存放全局声明 */
declare module NodeJS {
    interface Global {
        /* 用于判定全局扩展是否已经挂载 */
        Mounted:boolean
        CreepBodyData:{[roomName:string]:{[creepRole:string]:number[]}}    // 每种类型爬虫的体型数据
        SpecialBodyData:{[roomName:string]:{[creepRole:string]:BodyPartConstant[]}}    // 爬虫的特殊体型数据
        CreepNumData:{[roomName:string]:{[creepRole:string]:number}}    // 每种类型爬虫的实际数量
        // 寻路的键值对
        routeCache:{
            // 键为路径的起点和终点 值为压缩后的路径
            [routekey:string]:string
        }
        Gtime:{[roomName:string]:number}
        // 将对象全局获取，这样只用获取一次对象，不用每次都分别获取
        Stru:{
            [roomName:string]:globalStrcutureData
        }
        intervalData:{[roomName:string]:{[creepRole:string]:number}}
    }
}

interface globalStrcutureData{
    [structureName:string]:Structure | Structure[]
}

