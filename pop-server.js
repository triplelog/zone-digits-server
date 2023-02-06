const fs = require('fs')
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3245",
      methods: ["GET", "POST"]
    }
});


const popR = 50
const path = "./"+"cities";
//const popR = parseFloat(process.argv[3]);
//var path = "./"+process.argv[2];
var cityDataFile = fs.readFileSync(path+"-simple-pop.json");
var cityData = JSON.parse(cityDataFile) 
var countMapFile = fs.readFileSync(path+"-simple-countMap.json");
var countMap = JSON.parse(countMapFile) 

const latConstant = 1.0/24;
function computeArea(lat){
	const er = 6371;
	return 3.14159265/180*er*er*Math.abs(Math.sin((lat-latConstant/2)*3.14159265/180)-Math.sin((lat+latConstant/2)*3.14159265/180))*latConstant;
}




var firstStations = {1159133579:true,1159151575:true};


function addPops(firstStations){
    var stations = {};
    for (var i=0;i<cityData.features.length;i++){
        if (firstStations[cityData.features[i].properties['ne_id']]){
            cityData.features[i].properties['popRS']=0
            stations[cityData.features[i].properties['ne_id']]=cityData.features[i];
        }
    }


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
            stations[s].properties.popRS = Math.round(popRS/1000);
        }
    }
    for (var i in firstStations){
        firstStations[i] = stations[i].properties.popRS;
    }
    return firstStations;
}



io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('pops', (msg) => {
        var allPops = {};
        for (var i=0;i<msg.length;i++){
            var pops = addPops(msg[i]);
            for (var j in pops){
                allPops[j]=pops[j];
            }
        }
        
        socket.emit('pops',allPops);
    });
});

server.listen(3246, () => {
    console.log('listening on *:3246');
});