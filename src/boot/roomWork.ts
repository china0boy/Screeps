import { ResourceDispatch } from "@/module/dispatch/resource"
/* [通用]房间运行主程序 */
export default () => {

    if (!Memory.RoomControlData) Memory.RoomControlData = {}
    for (var roomName in Memory.RoomControlData) {
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

        ResourceDispatch(thisRoom)      // 资源调度

        thisRoom.LevelMessageUpdate()        // 房间等级Memory信息更新

        thisRoom.LevelUpgradeCreep() //监控8级房时间发布升级工任务 和 监控发布挖化合物任务
    }
}