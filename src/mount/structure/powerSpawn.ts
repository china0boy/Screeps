import { colorful } from '@/utils'
import { createHelp } from '../help/help'

/**
 * PowerSpawn 拓展
 * ps 的主要任务就是 processPower，一旦 ps 启动之后，他会每隔一段时间对自己存储进行检查
 * 发现自己资源不足，就会发起向自己运输资源的物流任务。
 * 
 * 可以随时通过原型上的指定方法来暂停/重启 ps，详见 .help()
 */
export class PowerSpawnExtension extends StructurePowerSpawn {
    public ManageMission(): void {
        this.work()
    }

    public work(): void {
        // ps 未启用或者被暂停了就跳过
        if (this.room.memory.pausePS === undefined) this.room.memory.pausePS = true;
        if (this.room.memory.pausePS) return;
        // 处理 power
        this.processPower()
        if (Game.time % 4) return
        // 发布强化powerSpawn任务
        if (Game.powerCreeps[`${this.room.name}/queen/${Game.shard.name}`] && this.room.storage && this.room.storage.store.power >= 6000) this.room.enhance_powerspawn()
        // 剩余 power 不足且 storage 内 power 充足
        if (!this.keepResource(RESOURCE_POWER, 10, this.room.storage, 0)) return
        // 剩余energy 不足且 storage 内 energy 充足
        if (!this.keepResource(RESOURCE_ENERGY, 1000, this.room.storage, 50000)) return
    }

    /**
     * 将自身存储的资源维持在指定容量之上
     * 
     * @param resource 要检查的资源
     * @param amount 当资源余量少于该值时会发布搬运任务
     * @param source 资源不足时从哪里获取资源
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @returns 该资源是否足够
     */
    private keepResource(resource: ResourceConstant, amount: number, source: StructureStorage | StructureTerminal, sourceLimit: number): boolean {
        if (this.store[resource] >= amount || source.store[resource] < sourceLimit) return true

        // 检查来源是否符合规则，符合则发布资源转移任务
        if (this.room.RoleMissionNum('manage', '物流运输') > 1) return
        let thisTask = this.room.Public_Carry({ 'manage': { num: 1, bind: [] } }, 10, this.room.name, source.pos.x, source.pos.y, this.room.name, this.pos.x, this.pos.y, resource, this.store.getFreeCapacity(resource))
        this.room.AddMission(thisTask)

        return false
    }
}

export class PowerSpawnConsole extends PowerSpawnExtension {
    /**
     * 用户操作 - 启动 powerSpawn
     */
    public on(): string {
        // 把自己注册到全局的启用 ps 列表
        if (this.room.memory.pausePS === undefined) this.room.memory.pausePS = false
        if (this.room.memory.pausePS)
            this.room.memory.pausePS = false

        return `[${this.room.name} PowerSpawn] 已启动 process power`
    }

    /**
     * 用户操作 - 关闭 powerSpawn
     */
    public off(): string {
        this.room.memory.pausePS = true
        return `[${this.room.name} PowerSpawn] 已暂停 process power`
    }

    /**
     * 用户操作 - 查看 ps 运行状态
     */
    public stats(): string {
        let roomsStats: string[] = []
        // 生成状态
        const working = this.store[RESOURCE_POWER] > 1 && this.store[RESOURCE_ENERGY] > 50
        const stats = this.room.memory.pausePS ? colorful('暂停工作中', 'red') : working ? colorful('工作中', 'green') : colorful('等待资源中', 'red')
        // 统计 powerSpawn、storage、terminal 的状态
        roomsStats.push(`[${this.room.name}] ${stats} POWER: ${this.store[RESOURCE_POWER]}/${POWER_SPAWN_POWER_CAPACITY} ENERGY: ${this.store[RESOURCE_ENERGY]}/${POWER_SPAWN_ENERGY_CAPACITY}`)
        roomsStats.push(this.room.storage ? `Storage energy: ${this.room.storage.store[RESOURCE_ENERGY]}` : `Storage X`)
        roomsStats.push(this.room.storage ? `Storage power: ${this.room.storage.store[RESOURCE_POWER]}` : `Terminal X`)

        return roomsStats.join(' || ')
    }

    /**
     * 用户操作 - 帮助信息
     */
    public help(): string {
        return createHelp({
            name: 'PowerSpawn 控制台',
            describe: `ps 默认不启用，执行 ${colorful('.on', 'yellow')}() 方法会启用 ps。启用之后会进行 power 自动平衡。`,
            api: [
                {
                    title: '启动/恢复处理 power',
                    functionName: 'on'
                },
                {
                    title: '暂停处理 power',
                    functionName: 'off'
                },
                {
                    title: '查看当前状态',
                    functionName: 'stats'
                }
            ]
        })
    }
}