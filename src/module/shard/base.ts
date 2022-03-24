/* 跨shard基本操作函数 */
/**
 * 基本定义
 * 跨shard记忆是个对象包含creep和misson两个大分支，creep里存储以爬虫名字为key的爬虫记忆，并定时清除,Misson里包含以任务ID为Key的任务
 * 
 * {
 *     creep:
 *      {
 *          ...
 *          creep1:          // 爬虫名称
 *          {
 *              MemoryData:{}, 
 *              state: 0/1  // 状态码：0代表还未传输、1代表已经传输
 *              delay:1500 超时倒计时   // 超过1500tick将自动删除,所有爬虫数据均是如此
 *          },
 *          ...
 *      },
 *      misson:
 *      {
 *          ...
 *          Cskfvde23nf34:   // 任务ID
 *          {
 *              MemoryData:{},
 *              state: 0/1  // 状态码：0代表还未传输、1代表已经传输
 *              delay:5000  // 超过5000tick将自动删除
 *          }
 *      },
 *      shardName: shard3    // 脚本运行shard名,
 *      communication:
 *      {
 *          state: 0 //状态码: 0代表无请求、1代表请求发送、2代表发送成功、3代表接受成功 同时只能发送一种数据/只能一方发给另外一方
 *          sourceShard: shard3 // 源shard
 *          relateShard: shard2 // 想要通讯的shard
 *          data: {} // 爬虫或者任务的数据
 *          type: 1  // 类型：1代表爬虫数据、2代表任务数据
 *          delay: 200     // 超时倒计时
 *      }
 * }
 *   
 */ 

/* ShardMemory数据初始化 */
export function InitShardMemory():void{
    if (Game.time % 10) return
    var Data = JSON.parse(InterShardMemory.getLocal()) || {}
    if (Object.keys(Data).length < 3 || !Data['creep'] || !Data['misson'])
    {
        InterShardMemory.setLocal(JSON.stringify({'creep':{},'misson':{},shardName:Game.shard.name}))
        console.log('已经初始化',Game.shard.name,'的InterShardMemory!')
        return
    }
    /* 爬虫shard记忆超时计算 */
    for (var cData in Data['creep'])
    {
        Data['creep'][cData].delay -= 10
        if (Data['creep'][cData].delay <= 0)
            delete  Data['creep'][cData]
        if (Game.creeps[cData] && Game.creeps[cData].memory.role)
            delete Data['creep'][cData]
        /* 如果记忆已经成功赋予了就删除 */
        // if (Game.creeps[cData] && Game.creeps[cData].memory.role)
        //     delete  Data['creep'][cData]
    }
    /* 任务shard记忆超时计算 */
    for (var mData in Data['misson'])
    {
        Data['misson'][mData].delay -= 10
        if (Data['misson'][mData].delay <= 0)
            delete  Data['misson'][mData]
    }
    /* 通信更新 */
    if (Data['communication'])
    {
        Data['communication'].delay -= 10
        if (Data['communication'].delay <= 0)
            delete Data['communication']
    }
    /* 记忆更新 */
    InterShardMemory.setLocal(JSON.stringify(Data))
}

/* 获取其他shard的数据 */
export function GetShardCommunication(shardName:shardName):any{
    if (shardName == Game.shard.name) return null
    var Data = JSON.parse(InterShardMemory.getRemote(shardName)) || {}
    if(Object.keys(Data).length < 3) return null    // 说明该shard不存在InterShardMemory
    if (!Data['communication']) return null
    return Data['communication']
}

/* 请求传输数据到目标shard */
export function RequestShard(req:RequestData):boolean{
    var thisData = JSON.parse(InterShardMemory.getLocal())
    if (thisData.communication && thisData.communication.state != 0) return false
    thisData.communication = {
        state:1,
        relateShard:req.relateShard,
        sourceShard:req.sourceShard,
        type:req.type,
        data:req.data,
        delay:100,
    }
    InterShardMemory.setLocal(JSON.stringify(thisData))
    return true
}

/* 响应目标shard的传输数据 并将其拷贝到自己的记忆里 */
export function ResponseShard(shardName:shardName):boolean{
    var comData = GetShardCommunication(shardName)
    if (comData === null) return false
    if (comData.state != 1 || comData.relateShard != Game.shard.name) return false
    var thisData = JSON.parse(InterShardMemory.getLocal())
    if (thisData.communication && thisData.communication['relateShard'] != Game.shard.name) return false    // 在忙中，无法响应
    thisData.communication = {
        state: 2,
        relateShard:comData.relateShard,
        sourceShard:comData.sourceShard,
        type:comData.type,
        data:comData.data,
        delay:100,
    }
    if (comData.type == 1)
    {
        thisData['creep'][comData.data['id']] = {MemoryData:comData.data['MemoryData'],delay:100,state:1}
    }
    else if (comData.type == 2)
    {
        thisData['misson'][comData.data['id']] = {MemoryData:comData.data['MemoryData'],delay:50,state:1}
    }
    InterShardMemory.setLocal(JSON.stringify(thisData))
    // 响应成功
    return true
}

/* 确认目标shard已经收到了数据 */
export function ConfirmShard():boolean{
    var thisData = JSON.parse(InterShardMemory.getLocal())
    if (!thisData.communication) return false
    var comData = GetShardCommunication(thisData.communication['relateShard'])
    if (comData === null) return false
    if (comData.state != 2 || comData.relateShard != thisData.communication['relateShard']) return false
    if (comData.state == 2)
    {
        thisData.communication.state = 3
        delete thisData.communication.data
        InterShardMemory.setLocal(JSON.stringify(thisData))
        // 响应成功
        return true
    }
    return false
}

/* 删除communication */
export function DeleteShard():boolean{
    var thisData = JSON.parse(InterShardMemory.getLocal())
    if (!thisData.communication) return false
    if (Game.shard.name == thisData.communication['relateShard'])
    {
        var Data = JSON.parse(InterShardMemory.getRemote(thisData.communication['sourceShard'])) || {}
        console.log(Data['communication'].state)
        if (Data['communication'].state == 3)
        {
            delete thisData.communication
            InterShardMemory.setLocal(JSON.stringify(thisData))
            return true
        }
        return false
    }
    else if (Game.shard.name == thisData.communication['sourceShard'])
    {
        /* 只需要确定对方是否还有communication */
        var Data = JSON.parse(InterShardMemory.getRemote(thisData.communication['relateShard'])) || {}
        if (!Data['communication'])
        {
            delete thisData.communication
            InterShardMemory.setLocal(JSON.stringify(thisData))
            return true
        }
        return false
        
    }
    return false
}

/* 跨shard运行主函数 */
export function InterShardRun():void{
    var Data = JSON.parse(InterShardMemory.getLocal()) || {}
    if (Object.keys(Data).length < 3)
    {
        return
    }
    /* 没有通话状态，就一直监听 */
    if (!Data.communication)
    {
        var allShardList = ['shard1','shard2','shard3']
        var thisShardList = _.difference(allShardList,[Game.shard.name])
        for (var s of thisShardList)
        {
            if (ResponseShard(s as shardName )) return
        }
    }
    else
    {
        if (Data.communication.state == 1)
        {
            // if(ConfirmShard()) return
            // else console.log(`${Game.shard.name} ConfirmShard遇到问题`)
            ConfirmShard()
        }
        else if (Data.communication.state == 2)
        {
            DeleteShard()
        }
        else if (Data.communication.state == 3)
        {
            DeleteShard()
        }
    }

}