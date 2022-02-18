/* [通用]房间运行主程序 */
export default ()=>{

    if (!Memory.RoomControlData) Memory.RoomControlData = {}
    for (var roomName in Memory.RoomControlData)
    {
        let thisRoom = Game.rooms[roomName]
        if (!thisRoom) continue
        /* 房间核心 */
        thisRoom.RoomInit()         // 房间数据初始化
        thisRoom.RoomEcosphere()    // 房间状态、布局
        thisRoom.SpawnMain()        // 定时、补员型孵化管理

        /* 房间运维 */
        thisRoom.MissionManager()   // 任务管理器

        thisRoom.SpawnExecution()   // 孵化爬虫

        thisRoom.TowerWork()        // 防御塔工作

        thisRoom.StructureMission() // terminal link factory 工作
        
        thisRoom.LevelMessageUpdate()        // 房间等级Memory信息更新
        if (roomName == 'E23S3')
        {
            if(thisRoom.memory.state == 'war')
            {
                let enemy = thisRoom.find(FIND_HOSTILE_CREEPS,{filter:(creep)=>{
                    return creep.owner.username == 'Q13214'
                }})
                if (enemy.length > 0 && thisRoom.MissionNum("Creep",'紧急支援') <= 0)
                {
                    let task = thisRoom.Public_support(roomName,'double','shard3')
                    thisRoom.AddMission(task)
                }
            }
        }
    }
}