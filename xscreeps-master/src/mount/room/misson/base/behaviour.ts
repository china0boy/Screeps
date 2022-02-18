/* 房间原型拓展   --任务  --基本功能 */
export default class RoomMissonBehaviourExtension extends Room {
    // 搬运基本任务
    public Task_Carry(misson:MissionModel):void{
        /* 搬运任务需求 sourcePosX,Y sourceRoom targetPosX,Y targetRoom num  rType  */
        // 没有任务数据 或者数据不全就取消任务
        if (!misson.Data) this.DeleteMission(misson.id)
        if (!misson.CreepBind) this.DeleteMission(misson.id)
    }

    // 建造任务
    public Constru_Build():void{
        if (Game.time % 51) return
        if (this.controller.level < 5) return
        var myConstrusion = new RoomPosition(Memory.RoomControlData[this.name].center[0],Memory.RoomControlData[this.name].center[1],this.name).findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
        if (myConstrusion)
        {
            /* 添加一个进孵化队列 */
            this.NumSpawn('build',1)
        }
        else
        {
            delete this.memory.SpawnConfig['build']
        }
    }

    // 资源link资源转移至centerlink中
    public Task_CenterLink():void{
        if ((global.Gtime[this.name]- Game.time) % 13) return
        if (!this.memory.StructureIdData.source_links) this.memory.StructureIdData.source_links = []
        if (!this.memory.StructureIdData.center_link || this.memory.StructureIdData.source_links.length <= 0) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link){delete this.memory.StructureIdData.center_link;return}
        else {if (center_link.store.getUsedCapacity('energy') > 750)return}
        for (let id of this.memory.StructureIdData.source_links )
        {
            let source_link = Game.getObjectById(id) as StructureLink
            if (!source_link)
            {
                let index = this.memory.StructureIdData.source_links.indexOf(id)
                this.memory.StructureIdData.source_links.splice(index,1)
                return
            }
            if (source_link.store.getUsedCapacity('energy') >= 600 && this.Check_Link(source_link.pos,center_link.pos))
            {
                var thisTask = this.Public_link([source_link.id],center_link.id,10)
                this.AddMission(thisTask)
                return
            }
        }
    }

    // 消费link请求资源 例如升级Link
    public Task_ComsumeLink():void{
        if ((global.Gtime[this.name]- Game.time) % 7) return
        if (!this.memory.StructureIdData.center_link) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link){delete this.memory.StructureIdData.center_link;return}
        if (this.memory.StructureIdData.upgrade_link)
        {
            let upgrade_link = Game.getObjectById(this.memory.StructureIdData.upgrade_link) as StructureLink
            if (!upgrade_link){delete this.memory.StructureIdData.upgrade_link;return}
            if (upgrade_link.store.getUsedCapacity('energy') < 500)
            {
                var thisTask = this.Public_link([center_link.id],upgrade_link.id,25)
                this.AddMission(thisTask)
                return
            }
            if (this.memory.StructureIdData.comsume_link.length > 0)
            {
                for (var i of this.memory.StructureIdData.comsume_link)
                {
                    let l = Game.getObjectById(i) as StructureLink
                    if (!l){
                        let index = this.memory.StructureIdData.comsume_link.indexOf(i)
                        this.memory.StructureIdData.comsume_link.splice(index,1)
                        return
                    }
                    if (l.store.getUsedCapacity('energy') <= 400)
                    {
                        var thisTask = this.Public_link([center_link.id],l.id,35)
                        this.AddMission(thisTask)
                        return
                    }
                }
            }
        }
    }
    
}