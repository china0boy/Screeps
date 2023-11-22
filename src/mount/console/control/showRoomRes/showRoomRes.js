/**

 特别感谢： @[E29N27|重构咕] CXuesong  提供技术支持

 使用方法：
 require 后，控制台输入：

 usage method:
 After require, the console enters:

 HelperRoomResource.showRoomRes();
 HelperRoomResource.showAllRes();

 2. 显示后 鼠标放在资源上面会显示全部自己房间的资源
 2. All resources will be displayed after the mouse is placed on the room

 3. 点击房间 可以跳转到房间
 3. Click the room to jump to the room

 */

global.RES_COLOR_MAP = { "empty": "rgba(0,0,0,0)", "T": "rgb(112 162 31)", "energy": "rgb(255,242,0)", "battery": "rgb(255,242,0)", "Z": "rgb(247, 212, 146)", "L": "rgb(108, 240, 169)", "U": "rgb(76, 167, 229)", "K": "rgb(218, 107, 245)", "X": "rgb(255, 192, 203)", "G": "rgb(255,255,255)", "zynthium_bar": "rgb(247, 212, 146)", "lemergium_bar": "rgb(108, 240, 169)", "utrium_bar": "rgb(76, 167, 229)", "keanium_bar": "rgb(218, 107, 245)", "purifier": "rgb(255, 192, 203)", "ghodium_melt": "rgb(255,255,255)", "power": "rgb(224,90,90)", "ops": "rgb(224,90,90)", "composite": "#ccc", "crystal": "#ccc", "liquid": "#ccc", "device": "rgb(76, 167,229)", "circuit": "rgb(76, 167,229)", "microchip": "rgb(76, 167,229)", "transistor": "rgb(76, 167,229)", "switch": "rgb(76, 167,229)", "wire": "rgb(76, 167,229)", "silicon": "rgb(76, 167,229)", "machine": "rgb(247,212,146)", "hydraulics": "rgb(247,212,146)", "frame": "rgb(247,212,146)", "fixtures": "rgb(247,212,146)", "tube": "rgb(247,212,146)", "alloy": "rgb(247,212,146)", "metal": "rgb(247,212,146)", "essence": "rgb(218,107,245)", "emanation": "rgb(218,107,245)", "spirit": "rgb(218,107,245)", "extract": "rgb(218,107,245)", "concentrate": "rgb(218,107,245)", "condensate": "rgb(218,107,245)", "mist": "rgb(218,107,245)", "organism": "rgb(108,240,169)", "organoid": "rgb(108,240,169)", "muscle": "rgb(108,240,169)", "tissue": "rgb(108,240,169)", "phlegm": "rgb(108,240,169)", "cell": "rgb(108,240,169)", "biomass": "rgb(108,240,169)", "OH": "#ccc", "ZK": "#ccc", "UL": "#ccc", "UH": "rgb(76, 167,229)", "UH2O": "rgb(76, 167,229)", "XUH2O": "rgb(76, 167,229)", "UO": "rgb(76, 167,229)", "UHO2": "rgb(76, 167,229)", "XUHO2": "rgb(76, 167,229)", "ZH": "rgb(247,212,146)", "ZH2O": "rgb(247,212,146)", "XZH2O": "rgb(247,212,146)", "ZO": "rgb(247,212,146)", "ZHO2": "rgb(247,212,146)", "XZHO2": "rgb(247,212,146)", "KH": "rgb(218,107,245)", "KH2O": "rgb(218,107,245)", "XKH2O": "rgb(218,107,245)", "KO": "rgb(218,107,245)", "KHO2": "rgb(218,107,245)", "XKHO2": "rgb(218,107,245)", "LH": "rgb(108,240,169)", "LH2O": "rgb(108,240,169)", "XLH2O": "rgb(108,240,169)", "LO": "rgb(108,240,169)", "LHO2": "rgb(108,240,169)", "XLHO2": "rgb(108,240,169)", "GH": "rgb(255,255,255)", "GH2O": "rgb(255,255,255)", "XGH2O": "rgb(255,255,255)", "GO": "rgb(255,255,255)", "GHO2": "rgb(255,255,255)", "XGHO2": "rgb(255,255,255)", "H": "#ccc", "O": "#ccc", "oxidant": "#ccc", "reductant": "#ccc" };
global.RES_TREE = { "POWER资源": { "POWER资源": ["power", "ops"] }, "基础资源": { "能量": ["energy", "battery"], "原矿": ["U", "L", "K", "Z", "X", "O", "H", "G"], "压缩": ["utrium_bar", "lemergium_bar", "keanium_bar", "zynthium_bar", "purifier", "oxidant", "reductant", "ghodium_melt"] }, "商品资源": { "无色": ["liquid", "crystal", "composite"], "蓝色": ["silicon", "wire", "switch", "transistor", "microchip", "circuit", "device"], "黄色": ["metal", "alloy", "tube", "fixtures", "frame", "hydraulics", "machine"], "紫色": ["mist", "condensate", "concentrate", "extract", "spirit", "emanation", "essence"], "绿色": ["biomass", "cell", "phlegm", "tissue", "muscle", "organoid", "organism"] }, "LAB资源": { "蓝色": ["UH", "UH2O", "XUH2O", "UO", "UHO2", "XUHO2"], "黄色": ["ZH", "ZH2O", "XZH2O", "ZO", "ZHO2", "XZHO2"], "紫色": ["KH", "KH2O", "XKH2O", "KO", "KHO2", "XKHO2"], "绿色": ["LH", "LH2O", "XLH2O", "LO", "LHO2", "XLHO2"], "白色": ["GH", "GH2O", "XGH2O", "GO", "GHO2", "XGHO2"] }, "empty": { "empty": ["empty"] } };
let base36 = Math.pow(36, 10)
let randomId = () => _.padLeft(Math.ceil(Math.random() * base36).toString(36).toLocaleUpperCase(), 10, "0")

