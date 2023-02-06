const fs = require('fs');
const express = require('express');
const haversine = require('haversine');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3247",
      methods: ["GET", "POST"]
    }
});


//read from cities-simple-countMap.json
var cmData = fs.readFileSync('./cities-simple-countMap.json',{encoding:'utf8'});
var countMap = JSON.parse(cmData);


const latConstant = 1.0/24
function computeArea(lat){
	er = 6371;//approx earth radius in km
	return 3.14159265/180*er*er*Math.abs(Math.sin((lat-latConstant/2)*3.14159265/180)-Math.sin((lat+latConstant/2)*3.14159265/180))*latConstant
}
function withinRadius(loc,r){
	var pop = 0
	var area = 0
	var dds = 0
	var idxI = Math.round(loc[1]*24-1.0/2) 
	var idxJ = Math.round(loc[0]*24-1.0/2) 
	var offset = Math.round(r/3+5)+1
	for (var i=idxI-offset;i<idxI+offset+1;i++){
		var ii = (i+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		var twoMiss = 0
		for (var ji=0;ji<2*offset+2;ji++){
			if (ji %2 == 0){
				j = Math.round(idxJ+ji/2)
            }
			else{
				j = Math.round(idxJ-(ji+1)/2)
            }
			var jj = (j+1.0/2)/24	
			if (jj < -180 || jj > 180){continue}
			
			var d = haversine({longitude:jj,latitude:ii},{longitude:loc[0],latitude:loc[1]})
			if (d < r+2.5){
				twoMiss = 0
				var dd = 1
				if (d > r - 2.5){
					dd = ((r+2.5)-d)/5
                }
				areaAdd = iArea*dd
				if (countMap[i+";"+j]){
					popAdd = countMap[i+";"+j]*dd
					pop += popAdd
					area += areaAdd
					dds += dd
                }
				else{
					pop += 0
					area += areaAdd
					dds += dd
                }
            }
			else{
				twoMiss++;
				if (twoMiss > 1){break}
            }
        }
    }
	return pop/area*r*r*3.14159265
}





console.log(withinRadius([-81,34],50));


io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('popWithinR', (msg) => {
		console.log(Date.now());
		if (msg.r && msg.loc){
			var loc = [];
			if (Array.isArray(msg.loc)){
				loc = msg.loc;
			}
			else {
				if (msg.loc.lng){
					loc = [msg.loc.lng,msg.loc.lat];
				}
				else if (msg.loc.lon){
					loc = [msg.loc.lon,msg.loc.lat];
				}
				else {
					loc = [msg.loc.longitude,msg.loc.latitude];
				}
			}
			console.log(loc,msg.r)
			var pop = withinRadius(loc,msg.r);
			console.log(pop);
        	socket.emit('pop',pop);
			console.log(Date.now());
		}
        
    });
});

server.listen(3248, () => {
    console.log('listening on *:3248');
});