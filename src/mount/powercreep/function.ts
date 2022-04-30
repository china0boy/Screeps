export default class PowerCreepFunctionExtension extends PowerCreep {
    public workstate(rType:ResourceConstant = RESOURCE_ENERGY):void
    {
        if (!this.memory.working) this.memory.working = false;
        if(this.memory.working && this.store[rType] == 0 ) {
            this.memory.working = false;
        }
        if(!this.memory.working && this.store.getFreeCapacity() == 0) {
            this.memory.working = true;
        }
    }


    public transfer_(distination:Structure,rType:ResourceConstant = RESOURCE_ENERGY) : void{
        if (this.transfer(distination,rType) == ERR_NOT_IN_RANGE)
        {
            this.goTo(distination.pos,1)
        }
        this.memory.standed = false
    }

    public withdraw_(distination:Structure,rType:ResourceConstant = RESOURCE_ENERGY) : void{
        if (this.withdraw(distination,rType) == ERR_NOT_IN_RANGE)
        {
            this.goTo(distination.pos,1)
        }
        this.memory.standed = false
    }

    
    // 召唤所有房间内的防御塔治疗/攻击 自己/爬虫 [不一定成功]
    public optTower(otype: 'heal' | 'attack', creep: PowerCreep): void {
        if (this.room.name != this.memory.belong || Game.shard.name != this.memory.shard) return
        for (var i of Game.rooms[this.memory.belong].memory.StructureIdData.AtowerID) {
            let tower_ = Game.getObjectById(i) as StructureTower
            if (!tower_) continue
            if (otype == 'heal') {
                tower_.heal(creep)
            }
            else {
                tower_.attack(creep)
            }
        }
    }

}