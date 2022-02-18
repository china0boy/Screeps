import { filter_structure, isInArray, LeastHit } from "@/utils"

/* 房间原型拓展   --方法  --寻找 */
export default class RoomFunctionFindExtension extends Room {
    /* 获取指定structureType的建筑列表 */
    public getStructure(sc:StructureConstant):Structure[]
    {
        return this.find(FIND_STRUCTURES,{filter:{structureType:sc}})
    }

    /* 任务lab绑定数据生成便捷函数 */
    public Bind_Lab(rTypes:ResourceConstant[]):MissonLabBind | null{
        var result:MissonLabBind = {}
        var tempList = []
        LoopA:
        for (var i of rTypes)
        {
            /* 计算是否已经存在相关lab */
            for (var occ_lab_id in this.memory.RoomLabBind)
            {
                if (this.memory.RoomLabBind[occ_lab_id].rType == i && !this.memory.RoomLabBind[occ_lab_id].occ)
                {
                    result[occ_lab_id] = i
                    continue LoopA
                }
            }
            LoopB:
            for (var all_lab_id of this.memory.StructureIdData.labs)
            {
                var occ_lab = Object.keys(this.memory.RoomLabBind)
                if (!isInArray(occ_lab,all_lab_id) && !isInArray(tempList,all_lab_id))
                {
                    var thisLab = Game.getObjectById(all_lab_id) as StructureLab
                    if (!thisLab)
                    {
                        var index = this.memory.StructureIdData.labs.indexOf(all_lab_id)
                        this.memory.StructureIdData.labs.splice(index,1)
                        continue LoopB
                    }
                    if (thisLab.store)
                    {
                        if (Object.keys(thisLab.store).length <= 1)
                        {
                            result[all_lab_id] = i
                            tempList.push(all_lab_id)
                            continue LoopA
                        }
                        else if (Object.keys(thisLab.store).length == 1)
                        {
                            if (thisLab.store['energy'] > 0)
                            {
                                result[all_lab_id] = i
                                tempList.push(all_lab_id)
                                continue LoopA
                            }
                            continue LoopB
                        }
                        else if (Object.keys(thisLab.store).length > 1)
                        continue LoopB
                    }
                }
            }
            return null
        }
        return result
    }

    /* 获取指定列表中类型的hit最小的建筑 (比值) 返回值： Structure | undefined */
    public getListHitsleast(sc:StructureConstant[],mode?:number):Structure | undefined
    {
        if (!mode) mode = 2
        /* 3 */
        if (mode == 3) mode = 0
        let s_l = this.find(FIND_STRUCTURES,{filter:(structure)=>{
            return filter_structure(structure,sc) && structure.hits < structure.hitsMax
        }})
        let least_ = LeastHit(s_l,mode,)
        return least_
    }

    /* 获取指定类型的建筑 */
    public getTypeStructure(sr:StructureConstant[]):Structure[]
    {
        var resultstructure = this.find(FIND_STRUCTURES,{filter:(structure)=>{
            return filter_structure(structure,sr)
        }})
        return resultstructure
    }

