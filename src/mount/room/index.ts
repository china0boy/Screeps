import { assignPrototype } from "../base"
import RoomCoreInitExtension from './core/init'
import RoomCoreSpawnExtension from "./core/spawn"
import RoomFunctionFindExtension from "./function/fun"
import RoomCoreEcosphereExtension from "./core/ecosphere"
import RoomMissonFrameExtension from "./misson/base/base"
import RoomMissonPublish from "./misson/publish/publish"
import RoomMissonBehaviourExtension from "./misson/base/behaviour"
import RoomMissonTransportExtension from "./misson/base/transport"
import RoomMissonVindicateExtension from "./misson/action/vindicate"
import RoomFunctionTowerExtension from "./function/tower"
import NormalWarExtension from "./misson/war/normal"
import RoomMissonManageExtension from "./misson/base/manage"
import RoomMissonDefendExtension from "./misson/action/defend"
import DefendWarExtension from "./misson/war/defend"
import RoomMissonMineExtension from "./misson/action/mine"
import PowerCreepMisson from "./misson/powerCreep/base"

// 定义好挂载顺序
const plugins = [
    RoomCoreInitExtension,
    RoomFunctionFindExtension,
    RoomCoreSpawnExtension,
    RoomCoreEcosphereExtension,
    RoomMissonFrameExtension,
    RoomMissonPublish,
    RoomFunctionTowerExtension,
    RoomMissonBehaviourExtension,
    RoomMissonTransportExtension,
    RoomMissonVindicateExtension,
    NormalWarExtension,
    RoomMissonManageExtension,
    RoomMissonDefendExtension,
    DefendWarExtension,
    RoomMissonMineExtension,
    PowerCreepMisson,
]

/**
* 依次挂载所有的拓展
*/
export default () => plugins.forEach(plugin => assignPrototype(Room, plugin))