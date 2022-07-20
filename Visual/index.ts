import { AppLifecycleCallbacks } from '../src/module/framework/types';

import { drawByConfig } from './common'
export function layoutVisual(): void {
    for (let name of ['dev', 'syc']) {
        let flag = Game.flags[name];
        if (flag) {
            drawByConfig(flag.name);
        }
    }

}

export const layoutVisualMoudle: AppLifecycleCallbacks = {
    tickEnd: layoutVisual
}