    /* 房间建筑执行任务 */
    public structureMission(strus:StructureConstant[]):void{
        var AllStructures =  this.getTypeStructure(strus) as StructureLink[]
        for (var stru of AllStructures)
        {
            if (stru.ManageMission)
                stru.ManageMission()
        }
    }
/**
    * 建筑任务初始化 目前包含terminal factory link
    */
    public StructureMission():void{
        let structures = []
        var IdData = this.memory.StructureIdData
        if (IdData.terminalID)
        {
            let terminal = Game.getObjectById(IdData.terminalID) as StructureTerminal
            if (!terminal) {delete IdData.terminalID}
            else structures.push(terminal)
        }
        if (IdData.FactoryId)
        {
            let factory = Game.getObjectById(IdData.FactoryId) as StructureFactory
            if (!factory) {delete IdData.FactoryId}
            else structures.push(factory)
        }
        if (IdData.center_link)
        {
            let center_link = Game.getObjectById(IdData.center_link) as StructureLink
            if (!center_link) {delete IdData.center_link}
            else structures.push(center_link)
        }
        if (IdData.source_links && IdData.source_links.length > 0)
        {
            for (var s of IdData.source_links)
            {
                let sl = Game.getObjectById(s) as StructureLink
                if (!sl)
                {
                    var index = IdData.source_links.indexOf(s)
                    IdData.source_links.splice(index,1)
                }
                else structures.push(sl)
            }
        }
        if (IdData.comsume_link && IdData.comsume_link.length > 0)
        {
            for (var s of IdData.comsume_link)
            {
                let sl = Game.getObjectById(s) as StructureLink
                if (!sl)
                {
                    var index = IdData.comsume_link.indexOf(s)
                    IdData.comsume_link.splice(index,1)
                }
                else structures.push(sl)
            }
        }
        if (structures.length > 0)
        {
            for (var obj of structures)
            {
                if (obj.ManageMission)
                {
                    obj.ManageMission()
                }
            }
        }
    }

    /* 获取全局建筑对象变量 由于该对象每tick都不一样，所以需要每tick都获取 */
    public GlobalStructure():void{
        // 目前只支持 storage terminal factory powerspawn 
        if (!global.Stru) global.Stru = {}
        if (!global.Stru[this.name]) global.Stru[this.name] = {}

        if (this.memory.StructureIdData.storageID)
        {
            global.Stru[this.name]['storage'] = Game.getObjectById(this.memory.StructureIdData.storageID) as StructureStorage
            if (!global.Stru[this.name]['storage'])
            {
                delete this.memory.StructureIdData.storageID
            }
        }
        if(this.memory.StructureIdData.terminalID)
        {
            global.Stru[this.name]['terminal'] = Game.getObjectById(this.memory.StructureIdData.terminalID) as StructureTerminal
            if (!global.Stru[this.name]['terminal'])
            {
                delete this.memory.StructureIdData.terminalID
            }
        }
        if (this.memory.StructureIdData.PowerSpawnID)
        {
            global.Stru[this.name]['powerspawn'] = Game.getObjectById(this.memory.StructureIdData.PowerSpawnID) as StructurePowerSpawn
            if (!global.Stru[this.name]['powerspawn'])
            {
                delete this.memory.StructureIdData.PowerSpawnID
            }
        }
        if (this.memory.StructureIdData.FactoryId)
        {
            global.Stru[this.name]['factory'] = Game.getObjectById(this.memory.StructureIdData.FactoryId) as StructureFactory
            if (!global.Stru[this.name]['factory'])
            {
                delete this.memory.StructureIdData.FactoryId
            }
        }
        if (this.memory.StructureIdData.NtowerID)
        {
            global.Stru[this.name]['Ntower'] = Game.getObjectById(this.memory.StructureIdData.NtowerID) as StructureTower
            if (!global.Stru[this.name]['Ntower'])
            {
                delete this.memory.StructureIdData.NtowerID
            }
        }
        if (this.memory.StructureIdData.AtowerID && this.memory.StructureIdData.AtowerID.length > 0)
        {
            var otlist = global.Stru[this.name]['Atower'] = [] as StructureTower[]
            for (var ti of this.memory.StructureIdData.OtowerID)
            {
                var ot = Game.getObjectById(ti) as StructureTower
                if (!ot)
                {
                    var index = this.memory.StructureIdData.OtowerID.indexOf(ti)
                    this.memory.StructureIdData.OtowerID.splice(index,1)
                    continue
                }
                otlist.push(ot)
            }
        }
        

    }

    /* 等级信息更新 */
    public LevelMessageUpdate():void{
        if (this.controller.level > this.memory.originLevel)
        this.memory.originLevel = this.controller.level
    }
}