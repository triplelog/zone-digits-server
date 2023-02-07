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
	r = parseFloat(r);
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
	//console.log(poly);
	let polygon = new Polygon(poly);

	var box = {l:Infinity,r:-1*Infinity,b:Infinity,t:-1*Infinity};
	var center = {x:0,y:0};
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
		center.x += poly[i][0]/poly.length;
		center.y += poly[i][1]/poly.length;
	}



	var pop = 0
	var area = 0
	var idxI = Math.round(box.b*24-1.0/2) 
	var idxJ = Math.round(box.l*24-1.0/2) 
	var idxIM = Math.round(box.t*24-1.0/2) 
	var idxJM = Math.round(box.r*24-1.0/2)
	var isInside = {};
	for (var i=idxI-3;i<idxIM+3;i++){
		for (var j=idxJ-3;j<idxJM+3;j++){
			isInside[(i)+";"+(j)]=0;
			
		}
	}
	for (var i=idxI-2;i<idxIM+3;i++){
		var ii = (i)/24;
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		for (var j=idxJ-2;j<idxJM+3;j++){
			var jj = (j)/24;
			if (jj < -180 || jj > 180){continue}
			var point = new Point([jj,ii])
			var inside = polygon.contains(point)
			if (inside){
				isInside[(i-1)+";"+(j-1)]++;
				isInside[(i-1)+";"+(j)]++;
				isInside[(i)+";"+(j-1)]++;
				isInside[(i)+";"+(j)]++;
			}
		}
	}
	console.log(Date.now(),'checked inside');
	for (var i=idxI-1;i<idxIM+2;i++){
		var ii = (i+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		for (var j=idxJ-1;j<idxJM+2;j++){
			
			var jj = (j+1.0/2)/24	
			if (jj < -180 || jj > 180){continue}
			if (isInside[i+";"+j]>0){
				var dd = isInside[i+";"+j]/4;
				areaAdd = iArea*dd
				if (countMap[i+";"+j]){
					popAdd = countMap[i+";"+j]*dd
					pop += popAdd
					area += areaAdd
                }
				else{
					pop += 0
					area += areaAdd
                }
			}
        }
    }
	return {pop:pop,area:area,center:center};

}
function withinRadiusArray(loc,rList){
	var pop = {}
	var area = {}
	
	var len = rList.length;
	for (var i=0;i<len;i++){
		rList[i] = parseFloat(rList[i]);
		pop[i]=0;
		area[i]=0;
	}
	rList.sort((a,b) => {return a - b});
	var maxR = rList[len-1];
	for (var i=0;i<len;i++){
		pop[i]=0;
		area[i]=0;
	}
	var idxI = Math.round(loc[1]*24-1.0/2) 
	var idxJ = Math.round(loc[0]*24-1.0/2) 
	var offset = Math.round(maxR/3+5)+1
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
			if (d < maxR+2.5){
				twoMiss = 0
				for (var k=len-1;k>=0;k--){
					var r = rList[k];
					if (d >= r+2.5){
						break;
					}
					var dd = 1
					if (d > r - 2.5){
						dd = ((r+2.5)-d)/5
					}
					areaAdd = iArea*dd
					if (countMap[i+";"+j]){
						popAdd = countMap[i+";"+j]*dd
						pop[k] += popAdd
						area[k] += areaAdd
					}
					else{
						pop[k] += 0
						area[k] += areaAdd
					}
				}
            }
			else{
				twoMiss++;
				if (twoMiss > 1){break}
            }
        }
    }
	return {pop:pop,area:area}
}
function popToRadius(loc,targetPop){
	

	var rList = [];
	for (var i=0;i<101;i++){
		rList.push(Math.pow(50,i/50));
	}
	var ret = withinRadiusArray(loc,rList);
	var pop = ret.pop;
	var area = ret.area;
	
	var lastPop = 0;
	for (var i=0;i<101;i++){
		var r = rList[i];
		var rpop = pop[i]/area[i]*r*r*3.14159265;
		if (rpop>targetPop){
			if (i == 0){
				return 1;
			}
			var lastR = rList[i-1];
			var pct = (targetPop-lastPop)/(rpop-lastPop);
			return Math.sqrt(Math.pow(lastR,2)*(1-pct)+Math.pow(r,2)*(pct));
			
		}
		lastPop = rpop;
	}
	//should have returned something earlier
	return rList[100];

}




console.log(withinRadius([-81,34],50));

console.log(withinPolygon([[-81,34],[-80,34],[-80,35],[-81,35]]));

console.log(popToRadius([-81,34],10000000));

console.log(withinRadiusArray([-81,34],[5,10,20,50]));


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
			if (Array.isArray(msg.r)){
				var ret = withinRadiusArray(loc,msg.r);
				var popList = [];
				for (var i=0;i<msg.r.length;i++){
					var r = msg.r[i];
					var rpop = ret.pop[i]/ret.area[i]*r*r*3.14159265;
					popList.push(rpop);
				}
				console.log(popList);
        		socket.emit('popList',popList);
				console.log(Date.now());
			}
			else {
				var pop = withinRadius(loc,msg.r);
				console.log(pop);
        		socket.emit('pop',pop);
				console.log(Date.now());
			}
			
		}
        
    });
	socket.on('popWithinPoly', (msg) => {
		console.log(Date.now());
		if (msg.poly){
			var ret = withinPolygon(msg.poly);
			ret.id = msg.id;
        	socket.emit('polyPop',ret);
			console.log(Date.now());
		}
        
    });
});

server.listen(3248, () => {
    console.log('listening on *:3248');
});