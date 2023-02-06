const fs = require('fs')

const popR = parseFloat(process.argv[3]);
var path = "./"+process.argv[2];
var cityDataFile = fs.readFileSync(path+"-simple-pop.json");
var cityData = JSON.parse(cityDataFile) 
var countMapFile = fs.readFileSync(path+"-simple-countMap.json");
var countMap = JSON.parse(countMapFile) 

const latConstant = 1.0/24;
function computeArea(lat){
	const er = 6371;
	return 3.14159265/180*er*er*Math.abs(Math.sin((lat-latConstant/2)*3.14159265/180)-Math.sin((lat+latConstant/2)*3.14159265/180))*latConstant;
}

var stations = {};
var firstStations = {1159133579:true,1159151575:true};
for (var i=0;i<cityData.features.length;i++){
    if (Math.random() < 0.02 || firstStations[cityData.features[i].properties['ne_id']]){
        cityData.features[i].properties['popRS']=0
        stations[cityData.features[i].properties['ne_id']]=cityData.features[i];
    }
}

console.log(Date.now())
var clearNot = [0,0]
for (var s in stations){
    var pairs = stations[s].properties.pairs;
    var matches = [];
    for (var i=0;i<pairs.length;i++){
        if (stations[pairs[i]]){
            matches.push(pairs[i]);
        }
    }
    if (matches.length == 0){
        //console.log(s);
        clearNot[0]++;
        stations[s].properties.popRS = stations[s].properties.popR;
    }
    else {
        clearNot[1]++;
        var cells = stations[s].properties.cells;
        var pop = 0;
        var area = 0;
        for (var i in cells){
            var d = cells[i];
            var skipIt = false;
            for (var j=0;j<matches.length;j++){
                var dd = stations[matches[j]].properties.cells[i];
                if (dd && dd < d){
                    skipIt = true;
                    break;
                }
            }
            var lat = (parseFloat(i.split(";")[0])+1.0/2)/24
            if (lat < -90 || lat > 90){
			    continue
            }
		    var iArea = computeArea(lat)
            if (!skipIt){  
                dd = 1
				if (d > popR - 2.5){
					dd = ((popR+2.5)-d)/5
                }
				var areaAdd = iArea*dd
                if (countMap[i]){
					popAdd = countMap[i]*dd
					pop += popAdd
					area += areaAdd
                }
				else {
					pop += 0
					area += areaAdd
                }
            }
            else {
                dd = 1
				if (d > popR - 2.5){
					dd = ((popR+2.5)-d)/5
                }
				areaAdd = iArea*dd
                area += areaAdd;
            }
        }
        var popRS = pop/area*popR*popR*3.14159265;
        stations[s].properties.popRS = popRS;
        console.log(matches,s,Math.round(stations[s].properties.popRS/1000),stations[s].properties.popR)
    }
}

console.log(Date.now(),clearNot)