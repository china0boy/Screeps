import { loop } from "@/main";
import creep from "@/mount/creep";
import { getDistance } from "@/utils";

/**
 * 存放非任务类型角色相关的函数
*/

// 采矿工
export function harvest_(creep_: Creep): void {
    if (!Game.rooms[creep_.memory.belong]) return
    //creep_.workstate('energy')
    if (!Game.rooms[creep_.memory.belong].memory.harvestData) return
    if (creep_.store.getCapacity() - creep_.store.getUsedCapacity() < creep_.getActiveBodyparts('work') * 2) {
        let data = Game.rooms[creep_.memory.belong].memory.harvestData[creep_.memory.targetID]
        if (!data) return
        // 优先寻找link
        if (data.linkID) {
            let link = Game.getObjectById(data.linkID) as StructureLink
            let source = Game.getObjectById(creep_.memory.targetID) as Source
            if (!link) delete data.linkID
            else {
                if (creep_.room.memory.StructureIdData.source_links.indexOf(data.linkID) == -1) creep_.room.memory.StructureIdData.source_links.push(data.linkID);
                if (link.hits < link.hitsMax) { creep_.repair(link); return }
                if (creep_.pos.isNearTo(link) && creep_.transfer(link, 'energy') == OK && source) creep_.harvest(source)
                else creep_.goTo(link.pos, 1)
            }
            return
        }

        // 寻找container
        if (data.containerID) {
            let container = Game.getObjectById(data.containerID) as StructureContainer
            if (!container) { delete data.containerID; creep_.pos.createConstructionSite('container'); }
            else {
                if (container.hits < container.hitsMax) { creep_.repair(container); return }
                if (creep_.pos.isNearTo(container) && container.store.getFreeCapacity()) { creep_.transfer(container, 'energy'); return }
                else { creep_.goTo(container.pos, 1); }
            }
        }
        else {
            let container = creep_.pos.findInRange(FIND_STRUCTURES, 2, { filter: { structureType: STRUCTURE_CONTAINER } })
            if (container.length > 0) { data.containerID = container[0].id; return }
            /* 其次寻找附近的建筑工地 */
            let cons = creep_.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
            if (cons.length > 0) creep_.build(cons[0])
            else creep_.pos.createConstructionSite('container');
        }

        return
    }
    else {
        // 如果不具备挖矿功能了，就自杀
        if (creep_.getActiveBodyparts('work') <= 0) {
            creep_.suicide()
        }
        // 绑定矿点
        if (!creep_.memory.targetID) {
            for (var i in Game.rooms[creep_.memory.belong].memory.harvestData) {
                var data_ = Game.rooms[creep_.memory.belong].memory.harvestData[i]
                if (data_.carry == creep_.name) {
                    creep_.memory.targetID = i
                    break
                }
                if (!data_.harvest || !Game.creeps[data_.harvest]) {
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
        if (!creep_.pos.isNearTo(source)) { creep_.goTo(source.pos, 1); return }
        let data = Game.rooms[creep_.memory.belong].memory.harvestData[creep_.memory.targetID]
        if (!data) return
        if (data.linkID || data.containerID) {
            creep_.say("😒")
        }
        else {
            creep_.say("🤪")
        }
        if (Game.time % 5 == 0) {
            var is = creep_.pos.findInRange(FIND_DROPPED_RESOURCES, 1)
            if (is.length > 0 && is[0].amount > 20 && is[0].resourceType == 'energy') { creep_.pickup(is[0]); return }
        }
        creep_.harvest(source)
    }
}

// 搬运工
export function carry_(creep_: Creep): void {
    if (creep_.memory.fillingConstruction == undefined) creep_.memory.fillingConstruction = null;//防止没内存
    if (creep_.memory.fillingConstruction && !Game.getObjectById(creep_.memory.fillingConstruction as Id<StructureExtension | StructureSpawn>)) creep_.memory.fillingConstruction = null;
    if (Game.getObjectById(creep_.memory.fillingConstruction as Id<StructureExtension | StructureSpawn>) && !Game.getObjectById(creep_.memory.fillingConstruction as Id<StructureExtension | StructureSpawn>).store.getFreeCapacity('energy')) creep_.memory.fillingConstruction = null;//要填的建筑容量满了就重置
    if (!Game.rooms[creep_.memory.belong]) return
    creep_.workstate('energy')
    if (!creep_.memory.containerID) {
        var harvestData = Game.rooms[creep_.memory.belong].memory.harvestData
        if (!harvestData) return
        if (Object.keys(harvestData).length == 0) return
        else if (Object.keys(harvestData).length > 1) {
            for (var i in Game.rooms[creep_.memory.belong].memory.harvestData) {
                var data_ = Game.rooms[creep_.memory.belong].memory.harvestData[i]
                if (!data_.containerID) continue
                if (data_.carry == creep_.name) {
                    creep_.memory.containerID = data_.containerID
                    break
                }
                if ((!data_.carry || !Game.creeps[data_.carry]) && data_.containerID) {
                    creep_.memory.containerID = data_.containerID
                    data_.carry = creep_.name
                    break
                }
            }
            return
        }
        else {
            var harvestData_ = harvestData[Object.keys(harvestData)[0]]
            if (harvestData_.containerID) {
                let container = Game.getObjectById(harvestData_.containerID)
                if (!container) {
                    /* 删除房间相关的记忆 */
                    for (var hdata in Game.rooms[creep_.memory.belong].memory.harvestData) {
                        if (Game.rooms[creep_.memory.belong].memory.harvestData[hdata].containerID && Game.rooms[creep_.memory.belong].memory.harvestData[hdata].containerID == creep_.memory.containerID) {
                            delete Game.rooms[creep_.memory.belong].memory.harvestData[hdata].containerID
                        }
                    }
                    /* 删除爬虫相关记忆 */
                    delete creep_.memory.containerID
                    return
                }
                else {
                    creep_.memory.containerID = harvestData_.containerID
                }
            }
            else creep_.say("oh No!")
            return
        }
    }
    if (creep_.memory.working) {
        let target = null
        if (Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID)  // 优先仓库
        {
            target = Game.getObjectById(Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID) as StructureStorage
            if (!target) delete Game.rooms[creep_.memory.belong].memory.StructureIdData.storageID
        }

        if (!creep_.memory.fillingConstruction) {//内存是否有要填充的建筑
            if (!target) target = creep_.pos.getClosestStore()// 其次虫卵
            if (!target)    // 再其次防御塔
            {
                target = creep_.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'tower' && stru.store.getFreeCapacity('energy') > creep_.store.getUsedCapacity('energy')
                    }
                })
            }
            if (!target) return
        }
        let a: ScreepsReturnCode = null;
        if (!creep_.memory.fillingConstruction && target.store.getFreeCapacity('energy')) creep_.memory.fillingConstruction = target.id;

        let fillingConstruction: StructureExtension | StructureSpawn
        if (creep_.memory.fillingConstruction) {
            fillingConstruction = Game.getObjectById(creep_.memory.fillingConstruction);
            if (fillingConstruction.store.getFreeCapacity('energy')) a = creep_.transfer_(fillingConstruction, 'energy');
        }


        //边走边填，搜索下一个目标存内存并走
        if (a == OK) {
            let target1 = null;
            target1 = creep_.pos.getClosestStore(fillingConstruction);//搜索除当前的建筑的以外建筑
            if (!target1) {
                target1 = creep_.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (stru) => { return stru != fillingConstruction && stru.structureType == 'tower' && stru.store.getFreeCapacity('energy') > creep_.store.getUsedCapacity('energy') }
                });
            }
            if (target1) creep_.memory.fillingConstruction = target1.id;
            if (creep_.store.getUsedCapacity('energy') > fillingConstruction.store.getFreeCapacity('energy') && target1 && Math.max(Math.abs(target1.pos.x - creep_.pos.x), Math.abs(target1.pos.y - creep_.pos.y)) > 1) { creep_.goTo(target1.pos, 1); }
        }
    }
    else {
        let container = Game.getObjectById(creep_.memory.containerID) as StructureContainer
        if (!container) { delete creep_.memory.containerID; return }
        if (container.store.getUsedCapacity('energy') > creep_.store.getFreeCapacity()) { creep_.withdraw_(container, 'energy'); creep_.memory.fillingConstruction = null; return; }
        let res = container.pos.lookFor('resource')
        if (res && res.length && res[0].resourceType == 'energy') { creep_.pickup(res[0]); creep_.memory.fillingConstruction = null; }
        if (Game.flags[`${creep_.memory.belong}/ruin`]) {
            if (!creep_.pos.isNearTo(Game.flags[`${creep_.memory.belong}/ruin`]))
                creep_.goTo(Game.flags[`${creep_.memory.belong}/ruin`].pos, 1)
            else {
                let ruin = Game.flags[`${creep_.memory.belong}/ruin`].pos.lookFor(LOOK_RUINS)
                let swi = false
                for (let i of ruin) {
                    if (i.store.getUsedCapacity('energy') > 0) { creep_.withdraw(i, 'energy'); swi = true; return }
                }
                if (!swi) Game.flags[`${creep_.memory.belong}/ruin`].remove()
            }
            return

        }
    }
}

