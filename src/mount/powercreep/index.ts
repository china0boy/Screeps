import { assignPrototype } from "../base"
import PowerCreepMoveExtension from './move/move'

// 定义好挂载顺序
const plugins = [
    PowerCreepMoveExtension,
    ]

/**
* 依次挂载所有的拓展
*/
export default () => plugins.forEach(plugin => assignPrototype(PowerCreep, plugin))