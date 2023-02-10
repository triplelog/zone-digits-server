const fs = require('fs');
const express = require('express');
const haversine = require('haversine');
const Flatten = require('@flatten-js/core');
const axios = require('axios');
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
function popWithinContour(poly,boundary){
	let polygon = new Polygon(poly);
	let boundaryXY = {};
	var center = {x:0,y:0};
	var count = 0;
	//console.log(boundary);
	for (var i in boundary){
		var x = parseFloat(i.split(";")[1]);
		var y = parseFloat(i.split(";")[0]);
		if (!boundaryXY[x]){boundaryXY[x]=[];}
		boundaryXY[x].push(y);
		center.x += (x+1.0/2)/24;
		center.y += (y+1.0/2)/24;
		count++;
	}
	//console.log(boundaryXY);
	
	center.x /= count;
	center.y /= count;
	console.log(center);
	var isInside = {};
	for (var x in boundaryXY){
		boundaryXY[x].sort((a,b) => {return a-b});
		isInside[boundaryXY[x][0]+";"+x]=true;
		for (var i=1,len=boundaryXY[x].length;i<len;i++){
			isInside[boundaryXY[x][i]+";"+x]=true;
			if (boundaryXY[x][i]-boundaryXY[x][i-1] > 3){
				var mid = Math.round((boundaryXY[x][i]+boundaryXY[x][i-1])/2);
				var lng = (parseFloat(x)+1.0/2)/24;
				var lat = (mid+1.0/2)/24;
				var point = new Point([lng,lat])
				if (polygon.contains(point)){
					for (var j=boundaryXY[x][i-1]+1,lenn=boundaryXY[x][i];j<lenn;j++){
						isInside[j+";"+x]=true;
					}
				}
			}
			else {
				for (var j=boundaryXY[x][i-1]+1,lenn=boundaryXY[x][i];j<lenn;j++){
					
					var lng = (parseFloat(x)+1.0/2)/24;
					var lat = (j+1.0/2)/24;
					var point = new Point([lng,lat])
					if (polygon.contains(point)){
						isInside[j+";"+x]=true;
					}
				}
				
			}
			
		}

	}
	
	var pop = 0
	var area = 0
	for (var ij in isInside){
		var i = ij.split(";")[0];
		var j = ij.split(";")[1];
		var ii = (parseInt(i)+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		var jj = (parseInt(j)+1.0/2)/24	
		if (jj < -180 || jj > 180){continue}
		if (isInside[i+";"+j]){
			var dd = 1;
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
	return {pop:pop,area:area,center:center};

}
function withinPolygon(poly){
	//console.log(poly);
	var polys = {'poly':poly};
	var insideFunction = function(data) {
		return data['poly'];
	};
	let insideMap = {};
	var center = {x:0,y:0};
	var allInside = {};
	for (var p in polys){
		var poly = polys[p];
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
			center.x += poly[i][0]/poly.length;
			center.y += poly[i][1]/poly.length;
		}



		var pop = 0
		var area = 0
		var idxI = Math.round(box.b*24-1.0/2) 
		var idxJ = Math.round(box.l*24-1.0/2) 
		var idxIM = Math.round(box.t*24-1.0/2) 
		var idxJM = Math.round(box.r*24-1.0/2)
		insideMap[p] = {};
		for (var i=idxI-3;i<idxIM+3;i++){
			if (!allInside[i]){
				allInside[i]={};
			}
			for (var j=idxJ-3;j<idxJM+3;j++){
				insideMap[p][(i)+";"+(j)]=0;
				allInside[i][j]=1;
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
					//insideMap[p][(i-1)+";"+(j-1)]++;
					//insideMap[p][(i-1)+";"+(j)]++;
					//insideMap[p][(i)+";"+(j-1)]++;
					insideMap[p][(i)+";"+(j)]++;
				}
			}
		}
	}
	var isInside = {};
	
	var pop = 0
	var area = 0
	for (var i in allInside){
		for (var j in allInside[i]){
			isInside[(i)+";"+(j)]=0;
		}
	}
	for (var i in allInside){
		for (var j in allInside[i]){
			var data = {};
			for (var p in polys){
				if (insideMap[p][(i)+";"+(j)]){
					data[p]=true;
				}
				else {
					data[p]=false;
				}
			}
			if (insideFunction(data)){
				isInside[(i-1)+";"+(j-1)]++;
				isInside[(i-1)+";"+(j)]++;
				isInside[(i)+";"+(j-1)]++;
				isInside[(i)+";"+(j)]++;
			}
			
		}
	}
	//console.log(isInside);

	console.log(Date.now(),'checked inside');
	for (var i in allInside){
		var ii = (parseInt(i)+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		for (var j in allInside[i]){
			
			var jj = (parseInt(j)+1.0/2)/24	
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
function withinPolygons(polys,fn){
	//console.log(poly);
	var fnStr = fn;
	for (var p in polys){
		const re = new RegExp(p,"g");
		fnStr = fnStr.replace(re,'data["'+p+'"]');
	}
	var insideFunction = new Function('data',"return "+fnStr);
	let insideMap = {};
	var center = {x:0,y:0};
	var allInside = {};
	for (var p in polys){
		var poly = polys[p];
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
			center.x += poly[i][0]/poly.length;
			center.y += poly[i][1]/poly.length;
		}



		var pop = 0
		var area = 0
		var idxI = Math.round(box.b*24-1.0/2) 
		var idxJ = Math.round(box.l*24-1.0/2) 
		var idxIM = Math.round(box.t*24-1.0/2) 
		var idxJM = Math.round(box.r*24-1.0/2)
		insideMap[p] = {};
		for (var i=idxI-3;i<idxIM+3;i++){
			if (!allInside[i]){
				allInside[i]={};
			}
			for (var j=idxJ-3;j<idxJM+3;j++){
				insideMap[p][(i)+";"+(j)]=0;
				allInside[i][j]=1;
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
					//insideMap[p][(i-1)+";"+(j-1)]++;
					//insideMap[p][(i-1)+";"+(j)]++;
					//insideMap[p][(i)+";"+(j-1)]++;
					insideMap[p][(i)+";"+(j)]++;
				}
			}
		}
	}
	var isInside = {};
	var pop = 0
	var area = 0
	for (var i in allInside){
		for (var j in allInside[i]){
			isInside[(i)+";"+(j)]=0;
		}
	}
	for (var i in allInside){
		for (var j in allInside[i]){
			var data = {};
			for (var p in polys){
				if (insideMap[p][(i)+";"+(j)]){
					data[p]=true;
				}
				else {
					data[p]=false;
				}
			}
			if (insideFunction(data)){
				isInside[(i-1)+";"+(j-1)]++;
				isInside[(i-1)+";"+(j)]++;
				isInside[(i)+";"+(j-1)]++;
				isInside[(i)+";"+(j)]++;
			}
			
		}
	}

	console.log(Date.now(),'checked inside');
	for (var i in allInside){
		var ii = (parseInt(i)+1.0/2)/24
		if (ii < -90 || ii > 90){continue}
		var iArea = computeArea(ii)
		for (var j in allInside[i]){
			
			var jj = (parseInt(j)+1.0/2)/24	
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
	console.log(loc,targetPop);

	var rList = [];
	for (var i=0;i<101;i++){
		rList.push(Math.pow(50,i/50));
	}
	var ret = withinRadiusArray(loc,rList);
	var pop = ret.pop;
	var area = ret.area;
	if (Array.isArray(targetPop)){
		var outR = [];
		for (var j=0;j<targetPop.length;j++){
			var tp = parseFloat(targetPop[j]);
			var lastPop = 0;
			for (var i=0;i<101;i++){
				var r = rList[i];
				var rpop = pop[i]/area[i]*r*r*3.14159265;
				if (rpop>tp){
					if (i == 0){
						outR.push(1);
						break;
					}
					var lastR = rList[i-1];
					var pct = (tp-lastPop)/(rpop-lastPop);
					console.log('pct: ',pct);
					outR.push(Math.sqrt(Math.pow(lastR,2)*(1-pct)+Math.pow(r,2)*(pct)));
					break;
					
				}
				lastPop = rpop;
			}
			if (outR.length < j+1){
				outR.push(rList[100]);
			}
		}
		return outR;
	}
	else {
		var tp = parseFloat(targetPop);
		var lastPop = 0;
		for (var i=0;i<101;i++){
			var r = rList[i];
			var rpop = pop[i]/area[i]*r*r*3.14159265;
			if (rpop>tp){
				if (i == 0){
					return 1;
				}
				var lastR = rList[i-1];
				var pct = (tp-lastPop)/(rpop-lastPop);
				return Math.sqrt(Math.pow(lastR,2)*(1-pct)+Math.pow(r,2)*(pct));
				
			}
			lastPop = rpop;
		}
	}
	
	//should have returned something earlier
	return rList[100];

}




console.log(withinRadius([-81,34],50));

console.log(withinPolygon({'SC':[[-81,34],[-80,34],[-80,35],[-81,35]]},'SC'));

console.log(popToRadius([-81,34],10000000));

console.log(withinRadiusArray([-81,34],[5,10,20,50]));


io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('popWithinRadius', (msg) => {
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
        		socket.emit('popWithinRadius',{'popList':popList,id:msg.id});
				console.log(Date.now());
			}
			else {
				var pop = withinRadius(loc,msg.r);
				console.log(pop);
        		socket.emit('popWithinRadius',{'pop':pop,id:msg.id});
				console.log(Date.now());
			}
		}
    });
	socket.on('radiusWithinPop', (msg) => {
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
				var ret = popToRadius(loc,msg.r);
				console.log(ret)
        		socket.emit('radiusWithinPop',{'popList':ret,id:msg.id});
				console.log(Date.now());
			}
			else {
				var ret = popToRadius(loc,msg.r);
				console.log(ret)
        		socket.emit('radiusWithinPop',{'pop':ret,id:msg.id});
				console.log(Date.now());
			}
			
		}
        
    });
	socket.on('popWithinContour', (msg) => {
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
				/*var ret = findContour(center,minDensity)
				var ret = popToRadius(loc,msg.r);
				console.log(ret)
        		socket.emit('radiusWithinPop',{'popList':ret,id:msg.id});
				console.log(Date.now());*/
			}
			else {
				console.log('looking for contour',Date.now());
				var ret = findContour(loc,msg.r);
				console.log('found contour',Date.now());
				//var pop = withinPolygon(ret.boundaryList);
				//console.log('got popOld',Date.now(),pop.pop);
				var pop = popWithinContour(ret.boundaryList,ret.boundary);
				console.log('got popNew',Date.now(),pop.pop);
        		socket.emit('popWithinContour',{'pop':pop,'poly':ret.boundaryList,id:msg.id});
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






/*
//inputs: center coordinates, minimum pop density
let center = [-81,34];
let minDensity = 200;

findContour(center,minDensity)
*/

function contourFromPoint(i,j,minDensity,map){
	//console.log('start contour',Date.now())
    var iArea = computeArea((i+1.0/2)/24);
    while (true){
        if (map[i+";"+j] && map[i+";"+j]/iArea > minDensity){
            j--;
        }
        else {
            break;
        }
    }

    let boundary = {};
    var p = [j+1,i];
    var s = [j+1,i,{3:1}];
    boundary[i+";"+(j+1)]=1;
	var boundaryList = [];
	boundaryList.push([(j+1)/24,(i+1.0/2)/24]);
	var cList = [];
    var c = [j,i+1];
	cList.push(c);
    var d = 3;//right
	var count = 0;
    while (c[0] != s[0] || c[1] != s[1] || !s[2][d]){
        if (c[0] == s[0] && c[1] == s[1]){
            s[2][d]=boundaryList.length;
        }
        var density = 0;
        if (map[c[1]+";"+c[0]]){
            var iArea = computeArea((c[1]+1.0/2)/24);
            density = map[c[1]+";"+c[0]]/iArea;
        }
        
        if (density > minDensity){
			
            boundary[c[1]+";"+c[0]]=boundaryList.length;
			
			[(j+1)/24,(i+1.0/2)/24]
            p = [c[0],c[1]];
            if (d == 0){boundaryList.push([c[0]/24,(c[1]+1.0/2)/24]); c[0]--; d = 1; }
            else if (d == 1){boundaryList.push([(c[0]+1.0)/24,(c[1]+1.0/2)/24]); c[0]++; d = 0; }
            else if (d == 2){boundaryList.push([(c[0]+1.0/2)/24,(c[1]+1.0)/24]); c[1]++; d = 3; }
            else if (d == 3){boundaryList.push([(c[0]+1.0/2)/24,(c[1])/24]); c[1]--; d = 2; }
        }
        else {
            if (c[0] == p[0]){
                if (c[1] > p[1]){
					boundaryList.push([(c[0]+1.0/2)/24,(c[1])/24]);
                    c[0]++; d= 0;
                }
                else {
					boundaryList.push([(c[0]+1.0/2)/24,(c[1]+1)/24]);
                    c[0]--; d= 1;
                }
            }
            else if (c[0] > p[0]){
                if (c[1] < p[1]){
					boundaryList.push([(c[0])/24,(c[1]+1)/24]);
                    c[0]--; d= 1;
                }
                else {
					if (c[1] > p[1]){boundaryList.push([(c[0])/24,(c[1])/24]);}
					else {boundaryList.push([(c[0])/24,(c[1]+1.0/2)/24]);}
                    c[1]--; d= 2;
                }
            }
            else {
                if (c[1] > p[1]){
					boundaryList.push([(c[0]+1)/24,(c[1])/24]);
                    c[0]++; d= 0;
                }
                else {
					if (c[1] < p[1]){boundaryList.push([(c[0]+1)/24,(c[1]+1)/24]);}
					else {boundaryList.push([(c[0]+1)/24,(c[1]+1.0/2)/24]);}
                    c[1]++; d= 3;
                }
            }
        }
		count++;
		if (count > 500000){
			break;
		}
    }
	
	boundaryList = boundaryList.slice(s[2][d]-1);
	for (var i in boundary){
		if (boundary[i]<s[2][d]-1){
			delete boundary[i];
		}
	}
	//console.log('end contour',Date.now(), boundaryList.length);
	//console.log(boundaryList);
	return {boundaryList:boundaryList,boundary:boundary};
}
function findContour(center,minDensity){
    var cPoint = new Point(center);
	console.log(cPoint);
    var minPoint = [0,0,Infinity];
	var maxContour = [0,[]];
    for (var i=Math.round(center[1]*24-1.0/2)-6;i<Math.round(center[1]*24-1.0/2)+97;i+=6){
        var ii = (i+1.0/2)/24
        if (ii < -90 || ii > 90){continue}
        var iArea = computeArea(ii);
		var killIt = false;
        for (var j=Math.round(center[0]*24-1.0/2)-12;j<Math.round(center[0]*24-1.0/2)+13;j+=6){
			
            var jj = (j+1.0/2)/24	
            if (jj < -180 || jj > 180){continue}
            
            if (countMap[i+";"+j] && countMap[i+";"+j]/iArea > minDensity){
				var bList = contourFromPoint(i,j,minDensity,countMap);
				
				if (bList.boundaryList.length > maxContour[0]){
					
					maxContour[0] = bList.boundaryList.length;
					maxContour[1] = bList;
					var polygon = new Polygon(bList.boundaryList);
					if (polygon.contains(cPoint)){
						console.log('found contour containing center')
						killIt = true;
						break;
					}
				}
            }
        }
		if (killIt){break}
    }
	return maxContour[1]
    
}
/*
function computeContourCar(center,coordList,destinations,durations,maxDistance){
	let durationMap = {};
	for (var i=0;i<coordList.length;i++){
		if (durations[i]+destinations[i].distance/20000*60*60 < maxDistance){
			durationMap[coordList[i][0]+";"+coordList[i][1]]=100;
		}
	}
	console.log(center);
	return contourFromPoint(center[0],center[1],0,durationMap);
}
function findContourCarSecond(center,maxDistance,socket,destinations,durations){
    let durationMap = {};
	for (var i=0;i<coordList.length;i++){
		if (durations[i]+destinations[i].distance/20000*60*60 < maxDistance){
			durationMap[coordList[i][0]+";"+coordList[i][1]]=100;
		}
	}
    var minPoint = [0,0,Infinity];
	var maxContour = [0,[]];
	var offset = 50;
	var coordList = [];
    for (var i=Math.round(center[1]*24-1.0/2)-offset;i<Math.round(center[1]*24-1.0/2)+offset+1;i++){
		if (i%5 == 0){continue;}
        var ii = (i+1.0/2)/24
        if (ii < -90 || ii > 90){continue}
		var iii = Math.floor(i/5)*5;
        for (var j=Math.round(center[0]*24-1.0/2)-offset;j<Math.round(center[0]*24-1.0/2)+offset+1;j++){
			if (j%5 == 0){continue;}
            var jj = (j+1.0/2)/24	
            if (jj < -180 || jj > 180){continue}
			var jjj = Math.floor(j/5)*5;
			var goodCount =0;
			if (durationMap[(iii)+";"+(jjj)]){goodCount++;}
			if (durationMap[(iii)+";"+(jjj+1)]){goodCount++;}
			if (durationMap[(iii+1)+";"+(jjj+1)]){goodCount++;}
			if (durationMap[(iii+1)+";"+(jjj)]){goodCount++;}
			if (goodCount > 0 && goodCount < 4){
            	coordList.push([i,j,ii,jj]);
			}
        }
    }
	console.log(coordList.length);
	var coordStr = "http://127.0.0.1:5000/table/v1/driving/";
	coordStr += center[0]+","+center[1]+";";
	for (var i=0;i<coordList.length;i++){
		coordStr += (Math.round(coordList[i][3]*100000)/100000)+","+(Math.round(coordList[i][2]*100000)/100000);
		if (i < coordList.length-1){
			coordStr += ";";
		}
		else {
			coordStr += "?sources=0";
		}
	}
	console.log("getting matrix",Date.now());
	axios.get(coordStr)
	.then(function (response) {
		// handle success
		console.log("got matrix",Date.now());
		console.log(response.data.durations[0].slice(0,10));
		var boundaryList = computeContourCar([Math.round(center[1]*24-1.0/2),Math.round(center[0]*24-1.0/2)],coordList,response.data.destinations.slice(1),response.data.durations[0].slice(1),maxDistance)
		//console.log(boundaryList);
		socket.emit('contour',boundaryList);
		console.log(Date.now());
	})
	.catch(function (error) {
		// handle error
		console.log(error);
	})
	.finally(function () {
		// always executed
	});
    
}
function findContourCarFirst(center,maxDistance,socket){
    
    var minPoint = [0,0,Infinity];
	var maxContour = [0,[]];
	var offset = 50;
	var coordList = [];
    for (var i=Math.round(center[1]*24-1.0/2)-offset;i<Math.round(center[1]*24-1.0/2)+offset+1;i++){
		if (i%5 != 0){continue;}
        var ii = (i+1.0/2)/24
        if (ii < -90 || ii > 90){continue}
        for (var j=Math.round(center[0]*24-1.0/2)-offset;j<Math.round(center[0]*24-1.0/2)+offset+1;j++){
			if (j%5 != 0){continue;}
            var jj = (j+1.0/2)/24	
            if (jj < -180 || jj > 180){continue}
            coordList.push([i,j,ii,jj]);
        }
    }
	var coordStr = "http://127.0.0.1:5000/table/v1/driving/";
	coordStr += center[0]+","+center[1]+";";
	for (var i=0;i<coordList.length;i++){
		coordStr += (Math.round(coordList[i][3]*100000)/100000)+","+(Math.round(coordList[i][2]*100000)/100000);
		if (i < coordList.length-1){
			coordStr += ";";
		}
		else {
			coordStr += "?sources=0";
		}
	}
	console.log("getting first matrix",Date.now());
	axios.get(coordStr)
	.then(function (response) {
		// handle success
		console.log("got first matrix",Date.now());
		console.log(response.data.durations[0].slice(0,10));
		findContourCarSecond(center,maxDistance,socket,response.data.destinations.slice(1),response.data.durations[0].slice(1))
		
	})
	.catch(function (error) {
		// handle error
		console.log(error);
	})
	.finally(function () {
		// always executed
	});
    
}
function findContourCarOld(center,maxDistance,socket){
    
    var minPoint = [0,0,Infinity];
	var maxContour = [0,[]];
	var offset = 50;
	var coordList = [];
    for (var i=Math.round(center[1]*24-1.0/2)-offset;i<Math.round(center[1]*24-1.0/2)+offset+1;i++){
        var ii = (i+1.0/2)/24
        if (ii < -90 || ii > 90){continue}
        for (var j=Math.round(center[0]*24-1.0/2)-offset;j<Math.round(center[0]*24-1.0/2)+offset+1;j++){
            var jj = (j+1.0/2)/24	
            if (jj < -180 || jj > 180){continue}
            coordList.push([i,j,ii,jj]);
        }
    }
	var coordStr = "http://127.0.0.1:5000/table/v1/driving/";
	coordStr += center[0]+","+center[1]+";";
	for (var i=0;i<coordList.length;i++){
		coordStr += (Math.round(coordList[i][3]*100000)/100000)+","+(Math.round(coordList[i][2]*100000)/100000);
		if (i < coordList.length-1){
			coordStr += ";";
		}
		else {
			coordStr += "?sources=0";
		}
	}
	console.log("getting matrix",Date.now());
	axios.get(coordStr)
	.then(function (response) {
		// handle success
		console.log("got matrix",Date.now());
		console.log(response.data.durations[0].slice(0,10));
		var boundaryList = computeContourCar([Math.round(center[1]*24-1.0/2),Math.round(center[0]*24-1.0/2)],coordList,response.data.destinations.slice(1),response.data.durations[0].slice(1),maxDistance)
		//console.log(boundaryList);
		socket.emit('contour',boundaryList);
		console.log(Date.now());
	})
	.catch(function (error) {
		// handle error
		console.log(error);
	})
	.finally(function () {
		// always executed
	});
    
}

//findContourCar([-46.6396,-23.5558],1000)
*/
