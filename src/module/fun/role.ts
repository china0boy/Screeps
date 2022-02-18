import { loop } from "@/main";
import { getDistance } from "@/utils";

/**
 * 存放非任务类型角色相关的函数
*/

// 采矿工
export function harvest_(creep_:Creep):void{
    if (!Game.rooms[creep_.memory.belong]) return
    creep_.workstate('energy')
    if (!Game.rooms[creep_.memory.belong].memory.harvestData) return
    if (creep_.memory.working)
    {
        let data = Game.rooms[creep_.memory.belong].memory.harvestData[creep_.memory.targetID]
        if (!data) return
        // 优先寻找link
        if (data.linkID)
        {
            let link = Game.getObjectById(data.linkID) as StructureLink
            if (!link) delete data.linkID
            else
            {
                if (link.hits < link.hitsMax) {creep_.repair(link);return}
                if (creep_.pos.isNearTo(link))creep_.transfer(link,'energy')
                else creep_.goTo(link.pos,1)
            }
            return
        }
        // 其次寻找container
        if (data.containerID)
        {
            let container = Game.getObjectById(data.containerID) as StructureLink
            if (!container) delete data.containerID
            else
            {
                if (container.hits < container.hitsMax) {creep_.repair(container);return}
                if (creep_.pos.isNearTo(container))creep_.transfer(container,'energy')
                else creep_.goTo(container.pos,1)
            }
            return
        }
        /* 最后寻找附近的建筑工地 */
        let cons = creep_.pos.findInRange(FIND_MY_CONSTRUCTION_SITES,3)
        if (cons.length > 0) creep_.build(cons[0])
        else creep_.pos.createConstructionSite('container')
        return
    }
    else
    {
        // 如果不具备挖矿功能了，就自杀
        if (creep_.getActiveBodyparts('work') <= 0)
        {
            creep_.suicide()
        }
        // 绑定矿点
        if (!creep_.memory.targetID)
        {
            for (var i in Game.rooms[creep_.memory.belong].memory.harvestData)
            {
                var data_ = Game.rooms[creep_.memory.belong].memory.harvestData[i]
                if (data_.carry == creep_.name)
                {
                    creep_.memory.targetID = i
                    break
                }
                if (!data_.harvest || !Game.creeps[data_.harvest])
                {
                    creep_.memory.targetID = i
                    data_.harvest = creep_.name
                    break
                }
            }
            return
        }
        /* 寻找target附近的container */
        let source = Game.getObjectById(creep_.memory.targetID) as Source
        if (!source) return
        if (!creep_.pos.isNearTo(source)){creep_.goTo(source.pos,1);return}
        let data = Game.rooms[creep_.memory.belong].memory.harvestData[creep_.memory.targetID]
        if (!data) return
        if (data.linkID || data.containerID)
        {
            creep_.say("😒",true)
        }
        else
        {
            creep_.say("🤪",true)
        }
        if (Game.time % 5 == 0)
        {
            var is = creep_.pos.findInRange(FIND_DROPPED_RESOURCES,1)
            if (is.length > 0 && is[0].amount > 20 && is[0].resourceType == 'energy')
            {creep_.pickup(is[0]);return}
        }
        creep_.harvest(source)
    }
}

// 搬运工
export function carry_(creep_:Creep):void{
    if (!Game.rooms[creep_.memory.belong]) return
    creep_.workstate('energy')
    if (!creep_.memory.containerID)
    {
        var harvestData = Game.rooms[creep_.memory.belong].memory.harvestData
        if (!harvestData) return
        if (Object.keys(harvestData).length == 0) return
        else if (Object.keys(harvestData).length > 1)
        {
            for (var i in Game.rooms[creep_.memory.belong].memory.harvestData)
            {
                var data_ = Game.rooms[creep_.memory.belong].memory.harvestData[i]
                if (data_.carry == creep_.name)
                {
                    creep_.memory.containerID = data_.containerID
                    break
                }
                if ((!data_.carry || !Game.creeps[data_.carry]) && data_.containerID)
                {
                    creep_.memory.containerID = data_.containerID
                    data_.carry = creep_.name
                    break
                }
            }
            return
        }
        else
        {
            var harvestData_ = harvestData[Object.keys(harvestData)[0]]
            if (harvestData_.containerID)
            {
                let container = Game.getObjectById(harvestData_.containerID)
                if (!container) delete harvestData_.containerID
                else
                {
                    creep_.memory.containerID = harvestData_.containerID
                }
            }
            else creep_.say("oh No!")
            return
        }
    }
    if (creep_.memory.working)
    {
        let target = null
        if (Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID)  // 优先仓库
        {
            target = Game.getObjectById(Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID) as StructureStorage
            if (!target) delete Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID
        }
        if (!target)    // 其次虫卵
        {
            target = creep_.pos.getClosestStore()
        }
        if (!target)    // 再其次防御塔
        {
            target = creep_.pos.findClosestByRange(FIND_STRUCTURES,{filter:(stru)=>{
                return stru.structureType == 'tower' && stru.store.getFreeCapacity('energy') > creep_.store.getUsedCapacity('energy')
            }})
        }
        if (!target) return
        creep_.transfer_(target,'energy')
    }
    else
    {
        let container = Game.getObjectById(creep_.memory.containerID) as StructureContainer
        if (!container) {delete creep_.memory.containerID;return}
        if (!creep_.pos.isNearTo(container)) creep_.goTo(container.pos,1)
        else {if(container.store.getUsedCapacity('energy')>creep_.store.getFreeCapacity())creep_.withdraw(container,'energy')}
    }
}