// 升级工
export function upgrade_(creep_: Creep): void {
    if (!Game.rooms[creep_.memory.belong]) return
    if (creep_.ticksToLive <= 1) {
        let target = Game.getObjectById(creep_.memory.targetID) as StructureStorage
        if (target) creep_.transfer_(target, 'energy')
        return;
    }
    creep_.workstate('energy')
    if (creep_.memory.working) {
        creep_.upgrade_()
        delete creep_.memory.targetID
    }
    else {
        if (Game.flags[`${creep_.memory.belong}/ruin`]) {
            if (!creep_.pos.isNearTo(Game.flags[`${creep_.memory.belong}/ruin`]))
                creep_.goTo(Game.flags[`${creep_.memory.belong}/ruin`].pos, 1)
            else {
                let ruin = Game.flags[`${creep_.memory.belong}/ruin`].pos.lookFor(LOOK_RUINS)
                for (var i of ruin) {
                    if (i.store.getUsedCapacity('energy') > 0) { creep_.withdraw(i, 'energy'); return }
                    else Game.flags[`${creep_.memory.belong}/ruin`].remove()
                }
            }
            return
        }
        if (Game.flags[`${creep_.memory.belong}/storage`]) {
            if (!creep_.pos.isNearTo(Game.flags[`${creep_.memory.belong}/storage`]))
                creep_.goTo(Game.flags[`${creep_.memory.belong}/storage`].pos, 1)
            else {
                let ruin = Game.flags[`${creep_.memory.belong}/storage`].pos.lookFor(LOOK_STRUCTURES) as StructureStorage[]
                for (let i of ruin) {
                    if (i.store && i.store.getUsedCapacity('energy') > 0) { creep_.withdraw(i, 'energy'); return }
                    else Game.flags[`${creep_.memory.belong}/storage`].remove()
                }
            }
            return
        }
        if (!creep_.memory.targetID) {
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
                target = creep_.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (stru) => {
                        return stru.structureType == 'container' && stru.store.getUsedCapacity('energy') > creep_.store.getFreeCapacity()
                    }
                })
            }
            if (!target) { creep_.say("😑"); return }
            else { creep_.memory.targetID = target.id }
        }
        else {
            let target = Game.getObjectById(creep_.memory.targetID) as StructureStorage
            if (target) creep_.withdraw_(target, 'energy')
        }
    }
    if (Game.time % 20 == 0) {
        let tombstone = creep_.pos.findInRange(FIND_TOMBSTONES, 1, { filter: function (object) { return object.store.getUsedCapacity('energy'); } });//找到附近墓碑并拿能量
        for (let a of tombstone) creep_.withdraw(a, 'energy');
    }


}

