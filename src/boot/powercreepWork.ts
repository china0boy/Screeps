export const powerCreepRunner = function (pc: PowerCreep): void {
    if (pc && pc.ticksToLive) {
        if (pc.hits < pc.hitsMax && pc.room.name == pc.memory.belong && pc.room.memory.state == 'peace') pc.optTower('heal', pc);
        pc.ManageMisson()
    }
}