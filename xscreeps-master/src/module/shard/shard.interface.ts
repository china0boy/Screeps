/* 跨shard传输数据的JSON格式规范 */
interface InterShardMemory {
    
}

// 跨shard的request请求数据类型
interface RequestData {
    relateShard:shardName
    sourceShard:shardName
    data:any
    type:number
}