// 建筑工
export function build_(creep: Creep): void {
    var thisRoom = Game.rooms[creep.memory.belong]
    if (creep.ticksToLive <= 50 && !creep.store.energy) { creep.suicide(); return; }
    if (!thisRoom) return
    if (!creep.memory.standed) creep.memory.standed = false
    creep.workstate('energy')
    if (creep.memory.working) {
        var construction = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
        if (construction) {
            creep.build_(construction)
        }
        else {

            /* 没有建筑物则考虑道路维护 */
            var roads = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType == 'road' && structure.hits < structure.hitsMax
                }
            })
            if (roads) {
                creep.say("🛠️")
                if (creep.repair(roads) == ERR_NOT_IN_RANGE) {
                    creep.goTo(roads.pos, 1)
                }
                if (getDistance(creep.pos, roads.pos) <= 3)
                    creep.memory.standed = false
            }
        }
    }
    else {
        creep.memory.standed = false
        if (Game.flags[`${creep.memory.belong}/ruin`]) {
            if (!creep.pos.isNearTo(Game.flags[`${creep.memory.belong}/ruin`]))
                creep.goTo(Game.flags[`${creep.memory.belong}/ruin`].pos, 1)
            else {
                let ruin = Game.flags[`${creep.memory.belong}/ruin`].pos.lookFor(LOOK_RUINS)
                let swi = false
                for (var i of ruin) {
                    if (i.store.getUsedCapacity('energy') > 0) { creep.withdraw(i, 'energy'); swi = true; return }
                }
                if (!swi) Game.flags[`${creep.memory.belong}/ruin`].remove()
            }
            return
        }
        /* 如果有storage就去storage里找，没有就自己采集 */
        if (thisRoom.memory.StructureIdData.storageID || thisRoom.memory.StructureIdData.terminalID) {
            var storage = Game.getObjectById(thisRoom.memory.StructureIdData.storageID) as StructureStorage
            var terminal_ = Game.getObjectById(Game.rooms[creep.memory.belong].memory.StructureIdData.terminalID) as StructureTerminal
            if (!storage) {
                delete thisRoom.memory.StructureIdData.storageID
            }
            if (storage) {
                if (terminal_) {
                    if (storage.store.energy >= terminal_.store.energy) creep.withdraw_(storage, 'energy');
                    else creep.withdraw_(terminal_, 'energy')
                }
                else creep.withdraw_(storage, 'energy')
            }
            else {
                if (terminal_ && terminal_.store.getUsedCapacity('energy') >= creep.store.getCapacity()) creep.withdraw_(terminal_, 'energy')
            }
        }
        else {
            var container = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: (stru) => { return stru.structureType == 'container' && stru.store.getUsedCapacity('energy') > creep.store.getCapacity() } })
            if (container) {
                if (!creep.pos.isNearTo(container)) {
                    creep.goTo(container.pos, 1)
                }
                else {
                    creep.withdraw(container, 'energy')
                }

            }
        }
    }

}

//挖化合物
export function harvest_Mineral(creep: Creep): void {
    var thisRoom = Game.rooms[creep.memory.belong];
    var structues = thisRoom.storage ? thisRoom.storage : thisRoom.terminal ? thisRoom.terminal : null
    var mineral = Game.getObjectById(thisRoom.memory.StructureIdData.mineralID) as Mineral;
    if (!thisRoom || !structues) return;
    if (creep.ticksToLive <= 100) {
        if (creep.store.getUsedCapacity()) creep.transfer_(structues, Object.keys(creep.store)[0] as ResourceConstant);
        else creep.suicide();
        return;
    }
    if (creep.store.getFreeCapacity() < creep.getActiveBodyparts('work')) {
        creep.transfer_(structues, Object.keys(creep.store)[0] as ResourceConstant);
    }
    else {
        creep.harvest_(mineral);
    }
}