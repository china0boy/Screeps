import { AppLifecycleCallbacks } from 'src/module/framework/types';
import RoomVisual from './RoomVisual'
let autoPlanner63 = require('autoPlanner63');
// 轮子 非自创
import { drawByConfig } from './common'

export function layoutVisual(): void {
    for (let name of ['Dev', '63', 'Hoho', 'Tea', 'syc']) {
        let flag = Game.flags[name];
        if (flag) {
            switch (name) {
                case 'Dev':
                    drawByConfig(flag.name);
                    break;
                case 'Hoho':
                    drawByConfig(flag.name);
                    break;
                case 'Tea':
                    drawByConfig(flag.name);
                    break;
                case 'syc':
                    drawByConfig(flag.name);
                    break;
                case '63':
                    /* storagePos 可以手动定位中心点 */
                    var p = Game.flags.p;
                    var pa = Game.flags.pa;
                    var pb = Game.flags.pb;
                    var pc = Game.flags.pc;
                    var pm = Game.flags.pm;
                    if (p) {
                        global.roomStructsData = autoPlanner63.ManagerPlanner.computeManor(p.pos.roomName, [pc, pm, pa, pb])
                        Game.flags.p.remove()
                        global.roomStructsData.structMaplv = [];/*进行数据清空的操作*/
                    }
                    if (global.roomStructsData) {
                        if (Game.flags._dayin) {
                            console.log(JSON.stringify(global.roomStructsData))
                            Game.flags._dayin.remove();
                        }
                        let ret = {
                            structMap: global.roomStructsData.structMap
                        };
                        let _add_lv_state = false;
                        if (global.roomStructsData.structMaplv.length < 1) {
                            _add_lv_state = true;
                        }
                        for (let level = 1; level <= 8; level++) {
                            for (let type in CONTROLLER_STRUCTURES) {
                                let lim = CONTROLLER_STRUCTURES[type]
                                if (type == 'road') {
                                    if (level == 4) {
                                        for (let i = 0; i < ret.structMap[type].length; i++) {
                                            let e = ret.structMap[type][i]
                                            if (_add_lv_state) {
                                                global.roomStructsData.structMaplv.push(`${e[0]}/${e[1]}/${type}/${level}`)
                                            }
                                            new RoomVisual(flag.pos.roomName).text(level.toString(), e[0] + 0.3, e[1] + 0.5, { font: 0.4, opacity: 0.8 })
                                        }
                                    }
                                } else {
                                    for (let i = lim[level - 1]; i < Math.min(ret.structMap[type].length, lim[level]); i++) {
                                        let e = ret.structMap[type][i]
                                        if (type != 'rampart') {
                                            if (_add_lv_state) {
                                                global.roomStructsData.structMaplv.push(`${e[0]}/${e[1]}/${type}/${level}`)
                                            }
                                            // {x: -4, y: -3,structureType:'extension',level:2}
                                            new RoomVisual(flag.pos.roomName).text(level.toString(), e[0] + 0.3, e[1] + 0.5, { font: 0.4, opacity: 0.8 })
                                        }
                                    }
                                }

                            }
                        }
                        if (Game.flags.savestructMap) {
                            if (Memory.RoomControlData[flag.pos.roomName]) {
                                Memory.RoomControlData[flag.pos.roomName].structMap = global.roomStructsData.structMaplv
                                Game.flags.savestructMap.remove();
                                console.log(`[LayoutVisual63] 房间${flag.pos.roomName}63布局已经刷新`)
                            }
                        }

                        //这个有点消耗cpu 不看的时候记得关
                        //autoPlanner63.HelperVisual.showRoomStructures(global.roomStructsData.roomName, global.roomStructsData.structMap)
                        showRoomStructures(global.roomStructsData.roomName, global.roomStructsData.structMap)
                    }
            }
        }
    }

}

function showRoomStructures(roomName: string, structMap: StructMap) {
    let terrian = new Room.Terrain(roomName)
    let rv = new RoomVisual(roomName)
    _.keys(CONTROLLER_STRUCTURES).forEach(struct => {
        structMap[struct].forEach(e => {
            try {
                if (terrian.get(e[0], e[1]) != TERRAIN_MASK_WALL)
                    rv.structure(e[0], e[1], struct)
            } catch (e) {
                log('err:' + e[0] + "," + e[1] + ',' + struct)
                throw e;
            }
        })
    })
}

export function log(str: string, color: string = 'white') {
    console.log(`<span style="color:${color}">${str}</span>`)
}

export const layoutVisualMoudle: AppLifecycleCallbacks = {
    tickEnd: layoutVisual
}
