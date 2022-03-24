import { assignPrototype } from '../base'
import linkExtension from './link'
import terminalExtension from './terminal'
import { ObserverExtension, ObserverConsole } from './observer'
import { factoryExtension, factoryConsole } from './factory'
import { PowerSpawnExtension, PowerSpawnConsole } from './powerSpawn'

// 定义好挂载顺序
export default () => {
    assignPrototype(StructureLink, linkExtension)
    assignPrototype(StructureTerminal, terminalExtension)
    assignPrototype(StructureObserver, ObserverExtension)
    assignPrototype(StructureObserver, ObserverConsole)
    assignPrototype(StructureFactory, factoryExtension)
    assignPrototype(StructureFactory, factoryConsole)
    assignPrototype(StructurePowerSpawn, PowerSpawnExtension)
    assignPrototype(StructurePowerSpawn, PowerSpawnConsole)
}