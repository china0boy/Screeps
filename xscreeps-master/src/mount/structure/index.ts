import { assignPrototype } from '../base'
import linkExtension from './link'
import terminalExtension from './terminal'

// 定义好挂载顺序
export default ()=> {
    assignPrototype(StructureLink,linkExtension)
    assignPrototype(StructureTerminal,terminalExtension)
}