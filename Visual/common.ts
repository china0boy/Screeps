import dev from './dev'
import RoomVisual from './RoomVisual'
export const drawByConfig = function (str: string) {

    let data: any
    let xx: number
    let yy: number
    if (str == 'dev') {
        xx = -25;
        yy = -25;
        data = dev;
    }
    let flag = Game.flags[str];
    if (!flag) {
        return;
    }
    let roomName = flag.pos.roomName;
    let rv = new RoomVisual(roomName)
    //    let poss = data.buildings['extension']['pos'];

    for (let type in data.buildings) {
        let poss = data.buildings[type]['pos'];

        for (let pos of poss) {
            let x = pos.x + xx + flag.pos.x;
            let y = pos.y + yy + flag.pos.y;
            try {
                rv.structure(x, y, type)
            } catch (e) {
                log('err:' + x + "," + y + ',' + type)
                throw e;
            }
        }

    }
    rv.connRoads();

}

export function log(str: string, color: string = 'white') {
    console.log(`<span style="color:${color}">${str}</span>`)
}