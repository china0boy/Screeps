import mountCreep from './creep'
import mountPosition from './position'
import mountRoom from './room'
import mountConsole from './console'
import mountStructure from './structure'
import mountPowerCreep from './powercreep'
import mountHelp from './help'
export default function (): void {
    if (!global.Mounted) {
        mountHelp()
        mountConsole()
        mountPosition()
        mountRoom()
        mountStructure()
        mountCreep()
        mountPowerCreep()
        global.Mounted = true
    }
}