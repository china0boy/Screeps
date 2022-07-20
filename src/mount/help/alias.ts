import { Colorful, colorful, createRoomLink, createConst, createLink } from '../../utils'
import { createHelp } from './help'

/**
 * 全局拓展的别名
 * 使用别名来方便在控制台执行方法
 * 
 * @property {string} alias 别名
 * @property {function} exec 执行别名时触发的操作
 */
export default [
    // 常用的资源常量
    {
        alias: 'res',
        exec: function (): string {
            return resourcesHelp
        }
    },
    {
        alias: 'help',
        exec: function (): string {
            return [
                ...projectTitle.map(line => colorful(line, 'blue', true)),
                `\n    ${colorful('Do ♂ you ♂ like ♂ play ♂ a ♂ game ♂', 'yellow', true)}`,


                createHelp(
                    {
                        name: '全局指令',
                        describe: '直接输入就可以执行,不需要加 ()',
                        api: [
                            {
                                title: '查看资源常量',
                                commandType: true,
                                functionName: 'res'
                            }
                        ]
                    },
                    {
                        name: '房间指令',
                        describe: '关于房间的增加删除。',
                        api: [
                            {
                                title: '扩张新房间时必许输入的指令:',
                                describe: '使房间开始运行',
                                params: [
                                    { name: 'roomName', desc: '要增加的我的房间' },
                                    { name: 'plan', desc: '布局类型 man(手动布局) hoho(hoho大佬的布局) dev(dev的布局)' },
                                    { name: 'x', desc: '中心点x' },
                                    { name: 'y', desc: '中心点y' },
                                ],
                                functionName: 'frame.add'
                            },
                            {
                                title: '在房间列表中删除房间:',
                                describe: '使房间不在运行',
                                params: [
                                    { name: 'roomName', desc: '要删除的我的房间' },
                                ],
                                functionName: 'frame.remove'
                            },
                            {
                                title: '在内存删除建筑:',
                                describe: '不用此方法删还会自动修复',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'x', desc: '删除建筑的x坐标' },
                                    { name: 'y', desc: '删除建筑的y坐标' },
                                    { name: 'type', desc: '删除建筑类型' },
                                ],
                                functionName: 'frame.del'
                            },
                            {
                                title: '经济模式:',
                                describe: '8级房升级工控制',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                ],
                                functionName: 'frame.economy'
                            },
                            {
                                title: '修改房间运营爬的数量:',
                                describe: '爬的类型: harvest carry upgrade build  transport repair',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'type', desc: '爬的类型' },
                                    { name: 'num', desc: '爬的个数' },
                                ],
                                functionName: 'spawn.num'
                            },
                            {
                                title: '修改某任务爬虫的数量:',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'id', desc: '任务的id' },
                                    { name: 'role', desc: '爬的身份' },
                                    { name: 'num', desc: '爬的个数' },
                                ],
                                functionName: 'spawn.Mnum'
                            },
                            {
                                title: '定时孵化任务孵化配置一键还原:',
                                describe: '修改定时信息,立刻重新孵化;例:spawn.restart("W1N1","C-85ednh1ib439985674")',
                                params: [
                                    { name: 'roomName', desc: '房间名' },
                                    { name: 'id', desc: '任务id' },
                                ],
                                functionName: 'spawn.restart'
                            },
                            {
                                title: '注册消费link:',
                                describe: '该link会一直由其他link传入能量',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'id', desc: 'link的id' },
                                ],
                                functionName: 'link.comsume'
                            },
                            {
                                title: '删除具体任务:',
                                describe: '例:Game.rooms["xxxx"].DeleteMission("C-85ednh1ib439985674")',
                                params: [
                                    { name: 'missionID', desc: '任务Id' },
                                ],
                                functionName: 'Game.rooms["xxxx"].DeleteMission'
                            },
                        ]
                    },
                    {
                        name: '爬任务',
                        describe: '所有的关于发布爬的指令。',
                        api: [
                            {
                                title: '墙体维护:',
                                describe: '例: repair.set("W1N1","global",1,"XLH2O")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'rtype', desc: 'global(维修最低血量墙) special(维修棋子下的墙---没写完)' },
                                    { name: 'num', desc: '爬的个数 (默认1)' },
                                    { name: 'boost', desc: '要boost work的化合物  (默认没有)' },
                                ],
                                functionName: 'repair.set'
                            },
                            {
                                title: '墙体维护删除:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'rtype', desc: 'global(维修最低血量墙) special(维修棋子下的墙---没写完)' },
                                ],
                                functionName: 'repair.remove'
                            },
                            {
                                title: 'C计划:',
                                describe: '去目标房间占领并开启安全模式修墙',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'Cnum', desc: '紫爬个数 (默认1)' },
                                    { name: 'Unum', desc: '黄爬个数 (默认2)' },
                                    { name: 'shard', desc: 'shardname (默认自己shard)' },
                                ],
                                functionName: 'plan.C'
                            },
                            {
                                title: '取消C计划:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                ],
                                functionName: 'plan.CC'
                            },
                            {
                                title: '扩张援建:',
                                describe: '占领房间并升级  expand.set("W1N1","W2N2",2,1,1000,false,"shard3")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'num', desc: '升级爬和建造爬的个数 (默认1)' },
                                    { name: 'Cnum', desc: '紫爬个数 (默认1)' },
                                    { name: 'interval', desc: '出兵间隔时间 (默认1000)' },
                                    { name: 'defend', desc: '是否需要一定防御能力 (默认没有)' },
                                    { name: 'shard', desc: '目标房间shard (默认此shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'expand.set'
                            },
                            {
                                title: '取消扩张援建:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'shard', desc: '目标房间shard' },
                                ],
                                functionName: 'expand.remove'
                            },
                            {
                                title: '四人小队(蓝旗集结  攻击"squad_attack"名字的旗子):',
                                describe: '例: war.squad("W1N1","W1N2","A")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '要攻击的目标房间' },
                                    { name: 'mtype', desc: '小队类型 R:蓝绿 A:红绿 D:黄绿 Aio:一体机 RA:蓝红绿 DA:黄红绿 DR:蓝黄绿' },
                                    { name: 'interval', desc: '出兵间隔时间 (默认1000)' },
                                    { name: 'shard', desc: 'shard (默认此shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'war.squad'
                            },
                            {
                                title: '取消四人小队:',
                                describe: '例: war.Csquad("W1N1","W1N2","A")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '要攻击的目标房间' },
                                    { name: 'mtype', desc: '小队类型 R:蓝绿 A:红绿 D:黄绿 Aio:一体机 RA:蓝红绿 DA:黄红绿 DR:蓝黄绿' },
                                    { name: 'shard', desc: 'shard (默认此shard)' },
                                ],
                                functionName: 'war.Csquad'
                            },
                            {
                                title: '一体机(需要t3 XKHO2 XGHO2 XLHO2 XZHO2):',
                                describe: '出动一体机攻击 例:war.disaio("W1N1","Flag1",1,2,"1000","shard3")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'FlagName', desc: '目标旗子房间 优先攻击旗子下建筑' },
                                    { name: 'num', desc: '一体机个数 (默认1)' },
                                    { name: 'level', desc: 'heal等级  1:能抗4塔满伤 2:能抗6塔满伤 (默认2)' },
                                    { name: 'interval', desc: '出兵间隔时间 (默认1000)' },
                                    { name: 'shard', desc: 'shard (默认此shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'war.disaio'
                            },
                            {
                                title: '删除一体机任务',
                                describe: '例:war.Cdisaio("W1N1","Flag1")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'FlagName', desc: '目标旗子房间' },
                                ],
                                functionName: 'war.Cdisaio'
                            },
                            {
                                title: '双人小队(XUH2O XGHO2 XLHO2 XZHO2 XZH2O):',
                                describe: '出动双人小队攻击 例:war.double("W1N1","Flag1", "attack", 1, 1000, "shard3")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'FlagName', desc: '目标旗子房间 优先攻击旗子下建筑' },
                                    { name: 'type', desc: '攻击爬类型 attack work (默认attack)' },
                                    { name: 'num', desc: '双人小对数 (默认1)' },
                                    { name: 'interval', desc: '出兵间隔时间 (默认1000)' },
                                    { name: 'shard', desc: 'shard (默认此shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'war.double'
                            },
                            {
                                title: '删除双人攻击任务',
                                describe: '例:war.Cdouble("W1N1","Flag1")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'FlagName', desc: '目标旗子房间' },
                                ],
                                functionName: 'war.Cdouble'
                            },
                            {
                                title: '黄球拆迁:',
                                describe: '黄灰旗拆墙 例:war.dismantle("W1N1","W1N2",1,true,1000,"shard3")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'num', desc: '拆迁对数 (默认1)' },
                                    { name: 'boost', desc: '是否boost (默认不boost)' },
                                    { name: 'interval', desc: '出兵间隔时间 (默认1000)' },
                                    { name: 'shard', desc: 'shard (默认此shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'war.dismantle'
                            },
                            {
                                title: '取消黄球拆迁:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                ],
                                functionName: 'war.Cdismantle'
                            },
                            {
                                title: '紧急支援:',
                                describe: '支援友军房间 例: war.support("W1N1","W1N2","double")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'shard', desc: '目标房间所在shard' },
                                    { name: 'num', desc: '队数' },
                                    { name: 'sType', desc: '小队类型 double:双人小队' },
                                    { name: 'interval', desc: '出兵间隔时间 (number)' },
                                    { name: 'boost', desc: '是否boost 默认true' },
                                ],
                                functionName: 'war.support'
                            },
                            {
                                title: '取消紧急支援:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'shard', desc: '目标房间所在shard (shardName)' },
                                    { name: 'sType', desc: '小队类型 double:双人小队' },
                                ],
                                functionName: 'war.Csupport'
                            },
                            {
                                title: '控制器攻击:',
                                describe: '一直攻击控制器 例: war.control("W1N1","W1N2",1,800)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'body', desc: '1 为大球攻击 2为小球预订 (默认1)' },
                                    { name: 'interval', desc: '出生间隔 (默认800)' },
                                    { name: 'shard', desc: 'shardname (默认同一shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'war.control'
                            },
                            {
                                title: '取消控制器攻击:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'shard', desc: 'shardname (默认同一shard)' },
                                ],
                                functionName: 'war.Ccontrol'
                            },
                            {
                                title: '紧急援建:',
                                describe: '例: support.build("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'num', desc: '爬的数量 (默认2)' },
                                    { name: 'interval', desc: '出生间隔 (默认1000)' },
                                    { name: 'shard', desc: 'shardname (默认同一shard)' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'support.build'
                            },
                            {
                                title: '取消紧急援建:',
                                describe: '例: support.Cbuild("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'shard', desc: 'shardname (默认同一shard)' },
                                ],
                                functionName: 'support.Cbuild'
                            },
                            {
                                title: '普通冲级:',
                                describe: '例: upgrade.normal("W1N1",2,"GH2O")',
                                params: [
                                    { name: 'roomName', desc: '房间名' },
                                    { name: 'num', desc: '冲级爬数量' },
                                    { name: 'boost', desc: 'boost类型 null | GH | GH2O | XGH2O' },
                                ],
                                functionName: 'upgrade.normal'
                            },
                            {
                                title: '取消普通冲级:',
                                describe: '例: upgrade.Cnormal("W1N1")',
                                params: [
                                    { name: 'roomName', desc: '房间名' },
                                ],
                                functionName: 'upgrade.Cnormal'
                            },
                            {
                                title: '急速冲级:',
                                describe: '要保持终端在控制器旁边 例: upgrade.quick("W1N1",8,"XGH2O")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'num', desc: '冲级爬的数量' },
                                    { name: 'boostType', desc: 'boost的化合物 (默认不boost)' },
                                ],
                                functionName: 'upgrade.quick'
                            },
                            {
                                title: '取消急速冲级:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                ],
                                functionName: 'upgrade.Cquick'
                            },
                            {
                                title: '修改急速冲级:',
                                describe: '修改冲级的爬的数量 例: upgrade.Nquick("W1N1",8)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'num', desc: '冲级爬的数量' },
                                ],
                                functionName: 'upgrade.Nquick'
                            },
                            {
                                title: '搬运任务:',
                                describe: '把资源从一个建筑搬到另一个建筑 例: carry.special("W1S1","G",new RoomPosition(24,24,"W1S2"),new RoomPosition(23,23,"W1S1"),5,10000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'sP', desc: '要拿的建筑的位置对象' },
                                    { name: 'dp', desc: '要放的建筑的位置对象' },
                                    { name: 'CreepNum', desc: '搬运爬的个数 (默认1)' },
                                    { name: 'ResNum', desc: '要搬的资源数量 (默认搬所有)' },
                                ],
                                functionName: 'carry.special'
                            },
                            {
                                title: '取消搬运任务:',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                ],
                                functionName: 'carry.Cspecial'
                            },
                            {
                                title: '掠夺者:',
                                describe: '掠夺旗子房间内所有建筑的可用资源 例: loot.loot("W1N1","Flag","",1)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'sourceFlagName', desc: '要掠夺的旗子名称' },
                                    { name: 'targetStructureId', desc: '要放入我的容器Id' },
                                    { name: 'num', desc: '爬的个数 (默认1)' },
                                ],
                                functionName: 'loot.loot'
                            },
                            {
                                title: '取消掠夺者:',
                                describe: '例: loot.Cloot("W1N1","Flag")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'sourceFlagName', desc: '要掠夺的旗子名称' },
                                ],
                                functionName: 'loot.Cloot'
                            },
                            {
                                title: '跨shard运输:',
                                describe: '例: loot.carryShard("W1N1","Flag1","Flag2",1,0,"energy",10000,1500,"shard3","shard2")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'naFlagName', desc: '拿资源房间的旗子名字' },
                                    { name: 'toFlagName', desc: '放资源房间的旗子名字' },
                                    { name: 'cnum', desc: '爬的数量' },
                                    { name: 'level', desc: '0无强化 1强化 2有防御强化 3双人小队' },
                                    { name: 'rtype', desc: '运输的资源类型' },
                                    { name: 'rnum', desc: '资源数量' },
                                    { name: 'interval', desc: '孵化间隔时间' },
                                    { name: 'nashardName', desc: '拿资源的shard' },
                                    { name: 'toshardName', desc: '放资源的shard' },
                                    { name: 'shardData', desc: '多次跨shard参数 (默认没有)' },
                                ],
                                functionName: 'loot.carryShard'
                            }, {
                                title: '取消跨shard运输:',
                                describe: '例: loot.CcarryShard("W1N1","Flag1","Flag1")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'naFlagName', desc: '拿资源房间的旗子名字' },
                                    { name: 'toFlagName', desc: '放资源房间的旗子名字' },
                                ],
                                functionName: 'loot.CcarryShard'
                            }
                        ]
                    },
                    {
                        name: '建筑指令',
                        describe: '关于市场',
                        api: [
                            {
                                title: '资源转移:【推荐】',
                                describe: '例:ter.send("W1N1","W1N2","energy",20000)',
                                params: [
                                    { name: 'roomName', desc: '源房间' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'rType(可选)', desc: '资源类型【不选表示除energy和ops外所有资源】' },
                                    { name: 'num(可选)', desc: '资源数量【不限制数量】，不选表示全部数量' },
                                ],
                                functionName: 'ter.send'
                            },
                            {
                                title: '取消资源转移:',
                                describe: '例:ter.Csend("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '源房间' },
                                    { name: 'disRoom', desc: '目标房间' },
                                ],
                                functionName: 'ter.Csend'
                            },
                            {
                                title: '资源转移信息查询:',
                                describe: '例:ter.show()',
                                functionName: 'ter.show'
                            },
                            {
                                title: '发送资源:',
                                describe: '例: terminal.send("W1N1","W1N2","energy",100000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'disRoom', desc: '目的房间' },
                                    { name: 'rType', desc: '资源类型' },
                                    { name: 'amount', desc: '资源数量(路费加资源数量不能超30W)' },
                                ],
                                functionName: 'terminal.send'
                            },
                            {
                                title: '创建订单:',
                                describe: '例: market.buy("W1N1","energy",1,100000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'price', desc: '单价' },
                                    { name: 'amount', desc: '资源数量' },
                                ],
                                functionName: 'market.buy'
                            },
                            {
                                title: '买资源:',
                                describe: '例: debug.ResourceBuy("W1N1","sell","battery",10000,1,25,99999)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'type', desc: '购买方式 "deal" | "sell"' },
                                    { name: 'rType', desc: ' 资源类型 ' },
                                    { name: 'num', desc: '资源数量' },
                                    { name: 'range', desc: '动态范围' },
                                    { name: 'max', desc: '最大价格' },
                                    { name: 'time', desc: '超时时间' },
                                ],
                                functionName: 'debug.ResourceBuy'
                            },
                            {
                                title: '卖资源:',
                                describe: '例: market.sell("W1N1","energy","deal",100000,1,20000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'mType', desc: ' deal|order ' },
                                    { name: 'num', desc: '资源数量' },
                                    { name: 'price', desc: '单价' },
                                    { name: 'unit', desc: '在终端里放入的数量' },
                                ],
                                functionName: 'market.sell'
                            },
                            {
                                title: '取消卖资源:',
                                describe: '例: market.cancel("W1N1","deal","energy")',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'mtype', desc: '"order" | "deal"' },
                                    { name: 'rType', desc: '资源类型' },
                                ],
                                functionName: 'market.cancel'
                            },
                            {
                                title: '购买资源:',
                                describe: '例: market.deal("W1N1","123456789",1000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间名' },
                                    { name: 'id', desc: '订单id' },
                                    { name: 'amount', desc: '资源数量' },
                                ],
                                functionName: 'market.deal'
                            },
                            {
                                title: '查询订单:',
                                describe: '例: market.look("enetgy","buy")',
                                params: [
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'marType', desc: '订单类型 "buy" 或者 "sell" ' },
                                ],
                                functionName: 'market.look'
                            },
                            {
                                title: '化合物合成:',
                                describe: '例: lab.compound("W1N1","OH",1000)',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'num', desc: '资源数量' },
                                ],
                                functionName: 'lab.compound'
                            },
                            {
                                title: '多级化合物合成:',
                                describe: '例: lab.dispatch("W1N1","OH",1000) (用不了，不知道为什么，太辣鸡了)',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'type', desc: '资源类型' },
                                    { name: 'num', desc: '资源数量' },
                                ],
                                functionName: 'lab.dispatch'
                            },
                            {
                                title: '核弹填充:',
                                describe: '例: nuke.add("W1N1")',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                ],
                                functionName: 'nuke.add'
                            },
                            {
                                title: '取消核弹填充:',
                                describe: '例: nuke.remove("W1N1")',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                ],
                                functionName: 'nuke.remove'
                            },
                            {
                                title: '发射核弹:',
                                describe: '例: nuke.launch("W1N1","W1N2",1,1)',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'disRoom', desc: '目标房间' },
                                    { name: 'x', desc: '目标房间的x' },
                                    { name: 'y', desc: '目标房间的y' },
                                ],
                                functionName: 'nuke.launch'
                            },
                        ]
                    },

                    {
                        name: '外矿指令',
                        describe: '关于外矿',
                        api: [
                            {
                                title: '发布外矿任务:',
                                describe: '例: mine.harvest("W1N1",1,1,"W1N2")',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'x', desc: '我的房间外矿起始造路x' },
                                    { name: 'y', desc: '我的房间外矿起始造路y' },
                                    { name: 'disRoom', desc: '目的房间' },
                                ],
                                functionName: 'mine.harvest'
                            },
                            {
                                title: '删除外矿任务:',
                                describe: '例: mine.Charvest("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '我的房间' },
                                    { name: 'disRoom', desc: '目的房间' },
                                ],
                                functionName: 'mine.Charvest'
                            },
                            {
                                title: '更新road:',
                                describe: '例: mine.road("W1N1")',
                                params: [
                                    { name: 'roomName', desc: '目标房间' },
                                ],
                                functionName: 'mine.road'
                            },
                        ]
                    },
                    {
                        name: '白名单和查看资源',
                        describe: '关于白名单和资源',
                        api: [
                            {
                                title: '添加绕过房间列表:',
                                describe: '例: bypass.add("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '绕过的房间列表' },
                                ],
                                functionName: 'bypass.add'
                            },
                            {
                                title: '查看绕过房间:',
                                describe: '例: bypass.show()',
                                functionName: 'bypass.show'
                            },
                            {
                                title: '清空绕过房间:',
                                describe: '例: bypass.clean()',
                                functionName: 'bypass.clean'
                            },
                            {
                                title: '移除绕过房间:',
                                describe: '例: bypass.remove("W1N1","W1N2")',
                                params: [
                                    { name: 'roomName', desc: '移除的房间列表' },
                                ],
                                functionName: 'bypass.remove'
                            },
                            {
                                title: '添加白名单:',
                                describe: '例: whitesheet.add("")',
                                params: [
                                    { name: 'username', desc: '添加的用户名' },
                                ],
                                functionName: 'whitesheet.add'
                            },
                            {
                                title: '查看白名单:',
                                describe: '例: whitesheet.show()',
                                functionName: 'whitesheet.show'
                            },
                            {
                                title: '清空白名单:',
                                describe: '例: whitesheet.clean()',
                                functionName: 'whitesheet.clean'
                            },
                            {
                                title: '移除白名单:',
                                describe: '例: whitesheet.remove("")',
                                params: [
                                    { name: 'username', desc: '移除的用户名' },
                                ],
                                functionName: 'whitesheet.remove'
                            },
                            {
                                title: '全局资源统计:',
                                functionName: 'resource.all'
                            },
                            {
                                title: '特定房间统计:',
                                params: [
                                    { name: 'name', desc: '我的房间名' },
                                ],
                                functionName: 'resource.room'
                            },
                            {
                                title: '全局容量信息统计:',
                                functionName: 'store.all'
                            },
                            {
                                title: '特定房间容量信息统计:',
                                params: [
                                    { name: 'name', desc: '我的房间名' },
                                ],
                                functionName: 'store.room'
                            },
                            {
                                title: '忽略任务输出:',
                                params: [
                                    { name: 'name', desc: '任务名字' },
                                ],
                                functionName: 'MissionVisual.add'
                            },
                            {
                                title: '删除忽略任务输出:',
                                params: [
                                    { name: 'name', desc: '任务名字' },
                                ],
                                functionName: 'MissionVisual.remove'
                            },
                            {
                                title: '设置全局房间可视化面板画质:',
                                params: [
                                    { name: 'level', desc: '画质 low/medium/high/blank' },
                                ],
                                functionName: 'panel.level'
                            },
                            {
                                title: '开/关具体房间的可视化面板:',
                                params: [
                                    { name: 'name', desc: '房间' },
                                ],
                                functionName: 'panel.switch'
                            },
                        ]
                    },

                )
            ].join('\n')
        }
    },
    {
        alias: 'help.',
        exec: function (): string {
            return resourcesHelp
        }
    },
    // 统计当前所有房间的存储状态
    {
        alias: 'storage',
        exec: function (): string {
            // 建筑容量在小于如下值时将会变色
            const colorLevel = {
                [STRUCTURE_TERMINAL]: { warning: 60000, danger: 30000 },
                [STRUCTURE_STORAGE]: { warning: 150000, danger: 50000 }
            }

            /**
             * 给数值添加颜色
             * 
             * @param capacity 要添加颜色的容量数值
             * @param warningLimit 报警的颜色等级
             */
            const addColor = (capacity: number, structureType: STRUCTURE_TERMINAL | STRUCTURE_STORAGE): string => {
                if (!capacity) return colorful('无法访问', 'red')
                return capacity > colorLevel[structureType].warning ? colorful(capacity.toString(), 'green') :
                    capacity > colorLevel[structureType].danger ? colorful(capacity.toString(), 'yellow') : colorful(capacity.toString(), 'red')
            }

            const logs = [
                `剩余容量/总容量 [storage 报警限制] ${colorful(colorLevel[STRUCTURE_STORAGE].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_STORAGE].danger.toString(), 'red')} [terminal 报警限制] ${colorful(colorLevel[STRUCTURE_TERMINAL].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_TERMINAL].danger.toString(), 'red')}`,
                '',
                ...Object.values(Game.rooms).map(room => {
                    // 如果两者都没有或者房间无法被控制就不显示
                    if ((!room.storage && !room.terminal) || !room.controller.my) return false

                    let log = `[${room.name}] `
                    if (room.storage) log += `STORAGE: ${addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE)}/${room.storage.store.getCapacity() || '无法访问'} `
                    else log += 'STORAGE: X '

                    if (room.terminal) log += `TERMINAL: ${addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL)}/${room.terminal.store.getCapacity() || '无法访问'} `
                    else log += 'TERMINAL: X '

                    return log
                }).filter(log => log)
            ]

            return logs.join('\n')
        }
    },
    {
        alias: 'helpFlag',
        exec: function (): string {
            return [
                `\n    ${colorful('superbitch bot', 'yellow', true)}`,
                '这里列出一些可能用到的旗帜及其作用 统一规定xx为任何字符串 [xx]为房间名',
                '旗帜名: [xx]/repair 房间内所有防御塔参与维修',
                '旗帜名: [xx]/stop 房间内所有防御塔停止攻击',
                '旗帜名: dismantle_xx 大黄拆迁指定旗帜下建筑',
                '旗帜名: squad_attack_xx 四人小队攻击指定旗帜下建筑',
                '旗帜名: support_double_xx 紧急支援双人小队拆迁指定旗帜下建筑',
                '旗帜名: reapair_xx special维修爬维修指定旗帜下墙体',
                '旗帜名: withdraw_xx紧急援助爬从该旗帜下的建筑提取能量',
                '旗帜名: [紧急援助爬所属房间]/HB/harvest 紧急援助爬从该旗帜下的房间的矿点采集能量',
                '旗帜名: LayoutVisual 插在任意房间可以显示dev自动布局',
                '旗帜名: TowerVisualAttack 插在距离自己8级房最近房间或有视野房间 显示该房间防御塔伤害信息',
                '旗帜名: TowerVisualHeal 插在距离自己8级房最近房间或有视野房间 显示该房间防御塔治疗信息',
                '旗帜名: TowerVisualRepair 插在距离自己8级房最近房间或有视野房间 显示该房间防御塔维修信息',
            ].join('\n')
        }
    },
]

