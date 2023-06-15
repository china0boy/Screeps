import { build_, carry_, harvest_, upgrade_, harvest_Mineral } from "@/module/fun/role"

interface SpawnConstantData {
    [role: string]: {
        num: number,         // 默认数量
        ability: number[],   // 默认body个数 [work,carry,move,attack,ranged_attack,heal,claim,tough] 总数别超过50
        adaption?: boolean,  // 是否自适应减小
        must?: boolean,      // 是否无论战争还是和平都得孵化
        level?: number,      // 孵化优先级
        mark?: string         // 每种爬虫的代号，必须有代号
        init?: boolean        // 是否加入memory初始化
        fun?: (creep: Creep) => void        // 是否有固定函数 【即不接任务】
        mem?: SpawnMemory            // 是否有额外记忆
    }
}


/* 爬虫信息列表 */
export const RoleData: SpawnConstantData = {
    'harvest': { num: 0, ability: [1, 1, 2, 0, 0, 0, 0, 0], adaption: true, level: 5, mark: "挖", init: true, fun: harvest_ },  // 矿点采集工
    'carry': { num: 0, ability: [0, 3, 3, 0, 0, 0, 0, 0], level: 5, mark: "运", init: true, adaption: true, fun: carry_ },  // 矿点搬运工
    'upgrade': { num: 0, ability: [1, 1, 2, 0, 0, 0, 0, 0], level: 10, mark: "升级", init: true, fun: upgrade_ },   // 升级工
    'build': { num: 0, ability: [1, 1, 2, 0, 0, 0, 0, 0], level: 10, mark: "建设", init: true, fun: build_, must: true },   // 建筑工
    'harvest_Mineral': { num: 0, ability: [16, 16, 16, 0, 0, 0, 0, 0], level: 11, mark: "挖化合物", init: true, fun: harvest_Mineral },   // 挖化合物
    'manage': { num: 0, ability: [0, 1, 1, 0, 0, 0, 0, 0], level: 2, mark: "中央", init: true, must: true, adaption: true },   // 中央搬运工
    'transport': { num: 0, ability: [0, 2, 2, 0, 0, 0, 0, 0], level: 1, mark: "搬运", init: true, must: true, adaption: true },  // 房间物流搬运工
    'repair': { num: 0, ability: [1, 1, 1, 0, 0, 0, 0, 0], level: 8, mark: "刷墙", must: true },     // 刷墙
    'cclaim': { num: 0, ability: [0, 0, 1, 0, 0, 0, 1, 0], level: 10, mark: "C" },           // 开房sf
    'cupgrade': { num: 0, ability: [2, 5, 7, 0, 0, 0, 0, 0], level: 11, mark: "C" },
    'dismantle': { num: 0, ability: [25, 0, 25, 0, 0, 0, 0, 0], level: 11, mark: "拆家" },
    'rush': { num: 0, ability: [10, 2, 5, 0, 0, 0, 0, 0], level: 11, mark: "升级" },
    'truck': { num: 0, ability: [0, 10, 10, 0, 0, 0, 0, 0], level: 12, mark: "顺丰" },
    'claim': { num: 0, ability: [0, 0, 10, 0, 0, 0, 1, 0], level: 10, mark: "扩张" },
    'Ebuild': { num: 0, ability: [1, 1, 2, 0, 0, 0, 0, 0], level: 13, mark: "援建" },
    'Eupgrade': { num: 0, ability: [1, 1, 2, 0, 0, 0, 0, 0], level: 13, mark: "援建" },
    'double-attack': { num: 0, ability: [0, 0, 10, 24, 3, 0, 0, 13], level: 10, mark: "双", must: true },
    'double-heal': { num: 0, ability: [0, 0, 10, 0, 0, 27, 0, 13], level: 10, mark: "双", must: true },
    'double-work': { num: 0, ability: [27, 0, 10, 0, 0, 0, 0, 13], level: 10, mark: "双", must: true },
    'pb_attack': { num: 0, ability: [0, 0, 20, 20, 0, 0, 0, 0], level: 11, mark: "pb" },
    'pb_heal': { num: 0, ability: [0, 0, 25, 0, 0, 25, 0, 0], level: 11, mark: "pb" },
    'pb_transfer': { num: 0, ability: [0, 32, 16, 0, 0, 0, 0, 0], level: 12, mark: "pb" },
    'dp_harvest': { num: 0, ability: [20, 10, 20, 0, 0, 0, 0, 0], level: 12, mark: "dp" },
    'dp_transfer': { num: 0, ability: [0, 25, 25, 0, 0, 0, 0, 0], level: 12, mark: "dp" },
    'claim-attack': { num: 0, ability: [0, 0, 15, 0, 0, 0, 15, 0], level: 10, mark: "🟣", adaption: true },
    'architect': { num: 0, ability: [15, 10, 10, 0, 0, 10, 0, 5], level: 10, mark: "援建" },
    'sig': { num: 0, ability: [0, 0, 1, 0, 0, 0, 0, 0], level: 20, mark: "签名" },
    'loot': { num: 1, ability: [0, 25, 25, 0, 0, 0, 0, 0], adaption: true, level: 11, mark: "掠夺者" },
    'AIO': { num: 0, ability: [0, 0, 1, 0, 0, 0, 0, 0], level: 5, mark: "一体机", must: true },
    'carryShard': { num: 0, ability: [0, 0, 1, 0, 0, 0, 0, 0], level: 5, mark: "跨shard运输" },
    /* 外矿 */
    'out-claim': { num: 0, ability: [0, 0, 2, 0, 0, 0, 2, 0], adaption: true, level: 11, mark: "🟣" },
    'out-harvest': { num: 0, ability: [4, 2, 4, 0, 0, 0, 0, 0], level: 12, mark: "外挖" },
    'out-attackHarvest': { num: 0, ability: [10, 2, 10, 19, 0, 9, 0, 0], level: 12, mark: "外挖" },
    'out-mineral': { num: 0, ability: [16, 16, 16, 0, 0, 0, 0, 0], level: 12, mark: "挖" },
    'out-car': { num: 0, ability: [1, 5, 6, 0, 0, 0, 0, 0], level: 12, mark: "外运" },
    'out-defend': { num: 0, ability: [0, 0, 16, 0, 24, 8, 0, 0], level: 10, mark: "外防", adaption: true },
    'out-attack': { num: 0, ability: [0, 0, 10, 10, 0, 10, 0, 0], level: 10, mark: "外攻", adaption: true },
    /* 主动防御 */
    'defend-attack': { num: 0, ability: [0, 0, 10, 40, 0, 0, 0, 0], level: 8, mark: "🔴", must: true },
    'defend-range': { num: 0, ability: [0, 0, 10, 0, 40, 0, 0, 0], level: 8, mark: "🔵", must: true },
    'defend-douAttack': { num: 0, ability: [0, 0, 10, 30, 0, 0, 0, 10], level: 7, mark: "🔴", must: true },
    'defend-douHeal': { num: 0, ability: [0, 0, 10, 0, 0, 30, 0, 10], level: 7, mark: "🟢", must: true },
    /* 四人小队 */
    'x-dismantle': { num: 0, ability: [28, 0, 10, 0, 0, 0, 0, 12], level: 9, mark: "🟨", must: true, mem: { creepType: 'attack' } },
    'x-heal': { num: 0, ability: [0, 0, 10, 0, 2, 26, 0, 12], level: 9, mark: "🟩", must: true, mem: { creepType: 'heal' } },
    'x-attack': { num: 0, ability: [0, 0, 10, 28, 0, 0, 0, 12], level: 9, mark: "🟥", must: true, mem: { creepType: 'attack' } },
    'x-range': { num: 0, ability: [0, 0, 10, 0, 24, 4, 0, 12], level: 9, mark: "🟦", must: true, mem: { creepType: 'attack' } },
    'x-aio': { num: 0, ability: [0, 0, 10, 0, 10, 20, 0, 10], level: 9, mark: "🌈", must: true, mem: { creepType: 'heal' } },
}
/* 爬虫部件随房间等级变化的动态列表 */
export const RoleLevelData = {
    'harvest': {
        1: { bodypart: [2, 1, 1, 0, 0, 0, 0, 0], num: 2 },
        2: { bodypart: [3, 1, 2, 0, 0, 0, 0, 0], num: 2 },
        3: { bodypart: [5, 1, 3, 0, 0, 0, 0, 0], num: 2 },
        4: { bodypart: [5, 1, 3, 0, 0, 0, 0, 0], num: 2 },
        5: { bodypart: [7, 2, 4, 0, 0, 0, 0, 0], num: 2 },
        6: { bodypart: [7, 2, 4, 0, 0, 0, 0, 0], num: 2 },
        7: { bodypart: [10, 2, 5, 0, 0, 0, 0, 0], num: 2 },
        8: { bodypart: [20, 2, 10, 0, 0, 0, 0, 0], num: 2 },
    },
    'carry': {
        1: { bodypart: [0, 2, 2, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [0, 3, 3, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [0, 6, 3, 0, 0, 0, 0, 0], num: 0 },//[0,4,4,0,0,0,0,0]
        4: { bodypart: [0, 10, 5, 0, 0, 0, 0, 0], num: 0 },//[0,6,6,0,0,0,0,0]
        5: { bodypart: [0, 20, 10, 0, 0, 0, 0, 0], num: 0 },//[0,6,6,0,0,0,0,0]
        6: { bodypart: [0, 20, 10, 0, 0, 0, 0, 0], num: 0 },//[0, 6, 6, 0, 0, 0, 0, 0]
        7: { bodypart: [0, 4, 2, 0, 0, 0, 0, 0], num: 0 },//[0, 2, 2, 0, 0, 0, 0, 0]
        8: { bodypart: [0, 4, 2, 0, 0, 0, 0, 0], num: 0 },//[0, 2, 2, 0, 0, 0, 0, 0]
    },
    'upgrade': {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 4 },
        2: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 3 },
        3: { bodypart: [4, 4, 4, 0, 0, 0, 0, 0], num: 3 },//[3,3,6,0,0,0,0,0]
        4: { bodypart: [5, 5, 5, 0, 0, 0, 0, 0], num: 2 },//[4,4,8,0,0,0,0,0]
        5: { bodypart: [7, 7, 7, 0, 0, 0, 0, 0], num: 2 },//[4, 4, 8, 0, 0, 0, 0, 0]
        6: { bodypart: [16, 2, 4, 0, 0, 0, 0, 0], num: 1 },
        7: { bodypart: [20, 2, 5, 0, 0, 0, 0, 0], num: 1 },
        8: { bodypart: [15, 15, 15, 0, 0, 0, 0, 0], num: 1 },
    },
    'build': {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 1 },
        2: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 1 },
        3: { bodypart: [3, 3, 6, 0, 0, 0, 0, 0], num: 1 },
        4: { bodypart: [5, 5, 5, 0, 0, 0, 0, 0], num: 1 },//[4, 4, 8, 0, 0, 0, 0, 0]
        5: { bodypart: [8, 8, 8, 0, 0, 0, 0, 0], num: 0 },//[4, 4, 8, 0, 0, 0, 0, 0]
        6: { bodypart: [10, 10, 10, 0, 0, 0, 0, 0], num: 0 },//[5, 5, 10, 0, 0, 0, 0, 0]
        7: { bodypart: [15, 15, 15, 0, 0, 0, 0, 0], num: 0 },//[10, 10, 10, 0, 0, 0, 0, 0]
        8: { bodypart: [15, 15, 15, 0, 0, 0, 0, 0], num: 0 },
    },
    'transport': {
        1: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [0, 2, 2, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [0, 4, 2, 0, 0, 0, 0, 0], num: 1 },//[0, 2, 2, 0, 0, 0, 0, 0]
        5: { bodypart: [0, 4, 2, 0, 0, 0, 0, 0], num: 1 },//[0, 4, 4, 0, 0, 0, 0, 0]
        6: { bodypart: [0, 10, 5, 0, 0, 0, 0, 0], num: 2 },//[0, 10, 10, 0, 0, 0, 0, 0]
        7: { bodypart: [0, 24, 12, 0, 0, 0, 0, 0], num: 2 },//[0, 24, 24, 0, 0, 0, 0, 0]
        8: { bodypart: [0, 32, 16, 0, 0, 0, 0, 0], num: 2 },//[0, 24, 24, 0, 0, 0, 0, 0]
    },
    'manage': {
        1: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [0, 2, 2, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [0, 2, 2, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [0, 10, 5, 0, 0, 0, 0, 0], num: 1 },
        6: { bodypart: [0, 16, 4, 0, 0, 0, 0, 0], num: 1 },
        7: { bodypart: [0, 20, 10, 0, 0, 0, 0, 0], num: 1 },
        8: { bodypart: [0, 49, 1, 0, 0, 0, 0, 0], num: 1 },
    },
    'harvest_Mineral': {
        6: { bodypart: [10, 10, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [16, 16, 16, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [16, 16, 16, 0, 0, 0, 0, 0], num: 0 },
    }
    ,
    'repair': {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [3, 3, 3, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [6, 6, 6, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [10, 10, 10, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [15, 15, 15, 0, 0, 0, 0, 0], num: 0 },
    },
    'dismantle': {
        1: { bodypart: [1, 0, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [2, 0, 2, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [3, 0, 3, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [3, 0, 3, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [6, 0, 6, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [10, 0, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [20, 0, 20, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [25, 0, 25, 0, 0, 0, 0, 0], num: 0 },
    },
    'rush': {
        6: { bodypart: [17, 1, 9, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [39, 1, 10, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [39, 1, 10, 0, 0, 0, 0, 0], num: 0 },
    },
    'truck': {
        1: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [0, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [0, 4, 4, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [0, 4, 4, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [0, 8, 8, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [0, 10, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [0, 20, 20, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [0, 25, 25, 0, 0, 0, 0, 0], num: 0 },
    },
    'Ebuild': {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [4, 4, 8, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [5, 5, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [10, 10, 20, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [10, 10, 20, 0, 0, 0, 0, 0], num: 0 },
    },
    'Eupgrade': {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [2, 2, 4, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [4, 4, 8, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [5, 5, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [10, 10, 20, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [10, 10, 20, 0, 0, 0, 0, 0], num: 0 },
    },
    "out-harvest": {
        1: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [6, 1, 3, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [6, 1, 3, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [8, 1, 4, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [10, 2, 5, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [10, 2, 5, 0, 0, 0, 0, 0], num: 0 },
    },
    "out-mineral": {
        1: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [1, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [2, 1, 1, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [5, 1, 3, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [5, 1, 3, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [10, 2, 5, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [16, 16, 16, 0, 0, 0, 0, 0], num: 0 },
    },
    "out-car": {
        1: { bodypart: [1, 1, 2, 0, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [1, 2, 2, 0, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [1, 2, 3, 0, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [1, 11, 6, 0, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [1, 11, 6, 0, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [2, 18, 10, 0, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [4, 28, 16, 0, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [4, 28, 16, 0, 0, 0, 0, 0], num: 0 },
    },
    "out-defend": {
        1: { bodypart: [0, 0, 1, 0, 0, 1, 0, 0], num: 0 },
        2: { bodypart: [0, 0, 1, 0, 0, 1, 0, 0], num: 0 },
        3: { bodypart: [0, 0, 1, 0, 0, 1, 0, 0], num: 0 },
        4: { bodypart: [0, 0, 3, 0, 2, 2, 0, 0], num: 0 },
        5: { bodypart: [0, 0, 6, 0, 3, 3, 0, 0], num: 0 },
        6: { bodypart: [0, 0, 8, 0, 4, 4, 0, 0], num: 0 },
        7: { bodypart: [0, 0, 16, 0, 8, 8, 0, 0], num: 0 },
        8: { bodypart: [0, 0, 16, 0, 20, 12, 0, 0], num: 0 },
    },
    "out-attack": {
        1: { bodypart: [0, 0, 1, 1, 0, 0, 0, 0], num: 0 },
        2: { bodypart: [0, 0, 1, 1, 0, 0, 0, 0], num: 0 },
        3: { bodypart: [0, 0, 1, 1, 0, 0, 0, 0], num: 0 },
        4: { bodypart: [0, 0, 3, 3, 0, 0, 0, 0], num: 0 },
        5: { bodypart: [0, 0, 6, 6, 0, 0, 0, 0], num: 0 },
        6: { bodypart: [0, 0, 8, 8, 0, 0, 0, 0], num: 0 },
        7: { bodypart: [0, 0, 10, 10, 0, 0, 0, 0], num: 0 },
        8: { bodypart: [0, 0, 10, 10, 0, 0, 0, 0], num: 0 },
    },
}