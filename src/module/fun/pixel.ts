import { AppLifecycleCallbacks } from "../framework/types"

export function pixel(): void {
    if (Game.cpu.bucket >= 10000) {
        if (Game.shard.name != 'shard3') {
            Game.cpu.generatePixel()
        }
        else {
            if (global.AveCpu && global.AveCpu <= 15 && global.CpuData.length && global.CpuData.length >= 150) Game.cpu.generatePixel()
        }
    }
}

export const pixelManager: AppLifecycleCallbacks = {
    tickEnd: pixel
}