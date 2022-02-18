/* 用于存放boot相关类型及定义 */

/**
 * Memory里的类型定义
 */
interface Memory {
    RoomControlData:RoomControlData
}

/**
 * 房间控制Memory数据格式
 */
interface RoomControlData {
    [roomName:string]:{
        // 房间布局 手动布局 | hoho布局 | dev布局 | om布局 | 自动布局
        arrange: 'man' | 'hoho' | 'dev' 
        
        // 中心点
        center: [number,number]

        // 防御 [不包括防御塔]
        defend?: {
            auto?: boolean  // 是否主动防御
            range?: number   // 范围
            level?: number   // 防御等级
        }

    }
}