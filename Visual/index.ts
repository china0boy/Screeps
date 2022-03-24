import { drawByConfig } from './common'
export default function (): void {
    for (let name of ['dev']) {
        let flag = Game.flags[name];
        if (flag) {
            drawByConfig(flag.name);
        }
    }

}