let echarts_str = `
<script>
colorMap = ${JSON.stringify(RES_COLOR_MAP)};
eval($.ajax({url:"https://fastly.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",async:false}).responseText);
function showRoomResEcharts(ori,roomName ,divName){
var bgColor = '#2b2b2b';
var chartDom = document.getElementById(divName);
if(!chartDom)return;
var myChart = echarts.init(chartDom, 'dark');
var option;

colorMap["商品资源"] = "#ccc";
colorMap["LAB资源"] = "#ccc";
colorMap["基础资源"] = "#ccc";
colorMap["压缩"] = "#ccc";
colorMap["原矿"] = "#ccc";

var tree = ${JSON.stringify(RES_TREE)};

function buildTree(node){
    let arr = [];
    if(node[0]){
        for(let resType of node){
            arr.push({
                name: resType,
                value: ori[resType],
                itemStyle: {
                    color: colorMap[resType]
                },
            })
        }
    }else{
        for(let resType in node){
            let children = buildTree(node[resType]);
            if(children.length)
                arr.push({
                    name: resType,
                    itemStyle: {
                        color: colorMap[resType]?colorMap[resType]:children[0].itemStyle.color
                    },
                    children:children
                });
        }
    }
    return arr;
}
var data =buildTree(tree);
option = {
    title: {
        text: roomName
    },
    tooltip: {
    },
    series: {
        itemStyle: {
            borderColor: "#1b1b1b",
            borderWidth: 1
        },
        type: 'sunburst',
        data: data,
        radius: [0, '95%'],
        sort: null,
        emphasis: {
            focus: 'ancestor'
        },
    }
};


option.backgroundColor= bgColor;
myChart.setOption(option);
};
</script>
`.replace(/[\r\n]/g, "");

