import { CompoundColor } from "@/constant/ResourceConstant"
import { colors, Colorful } from "@/utils"
import { AppLifecycleCallbacks } from "../framework/types"
import { unzipXandY } from "../fun/funtion"
import { getTowerData } from "../war/war"

/* 可视化模块 */
/**
 * 防御塔数据可视化
 * TowerVisualAttack 防御塔攻击数据
 * TowerVisualHeal   防御塔治疗数据
 * TowerVisualRepair 防御塔维修数据
 * 较消耗cpu，仅做短暂统计用，请及时截图及销毁旗帜
 * @returns void
 */
export function showTowerData(): void {
    if (Game.flags['TowerVisualAttack']) {
        let roomName = Game.flags['TowerVisualAttack'].pos.roomName
        if (!global.warData) global.warData = {}
        if (!global.warData.tower) global.warData.tower = {}
        if (!global.warData.tower[roomName]) global.warData.tower[roomName] = { count: 0 }
        if (global.warData.tower[roomName].data) {
            for (var posData in global.warData.tower[roomName].data) {
                /* 数据 */
                let posXY = unzipXandY(posData)
                let tx = posXY[0]
                let ty = posXY[1]
                var Data = global.warData.tower[roomName].data[posData]
                new RoomVisual(roomName).text(`${Data.attack}`, tx, ty, { color: 'red', font: 0.4, align: 'center' })
            }
            return
        }
        if (!Game.rooms[roomName]) {
            /* 如果没有房间视野，采用observe观察 */
            for (let i in Memory.RoomControlData) {
                if (Game.rooms[i] && Game.rooms[i].controller.level >= 8) {
                    let observer_ = Game.getObjectById(Game.rooms[i].memory.StructureIdData.ObserverID) as StructureObserver
                    if (observer_ && observer_.observeRoom(roomName) == OK)
                        break
                }
            }
            return
        }
        if (!global.warData.tower[roomName].data)
            global.warData.tower[roomName].data = getTowerData(Game.rooms[roomName])
    }
    if (Game.flags['TowerVisualHeal']) {
        let roomName = Game.flags['TowerVisualHeal'].pos.roomName
        if (!global.warData) global.warData = {}
        if (!global.warData.tower) global.warData.tower = {}
        if (!global.warData.tower[roomName]) global.warData.tower[roomName] = { count: 0 }
        if (global.warData.tower[roomName].data) {
            for (var posData in global.warData.tower[roomName].data) {
                /* 数据 */
                let posXY = unzipXandY(posData)
                let tx = posXY[0]
                let ty = posXY[1]
                var Data = global.warData.tower[roomName].data[posData]
                new RoomVisual(roomName).text(`${Data.heal}`, tx, ty, { color: 'green', font: 0.4, align: 'center' })
            }
            return
        }
        if (!Game.rooms[roomName]) {
            /* 如果没有房间视野，采用observe观察 */
            for (let i in Memory.RoomControlData) {
                if (Game.rooms[i] && Game.rooms[i].controller.level >= 8) {
                    let observer_ = Game.getObjectById(Game.rooms[i].memory.StructureIdData.ObserverID) as StructureObserver
                    if (!observer_) {
                        delete Game.rooms[i].memory.StructureIdData.ObserverID
                        return
                    }
                    if (observer_ && observer_.observeRoom(roomName) == OK)
                        break
                }
            }
            return
        }
        if (!global.warData.tower[roomName].data)
            global.warData.tower[roomName].data = getTowerData(Game.rooms[roomName])
    }
    if (Game.flags['TowerVisualRepair']) {
        let roomName = Game.flags['TowerVisualRepair'].pos.roomName
        if (!global.warData) global.warData = {}
        if (!global.warData.tower) global.warData.tower = {}
        if (!global.warData.tower[roomName]) global.warData.tower[roomName] = { count: 0 }
        if (global.warData.tower[roomName].data) {
            for (var posData in global.warData.tower[roomName].data) {
                /* 数据 */
                let posXY = unzipXandY(posData)
                let tx = posXY[0]
                let ty = posXY[1]
                var Data = global.warData.tower[roomName].data[posData]
                new RoomVisual(roomName).text(`${Data.repair}`, tx, ty, { color: 'yellow', font: 0.4, align: 'center' })
            }
            return
        }
        if (!Game.rooms[roomName]) {
            /* 如果没有房间视野，采用observe观察 */
            for (let i in Memory.RoomControlData) {
                if (Game.rooms[i] && Game.rooms[i].controller.level >= 8) {
                    let observer_ = Game.getObjectById(Game.rooms[i].memory.StructureIdData.ObserverID) as StructureObserver
                    if (observer_ && observer_.observeRoom(roomName) == OK)
                        break
                }
            }
            return
        }
        if (!global.warData.tower[roomName].data)
            global.warData.tower[roomName].data = getTowerData(Game.rooms[roomName])
    }
}

