/* 爬虫常用类型及定义 */
interface Creep {

}

interface CreepMemory {
    fillingConstruction?: string; //填充爬下一个的要填充建筑的id
    belong: string      // 爬虫所属房间
    shard: string       // 爬虫所属shard
    role: string        // 爬虫角色
    working: boolean
    /* 每个爬虫都必须有该记忆，方便boost */
    boostData:BoostData   
    /* 目标Id */
    targetID?:string
    containerID?:string
    adaption?:boolean
    taskRB?:string
}

interface BoostData{
    [body:string]:Boosted
}
interface Boosted{
    boosted?:boolean
    type?:ResourceConstant
    num?:number
}