// 升级工
export function upgrade_(creep_:Creep):void{
    if (!Game.rooms[creep_.memory.belong]) return
    creep_.workstate('energy')
    if (creep_.memory.working)
    {
        creep_.upgrade_()
        delete creep_.memory.targetID
    }
    else
    {
        if (Game.flags[`${creep_.memory.belong}/ruin`])
        {
            if (!creep_.pos.isNearTo(Game.flags[`${creep_.memory.belong}/ruin`]))
                creep_.goTo(Game.flags[`${creep_.memory.belong}/ruin`].pos,1)
            else
            {
                let ruin = Game.flags[`${creep_.memory.belong}/ruin`].pos.lookFor(LOOK_RUINS)
                let swi = false
                for (var i of ruin)
                {
                    if (i.store.getUsedCapacity('energy') > 0) {creep_.withdraw(i,'energy');swi = true;return}
                }
                if (!swi) Game.flags[`${creep_.memory.belong}/ruin`].remove()
            }
            return
        }
        if (!creep_.memory.targetID)
        {
            let target = null
            if (Game.rooms[creep_.memory.belong].memory.StructureIdData.upgrade_link)       // 优先Link
            {
                target = Game.getObjectById(Game.rooms[creep_.memory.belong].memory.StructureIdData.upgrade_link) as StructureLink
                if (!target) delete Game.rooms[creep_.memory.belong].memory.StructureIdData.upgrade_link
            }
            else if (Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID)  // 优先仓库
            {
                target = Game.getObjectById(Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID) as StructureStorage
                if (!target) delete Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID
            }
            if (!target)    // 其次container
            {
                target = creep_.pos.findClosestByRange(FIND_STRUCTURES,{filter:(stru)=>{
                    return stru.structureType == 'container' && stru.store.getUsedCapacity('energy') > creep_.store.getFreeCapacity()
                }})
            }
            if (!target) {creep_.say("😑",true);return}
            else {creep_.memory.targetID = target.id}
        }
        else
        {
            let target = Game.getObjectById(creep_.memory.targetID) as StructureStorage
            if (target) creep_.withdraw_(target,'energy')
        }

    }

}

// 建筑工
export function build_(creep:Creep):void{
    var thisRoom = Game.rooms[creep.memory.belong]
    if (!thisRoom) return
    if (!creep.memory.standed) creep.memory.standed = false
    creep.workstate('energy')
    if (creep.memory.working)
    {
        var construction = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
        if (construction)
        {
            creep.build_(construction)
        }
        else
        {
            
            /* 没有建筑物则考虑道路维护 */
            var roads = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(structure)=>{
                return structure.structureType == 'road' && structure.hits < structure.hitsMax
            }})
            if (roads)
            {
                creep.say("🛠️",true)
                if (creep.repair(roads) == ERR_NOT_IN_RANGE)
                {
                    creep.goTo(roads.pos,1)
                }
                if (getDistance(creep.pos,roads.pos) <= 3)
                creep.memory.standed = false
            }
        }
    }
    else
    {
        creep.memory.standed = false
        if (Game.flags[`${creep.memory.belong}/ruin`])
        {
            if (!creep.pos.isNearTo(Game.flags[`${creep.memory.belong}/ruin`]))
                creep.goTo(Game.flags[`${creep.memory.belong}/ruin`].pos,1)
            else
            {
                let ruin = Game.flags[`${creep.memory.belong}/ruin`].pos.lookFor(LOOK_RUINS)
                let swi = false
                for (var i of ruin)
                {
                    if (i.store.getUsedCapacity('energy') > 0) {creep.withdraw(i,'energy');swi = true;return}
                }
                if (!swi) Game.flags[`${creep.memory.belong}/ruin`].remove()
            }
            return
        }
        /* 如果有storage就去storage里找，没有就自己采集 */
        if (thisRoom.memory.StructureIdData.storageID || thisRoom.memory.StructureIdData.terminalID)
        {
            var storage = Game.getObjectById(thisRoom.memory.StructureIdData.storageID) as StructureStorage
            if (!storage)
            {
                delete thisRoom.memory.StructureIdData.storageID
            }
            if (storage && storage.store.getUsedCapacity('energy') >= creep.store.getCapacity()) creep.withdraw_(storage,'energy')
            else
            {
                let terminal_ = Game.getObjectById(Game.rooms[creep.memory.belong].memory.StructureIdData.terminalID) as StructureTerminal
                if (terminal_ && terminal_.store.getUsedCapacity('energy') >= creep.store.getCapacity()) creep.withdraw_(terminal_,'energy')
            }
        }
        else
        {
            var container = creep.pos.findClosestByPath(FIND_STRUCTURES,{filter:(stru)=>{return stru.structureType == 'container' && stru.store.getUsedCapacity('energy') > creep.store.getCapacity()}})
            if (container)
            {
                if (!creep.pos.isNearTo(container))
                {
                    creep.goTo(container.pos,1)
                }
                else
                {
                    creep.withdraw(container,'energy')
                }
                
            }
        }
    }

}