export const towerDataVisual: AppLifecycleCallbacks = {
    tickEnd: showTowerData
}

const normalTextStyle = { color: colors.zinc, opacity: 0.8, font: 0.7, align: 'left' } as const

function box(visual: RoomVisual, x: number, y: number, w: number, h: number, style?: LineStyle) {
    return visual
        .line(x + 0.1, y + 0.05, x + w - 0.1, y + 0.05, style)
        .line(x + w - 0.05, y, x + w - 0.05, y + h, style)
        .line(x + w - 0.1, y + h - 0.05, x + 0.1, y + h - 0.05, style)
        .line(x + 0.05, y + h, x + 0.05, y, style)
}

function labelBar(visual: RoomVisual, x: number, y: number, labelSpace: number, w: number, label: string, content: string, percent: number, color: string, quailty: 'low' | 'medium' | 'high') {
    visual.text(label, x + labelSpace, y, { color, opacity: 0.7, font: 0.7, align: 'right' })
    if (quailty == 'high')
        box(visual, x + labelSpace + 0.1, y - 0.7, 6.2, 0.9, { color, opacity: 0.2 })
    if (quailty != 'low')
        visual.rect(x + labelSpace + 0.1 + 0.1, y - 0.6, percent * w, 0.7, { fill: color, opacity: 0.3 })
    visual.text(content, x + labelSpace + 0.1 + w / 2, y - 0.05, { color, font: 0.5, align: 'center' })
}

/**
 * 房间日常数据可视化
 * 瞬时cpu 平均cpu 房间状态 任务数 bucket等
 */