/**
 * 帮助文档中的标题
 */
const projectTitle = [
    String.raw`    ⠄⠄⠄⠄⠄⠄⢠⣿⣋⣿⣿⣉⣿⣿⣯⣧⡰⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⣿⣿⣹⣿⣿⣏⣿⣿⡗⣿⣿⠁⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠟⡛⣉⣭⣭⣭⠌⠛⡻⢿⣿⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⠄⣤⡌⣿⣷⣯⣭⣿⡆⣈⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⢻⣿⣿⣿⣿⣿⣿⣿⣷⢛⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⣛⣻⣿⠟⣀⡜⣻⢿⣿⣿⣶⣤⡀⠄⠄⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⠄⢠⣤⣀⣨⣥⣾⢟⣧⣿⠸⣿⣿⣿⣿⣿⣤⡀⠄⠄⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⠄⢟⣫⣯⡻⣋⣵⣟⡼⣛⠴⣫⣭⣽⣿⣷⣭⡻⣦⡀⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⢰⣿⣿⣿⢏⣽⣿⢋⣾⡟⢺⣿⣿⣿⣿⣿⣿⣷⢹⣷⠄`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⣿⣿⣿⢣⣿⣿⣿⢸⣿⡇⣾⣿⠏⠉⣿⣿⣿⡇⣿⣿⡆`,
    String.raw`    ⠄⠄⠄⠄⠄⠄⠄⣿⣿⣿⢸⣿⣿⣿⠸⣿⡇⣿⣿⡆⣼⣿⣿⣿⡇⣿⣿⡇`,
    String.raw`    ⠇⢀⠄⠄⠄⠄⠄⠘⣿⣿⡘⣿⣿⣷⢀⣿⣷⣿⣿⡿⠿⢿⣿⣿⡇⣩⣿⡇`,
    String.raw`    ⣿⣿⠃⠄⠄⠄⠄⠄⠄⢻⣷⠙⠛⠋⣿⣿⣿⣿⣿⣷⣶⣿⣿⣿⡇⣿⣿⡇`,
    String.raw`    ⣿⣿⣿⣿⣿⣿⣿需要♂ 什么♂ 帮助♂  ⣿⣿⣿⣿⣿⣿⣿`,
]

// 资源常量控制台帮助
const resourcesHelp: string = `
${createConst('O', 'RESOURCE_OXYGEN')}              ${createConst('H', 'RESOURCE_HYDROGEN')}         ${createConst('U', 'RESOURCE_UTRIUM')}             ${createConst('X', 'RESOURCE_CATALYST')}
${createConst('压缩O', 'RESOURCE_OXIDANT')}         ${createConst('压缩H', 'RESOURCE_REDUCTANT')}     ${createConst('压缩U', 'RESOURCE_UTRIUM_BAR')}     ${createConst('压缩X', 'RESOURCE_PURIFIER')}
${createConst('L', 'RESOURCE_LEMERGIUM')}           ${createConst('K', 'RESOURCE_KEANIUM')}          ${createConst('Z', 'RESOURCE_ZYNTHIUM')}           ${createConst('G', 'RESOURCE_GHODIUM')} 
${createConst('压缩L', 'RESOURCE_LEMERGIUM_BAR')}   ${createConst('压缩K', 'RESOURCE_KEANIUM_BAR')}   ${createConst('压缩Z', 'RESOURCE_ZYNTHIUM_BAR')}   ${createConst('压缩G', 'RESOURCE_GHODIUM_MELT')}

${createConst('TOUGH强化', 'RESOURCE_CATALYZED_GHODIUM_ALKALIDE')}   ${createConst('RANGE_ATTACK强化', 'RESOURCE_CATALYZED_KEANIUM_ALKALIDE')}
${createConst('MOVE强化', 'RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE')}   ${createConst('HEAL强化', 'RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE')}
`
