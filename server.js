const fs = require('fs');
const express = require('express');
const haversine = require('haversine');
const Flatten = require('@flatten-js/core');
const {Point, Vector, Circle, Line, Ray, Segment, Arc, Box, Polygon, Matrix, PlanarSet} = Flatten;
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
function withinPolygon(poly){
	console.log(Date.now())
	//console.log(poly);
	let polygon = new Polygon(poly);

	var box = {l:Infinity,r:-1*Infinity,b:Infinity,t:-1*Infinity};
	for (var i=0;i<poly.length;i++){
		if (poly[i][0] < box.l){
			box.l = poly[i][0];
		}
		else if (poly[i][0] > box.r){
			box.r = poly[i][0];
		}
		if (poly[i][1] < box.b){
			box.b = poly[i][1];
		}
		else if (poly[i][1] > box.t){
			box.t = poly[i][1];
		}
	}



	var pop = 0
	var area = 0
	var dds = 0
	var idxI = Math.round(box.b*24-1.0/2) 
	var idxJ = Math.round(box.l*24-1.0/2) 
	var idxIM = Math.round(box.t*24-1.0/2) 
	var idxJM = Math.round(box.r*24-1.0/2)
	for (var i=idxI-1;i<idxIM+2;i++){
		var ii = (i+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		for (var j=idxJ-1;j<idxJM+2;j++){
			
			var jj = (j+1.0/2)/24	
			if (jj < -180 || jj > 180){continue}
			var point = new Point([jj,ii])
			var inside = polygon.contains(point)
			if (inside){
				var dd = 1
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
        }
    }
	console.log(Date.now());
	return pop

}




console.log(withinRadius([-81,34],50));

console.log(withinPolygon([[-81,34],[-80,34],[-80,35],[-81,35]]));


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
	socket.on('popWithinPoly', (msg) => {
		console.log(Date.now());
		if (msg.poly){
			var pop = withinPolygon(msg.poly);
			console.log(pop);
        	socket.emit('pop',pop);
			console.log(Date.now());
		}
        
    });
});

server.listen(3248, () => {
    console.log('listening on *:3248');
});