import { RoleData, RoleLevelData } from "@/constant/SpawnConstant"
import { CalculateEnergy, GenerateAbility } from "@/utils"

/* [通用]爬虫运行主程序 */
export default () => {
  /* powercreep */
  for (var pc in Game.powerCreeps) {
    if (Game.powerCreeps[pc].ticksToLive) {
      Game.powerCreeps[pc].ManageMisson()
      //console.log(`${pc}`)
    }

  }

  /* creep */
  let adaption = true  // 每tick执行一次adaption检查
  for (var c in Game.creeps) {
    //let time1 = Game.cpu.getUsed()//
    let thisCreep = Game.creeps[c]
    if (!thisCreep) continue
    //console.log(`${thisCreep} ${thisCreep.pos.roomName}`)
    /* 跨shard找回记忆 */
    if (!thisCreep.memory.role) {
      var InshardMemory = JSON.parse(InterShardMemory.getLocal()) || {}
      if (InshardMemory.creep && InshardMemory.creep[c]) {
        Game.creeps[c].memory = InshardMemory.creep[c].MemoryData
      }
      continue
    }
    if (!RoleData[thisCreep.memory.role]) continue
    if (adaption && thisCreep.memory.adaption && thisCreep.store.getUsedCapacity() == 0) {
      let room = Game.rooms[thisCreep.memory.belong]
      if (!room || !RoleLevelData[thisCreep.memory.role] || !RoleLevelData[thisCreep.memory.role][room.controller.level]) continue
      let bodyData = RoleLevelData[thisCreep.memory.role][room.controller.level].bodypart
      let allSpawnenergy = CalculateEnergy(GenerateAbility(bodyData[0], bodyData[1], bodyData[2], bodyData[3], bodyData[4], bodyData[5], bodyData[6], bodyData[7],))
      if (bodyData && room.energyAvailable >= allSpawnenergy && room.memory.SpawnList && room.memory.SpawnList.length <= 0) {
        thisCreep.suicide()
        adaption = false
      }
      /* adaption爬虫执行自杀 */
    }
    /* 非任务类型爬虫 */
    let a = Game.cpu.getUsed()
    if (RoleData[thisCreep.memory.role].fun) {
      RoleData[thisCreep.memory.role].fun(thisCreep)
    }
    /* 任务类型爬虫 */
    else {
      thisCreep.ManageMisson()
    }
    let b = Game.cpu.getUsed()
    if (b - a > 0.5) {
      //console.log(`爬虫${thisCreep.name}|角色${thisCreep.memory.role}消耗cpu:${b-a}`)
    }
    /* 进行治疗 */
    if (thisCreep.hits < thisCreep.hitsMax && thisCreep.room.name == thisCreep.memory.belong && thisCreep.room.memory.state == 'peace')
      thisCreep.optTower('heal', thisCreep);
    //let time2 = Game.cpu.getUsed()//
    //if (time2 - time1 > 1) console.log(`${thisCreep.pos.roomName}: ${thisCreep.name} cpu:${time2 - time1}`)
  }
}