function UserAllRes(api, username, shardName, mode = 'resAll') {
    return ((mode == 'resRoom' ? echarts_str : "") + `
    <div id='res-GAME_TIME'></div>
    <script>
    
    window.gotoRoom = function(roomName) {
        window.location.hash = '#!/room/' + roomName;
    };
    
    
    function createEchartsTip(divName,roomName,data,funcs_GAME_TIME){
        let divNameShow= divName+"-";
        let func = () => {
            let tip;
            $('.'+divName).mouseenter(function() {
                    if(tip)return;
                    tip = document.createElement("div");
                    tip.style.backgroundColor = "rgba(43,43,43,1)";
                    tip.style.border = "1px solid";
                    tip.style.borderColor = "#ccc";
                    tip.style.borderRadius = "5px";
                    tip.style.position = "absolute";
                    tip.style.zIndex=10;
                    tip.style.color = "#ccc";
                    tip.style.marginLeft = "0px";
                    tip.style.transform = "translateY(-3px)";
                    tip.innerHTML = '<div id="divNameShow" onclick="" style="height: 600px;width:600px;color:#000"/>'
                        .replace("divNameShow",divNameShow);
                    this.append(tip);
                    setTimeout(()=>{
                        showRoomResEcharts(data,roomName,divNameShow);
                        document.getElementById(divNameShow).onclick =function(e) {e.stopPropagation();return false;};
                    },50);
                });
            $('.'+divName).mouseleave( function() {tip && (tip.remove(), tip = undefined);});
        };
        funcs_GAME_TIME.unshift(func);
    }
    
    function roomResTips(rid,roomName,data,funcs_GAME_TIME){
        let divName= "a-"+roomName.replaceAll("/","")+"-6g3y-NB-"+rid;
        createEchartsTip(divName,roomName,data,funcs_GAME_TIME);
        return '<t class="REP_divName" onclick="gotoRoom($REP_roomName$)" style="color:#7c97ff" >[REP_roomName]</t>'
            .replaceAll("$","'")
            .replaceAll("REP_roomName",roomName)
            .replaceAll("REP_divName",divName);
    }
    
    
    let mode = "res-MODE";
    let RES_COLOR_MAP = ${JSON.stringify(RES_COLOR_MAP)};
    function roomResSvg(res, allCnt,len,hiddenDetail){
        let r = Object.entries(res).sort((a,b)=>b[1]-a[1]);
        let left = 0;
        let svgs = r.map(e=>{
            if (e[0] == "empty") return ;
            let t = '<rect x="'+(left/allCnt*len)+'" width="'+(e[1]/allCnt*len)+'" height="8" fill="'+(RES_COLOR_MAP[e[0]])+'"/>';
            left+=e[1];
            return t;
        }).join("");
        let exist = allCnt?'<rect width="500" height="10" fill="black"/>'+svgs+'</svg>':"";
        return '<svg width="'+(len)+'px" height="8px"> '+exist+(!hiddenDetail?(
                ' '+_.padLeft((left/allCnt*100).toFixed(1),4)+'%'
                +(((left/allCnt*100).toFixed(1).length>=5)?"":" ")+
                (allCnt>=500000?(_.padLeft((allCnt/1000000).toFixed(1),4)+'M  '):"")
            ):"");
    }
    
    let apiHost = 'API_HOST';
    let getUserId = function(username) {
        return new Promise(resolve => {
            let url = apiHost + '/api/user/find?username=' + username;
            let token = (localStorage.getItem('auth') || '').replaceAll('"', '');
            $.ajax({
                url: url,
                headers: {
                    'x-token': token,
                    'x-username': token
                },
                success: data => {
                    if (data.ok === 1) {
                        resolve(data.user._id)
                    }
                }
            })
        })
    };
    let getRooms = function(userId, shardName) {
        return new Promise(resolve => {
            let url = apiHost + '/api/user/rooms?reservation&id=' + userId;
            let token = (localStorage.getItem('auth') || '').replaceAll('"', '');
            $.ajax({
                url: url,
                headers: {
                    'x-token': token,
                    'x-username': token
                },
                success: data => {
                    if (data.ok === 1) {
                        if (shardName && shardName != 'undefined') {
                            resolve({
                                [shardName]: data.shards[shardName]
                            });
                        } else {
                            resolve(data.shards);
                        }
                    }
                }
            })
        })
    };
    let getRoomRes = function(roomName, shardName) {
        return new Promise(resolve => {
            let url = apiHost + '/api/game/room-objects?room=' + roomName + '&shard=' + shardName;
            $.ajax({
                url: url,
                headers: {
                },
                success: data => {
                    if (data.ok === 1) {
                        resolve(data.objects.filter(e => e.type == 'storage' || e.type == 'terminal' || e.type == 'factory'))
                    }
                },
                error : function(){
                    
                }
            })
        })
    };
    
    function formatStore(entity){
        let store = {};
        let sum = 0;
        for(let k in entity.store){
            store[k]=entity.store[k];
            sum+=entity.store[k];
        };
        if(entity.storeCapacity-sum>0)
            store['empty']=entity.storeCapacity-sum;
        return store;
    }
    
    let global_index = 0;
    let showDataResRoom = (data,ratio, ratioData)=>{
        let result= "";
        if(ratio>-1){
            result+=roomResSvg({ops:ratio},1,500,true)+" 正在加载 "+ratioData+" <br>";
        };
        
        let funcs_GAME_TIME = [];
        let shardData = _.groupBy(_.keys(data),e=>e.split("/")[0]);
        for(let shard of _.keys(shardData).sort()){
            result+=shard+":<br>";
            result+=shardData[shard].map(name=>{
                let d = data[name];
                let storeAll = _.sum(d.map(e=>_.sum(_.values(e.store))));
                let cap = _.sum(d.map(e=>e.storeCapacity||0));
                let capRatio = cap?storeAll/cap:0;
                let str="";
                let storeMerge = _.reduce(d.map(e=>e.store),(map,data)=>{Object.entries(data).forEach(
                    entry=>map[entry[0]] = (map[entry[0]]||0)+entry[1]);return map},{});
                str+=roomResTips("GAME_TIME",name,formatStore({store:storeMerge,storeCapacity:cap}),funcs_GAME_TIME);
                let len = name.length;
                for(let i=len;i<14;i++)str+=" ";
                let mp = name.replace("/","");
                let tmp = _.find(d,e=>e.type=='storage');
                if(tmp)str+="<t class='"+"GAME_TIME-storage-"+global_index+mp+"'>"+roomResSvg(tmp.store,tmp.storeCapacity,500)+"</t>";
                if(tmp)createEchartsTip("GAME_TIME-storage-"+global_index+mp,name,formatStore(tmp),funcs_GAME_TIME);
                tmp = _.find(d,e=>e.type=='terminal');
                if(tmp)str+="<t class='"+"GAME_TIME-terminal-"+global_index+mp+"'>"+roomResSvg(tmp.store,tmp.storeCapacity,150)+"</t>";
                if(tmp)createEchartsTip("GAME_TIME-terminal-"+global_index+mp,name,formatStore(tmp),funcs_GAME_TIME);
                tmp = _.find(d,e=>e.type=='factory');
                if(tmp)str+="<t class='"+"GAME_TIME-factory-"+global_index+mp+"'>"+roomResSvg(tmp.store,tmp.storeCapacity,25)+"</t>";
                if(tmp)createEchartsTip("GAME_TIME-factory-"+global_index+mp,name,formatStore(tmp),funcs_GAME_TIME);
                str+="<br>";
                return [str,capRatio];
            }).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).join("")
        }
        ++global_index;
        let innerHtmlOld = document.querySelector('#res-GAME_TIME').innerHTML;
        if(!innerHtmlOld||innerHtmlOld.length<result.length)
            document.querySelector('#res-GAME_TIME').innerHTML = result;
        while(funcs_GAME_TIME.length){
            funcs_GAME_TIME.pop()();
        };
    };

    
    let showDataAllRoom = (all, roomResAll,ratio,ratioData) => {
        let base = ['energy', 'U', 'L', 'K', 'Z', 'X', 'O', 'H', 'G', 'T'];
        let power = ['power', 'ops'];
        let bars = ['battery', 'utrium_bar', 'lemergium_bar', 'keanium_bar', 'zynthium_bar', 'purifier', 'oxidant', 'reductant', 'ghodium_melt'];
        let c_grey = ['composite', 'crystal', 'liquid'];
        let c_blue = ['device', 'circuit', 'microchip', 'transistor', 'switch', 'wire', 'silicon'].reverse();
        let c_yellow = ['machine', 'hydraulics', 'frame', 'fixtures', 'tube', 'alloy', 'metal'].reverse();
        let c_pink = ['essence', 'emanation', 'spirit', 'extract', 'concentrate', 'condensate', 'mist'].reverse();
        let c_green = ['organism', 'organoid', 'muscle', 'tissue', 'phlegm', 'cell', 'biomass'].reverse();
        let b_grey = ['OH', 'ZK', 'UL', 'G'];
        let gent = (r) => [r + 'H', r + 'H2O', 'X' + r + 'H2O', r + 'O', r + 'HO2', 'X' + r + 'HO2'];
        let b_blue = gent('U');
        let b_yellow = gent('Z');
        let b_pink = gent('K');
        let b_green = gent('L');
        let b_withe = gent('G');
        let RES_COLOR_MAP = ${JSON.stringify(RES_COLOR_MAP)};
        let formatNumber = function(n) {
            var b = parseInt(n).toString();
            var len = b.length;
            if (len <= 3) {
                return b
            }
            var r = len % 3;
            return r > 0 ? b.slice(0, r) + ',' + b.slice(r, len).match(/\\d{3}/g).join(',') : b.slice(r, len).match(/\\d{3}/g).join(',')
        };
        let str = '';
        if(ratio>-1){
            str+=roomResSvg({ops:ratio},1,500,true)+" 正在加载 "+ratioData+" <br>";
        };
        let id = 0;
        let addList = function(list) {
            let uniqueColor = function(str, resType) {
                if (RES_COLOR_MAP[resType]) str = '<font style="color: ' + RES_COLOR_MAP[resType] + ';">' + str + '</font>';
                return str
            };
            let getAllRoom = function(text, resType) {
                let data = {};
                for (let roomName in roomResAll) {
                    data[roomName] = roomResAll[roomName][resType];
                };
                return '<t class="res-tip" data="' + window.btoa(JSON.stringify(data)) + '" style="position:relative;">' + text + '</t>';
            };
            list.forEach(e => str += getAllRoom(uniqueColor(_.padLeft(e, 15), e), e));
            str += '<br>';
            list.forEach(e => str += uniqueColor(_.padLeft(formatNumber(all[e] || 0), 15), e));
            str += '<br>'
        };
        str += '<br>基础资源:<br>';
        addList(base);
        str += '<br>压缩资源:<br>';
        addList(bars);
        str += '<br>POWER资源:<br>';
        addList(power);
        str += '<br>商品资源:<br>';
        addList(c_grey);
        addList(c_blue);
        addList(c_yellow);
        addList(c_pink);
        addList(c_green);
        str += '<br>LAB资源:<br>';
        addList(b_grey);
        addList(b_blue);
        addList(b_yellow);
        addList(b_pink);
        addList(b_green);
        addList(b_withe);
        let innerHtmlOld = document.querySelector('#res-GAME_TIME').innerHTML;
        if(!innerHtmlOld||innerHtmlOld.length<str.length)
            document.querySelector('#res-GAME_TIME').innerHTML = str;
        $('.res-tip').mouseenter(function() {
            if ($(this).find('.tip-pop').length) return;
            let roomResData = JSON.parse(atob($(this).attr('data')));
            let showCore = '';
            let roomNamePad = Math.max(..._.keys(roomResData).map(e => e.length));
            let sortData  = Object.entries(roomResData).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
            for (let roomName of sortData) {
                if(roomResData[roomName])showCore += '<t onclick="gotoRoom(\\'' + roomName + '\\')"> ' + _.padRight(roomName,roomNamePad) + ':' +_.padLeft(formatNumber(roomResData[roomName]||0),9) + ' </t><br/>'
            }
            let tip = document.createElement('div');
            tip.style.backgroundColor = 'rgba(43,43,43,1)';
            tip.style.border = '1px solid';
            tip.style.borderColor = '#ccc';
            tip.style.borderRadius = '5px';
            tip.style.position = 'absolute';
            tip.style.zIndex = 10;
            tip.style.color = '#ccc';
            tip.style.left = '0';
            tip.style.transform = 'translateY(-3px)';
            tip.width = '230px';
            tip.className = 'tip-pop';
            tip.innerHTML = showCore;
            this.append(tip);
        });
        $('.res-tip').mouseleave(function() {
            $(this).find('.tip-pop').detach();
        });
    };
    
    let getAllRes = function(userName, shardName) {
        return new Promise(async resolve => {
            let userId = await getUserId(userName);
            let shardRooms = await getRooms(userId, shardName);
            let all = {};
            let roomResAll = {};
            let visRoom = {};
            for (let shard of _.keys(shardRooms)) {
                for (let roomName of shardRooms[shard]) {
                    visRoom[shard + '/' + roomName] = false;
                }
            }
            let keys = Object.keys(visRoom);
            let i = 0;
            let cnt = 0;
            let resRoomData = {};
            let run = () => {
                new Promise(async resolve => {
                    const shard=keys[i].split('/')[0];
                    const roomName=keys[i].split('/')[1];
                    ++i;
                    
                    let storeObjects = await getRoomRes(roomName, shard);
                    let store = {};
                    storeObjects.forEach(e => _.keys(e.store).forEach(res => store[res] = (store[res] || 0) + (e.store[res] || 0)));
                    _.keys(store).forEach(res => all[res] = (all[res] || 0) + (store[res] || 0));
                    
                    resRoomData[shard + '/' + roomName]= storeObjects;
                    roomResAll[shard + '/' + roomName] = store;
                    visRoom[shard + '/' + roomName] = true;
                    ++cnt;
                    resolve();
                }).then(() => {
                    if (cnt < keys.length){
                        if(mode=='resAll')showDataAllRoom(all, roomResAll,cnt / keys.length,keys[cnt]);
                        if(mode=='resRoom')showDataResRoom(resRoomData,cnt / keys.length,keys[cnt]);
                        if (i < keys.length)run();
                    } 
                    else if(_.every(Object.values(visRoom))){
                        if(mode=='resAll')showDataAllRoom(all, roomResAll);
                        if(mode=='resRoom')showDataResRoom(resRoomData);
                        resolve();
                    }
                })
            };
            for (let excuteCount = 0; excuteCount < Math.min(8,keys.length); excuteCount++) {
                run();
            }
        });
    };
    getAllRes('USERNAME', 'SHARD_NAME').then(()=>{});
    </script>
    `).replace(/GAME_TIME/g, "A" + randomId())
        .replace(/API_HOST/g, api)
        .replace(/USERNAME/g, username)
        .replace(/res-MODE/g, mode)
        .replace(/SHARD_NAME/g, shardName)
        .replace(/[\r\n]/g, "");
}



//alert(window.location.href.substr(0,window.location.href.lastIndexOf("/")+1)+roomName);
let pro = {
    whoAmI() {
        let myRoom = _.values(Game.rooms).find(e => e.my);
        if (myRoom) return myRoom.controller.owner.username;
        return _.values(Game.constructionSites)[0].owner.username;
    },
    showAllRes(username, shardName) {
        if (!username) username = pro.whoAmI();
        return pro.showUserAllRes(username, shardName, "resAll");
    },
    showRoomRes(username, shardName) {
        if (!username) username = pro.whoAmI();
        return pro.showUserAllRes(username, shardName, "resRoom");
    },
    showUserAllRes(username, shardName, mode) {
        let api = "https://screeps.com";
        if (shardName == 'shardSeason' || (!shardName && Game.shard.name == 'shardSeason')) api += "/season";
        console.log(UserAllRes(api, username, shardName || '', mode));
    }
}

global.HelperRoomResource = pro