export function processRoomDataVisual(room: Room): void {
    if (room.memory.banVisual) return
    const visual = room.visual
    if (Memory.VisualLevel == 'blank') {
        visual.text(`CPU:${(global.UsedCpu ? global.UsedCpu : 0).toFixed(2)}`, 1, 0.7, { color: 'white', font: 1, align: 'left' })
        visual.text(`APU:${(global.AveCpu ? global.AveCpu : 0).toFixed(2)}`, 1, 1.8, { color: 'white', font: 1, align: 'left' })
        visual.text(`BKT:${Game.cpu.bucket}`, 1, 2.9, { color: 'white', font: 1, align: 'left' })
        return
    }
    // Room Status
    let line = 0.7
    visual.text(`${room.name}`, 0.1, line, normalTextStyle)
    visual.text(room.memory.state === 'peace' ? '和平' : '战争', room.name.length * 0.45 + 0.3, 0.7, { ...normalTextStyle, color: room.memory.state === 'peace' ? colors.zinc : colors.red })
    const missionNum = Object.values(room.memory.Misson).reduce((a, b) => a + b.length, 0)
    visual.text(`共 ${missionNum} 任务`, room.name.length * 0.45 + 2, 0.7, { ...normalTextStyle, color: missionNum > 20 ? colors.amber : colors.zinc })
    if (Memory.VisualLevel != 'low')
        visual.text(`${Object.values(global.CreepNumData[room.name] || {}).reduce((a, b) => a + b, 0)} 爬虫`, room.name.length * 0.45 + missionNum.toString().length * 0.4 + 4.6, 0.7, normalTextStyle)

    // CPU
    const cpuUsed = global.UsedCpu || 0
    const usedCpuPercent = cpuUsed / Game.cpu.limit
    const usedCpuPercentVisual = Math.min(usedCpuPercent, 1)
    const cpuColor = usedCpuPercent > 0.8 ? colors.rose : usedCpuPercent > 0.5 ? colors.amber : colors.emerald
    labelBar(visual, 0.1, line += 1.1, 1.4, 6, 'CPU', `${cpuUsed.toFixed(2)} - ${Math.round(usedCpuPercent * 100)}%`, usedCpuPercentVisual, cpuColor, Memory.VisualLevel)

    // 平均CPU
    const ave_cpuUsed = (global.AveCpu ? global.AveCpu : 0)
    const ave_usedCpuPercent = ave_cpuUsed / Game.cpu.limit
    const ave_usedCpuPercentVisual = Math.min(ave_usedCpuPercent, 1)
    const ave_cpuColor = ave_usedCpuPercent > 0.8 ? colors.rose : ave_usedCpuPercent > 0.5 ? colors.amber : colors.emerald
    labelBar(visual, 0.1, line += 1.1, 1.4, 6, 'APU', `${ave_cpuUsed.toFixed(2)} - ${Math.round(ave_usedCpuPercent * 100)}%-<${(global.CpuData ? global.CpuData.length : 0)}>`, ave_usedCpuPercentVisual, ave_cpuColor, Memory.VisualLevel)

    // Bucket
    const bucket = Game.cpu.bucket
    if (Memory.VisualLevel != 'low' || bucket < 10000) {
        const bucketPercent = bucket / 10000
        const bucketColor = bucketPercent < 0.1 ? colors.rose : bucketPercent < 0.3 ? colors.amber : colors.emerald
        labelBar(visual, 0.1, line += 1.1, 1.4, 6, 'BKT', `${bucket}`, bucketPercent, bucketColor, Memory.VisualLevel)
    }

    // 控制器进度
    if (Memory.VisualLevel != 'low' && room.controller.level != 8) {
        if (room.controller) {
            const controllerProgress = room.controller.level >= 8 ? 1 : room.controller.progress / room.controller.progressTotal
            labelBar(visual, 0.1, line += 1.1, 1.4, 6, '升级', `${controllerProgress >= 1 ? 100 : ((controllerProgress * 100).toFixed(4))}%`, controllerProgress, colors.cyan, Memory.VisualLevel)
        }
    }

    // 仓库
    let storage = room.storage as StructureStorage
    if (storage) {
        const storageFree = Math.ceil(storage.store.getFreeCapacity() / 1000)
        const storageUsedPercent = storage.store.getUsedCapacity() / storage.store.getCapacity()
        const storageFreeColor = storageUsedPercent > 0.9 ? colors.rose : storageUsedPercent > 0.7 ? colors.amber : colors.cyan
        labelBar(visual, 0.1, line += 1.1, 1.4, 6, '仓库', `${storageFree}K`, storageUsedPercent, storageFreeColor, Memory.VisualLevel)
    }

    // 工厂
    let line2 = 0.7
    if (room.controller && room.controller.level >= 7) {
        if (room.memory.Factory.produce) {
            const Factory = room.memory.Factory
            const type = Object.keys(Factory.dataProduce)[0]
            if (type) {
                visual.text(`工厂生产 -> ${type} (${Factory.dataProduce[type].num})`, 8, line2 += 1.1, { color: colors.blue, opacity: 0.8, font: 0.7, align: 'left' } as const)
            }
        }
    }

    // lab 资源可视化
    if (room.memory.RoomLabBind && Object.keys(room.memory.RoomLabBind).length > 0) {
        for (const i in room.memory.RoomLabBind) {
            const lab = Game.getObjectById(i as Id<StructureLab>)
            if (!lab) {
                delete room.memory.RoomLabBind[i]
                if (room.memory.StructureIdData?.labs)
                    room.memory.StructureIdData.labs.splice(room.memory.StructureIdData.labs.indexOf(i as Id<StructureLab>), 1)
                continue
            }

            room.visual.text(
                `${room.memory.RoomLabBind[i].rType}`,
                lab.pos.x, lab.pos.y,
                { color: CompoundColor[room.memory.RoomLabBind[i].rType as keyof typeof CompoundColor], font: 0.3, align: 'center', strokeWidth: 0.2 })
        }
    }
}