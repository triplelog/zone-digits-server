const haversine = require('haversine-distance')
const fs = require('fs');

var path = "./ne_10m_populated_places_simple/citiesVS.geojson";
var pathOut = "./ne_10m_populated_places_simple/citiesVS2.geojson";

var gj = fs.readFileSync(path, {encoding: 'utf8'});
var gjson = JSON.parse(gj);

counts = [0,0,0,0,0,0,0,0];
for (var i=gjson.features.length-1;i>=0;i--){
	counts[0]++;
	if (gjson.features[i].properties.pop_max < 25){
		gjson.features.splice(i,1);
		continue;
	}
	counts[1]++;
	var a = {latitude: gjson.features[i].geometry.coordinates[1],longitude:gjson.features[i].geometry.coordinates[0]};
	for (var j=gjson.features.length-1;j>=0;j--){
		if (i == j){continue;}
		var b = {latitude: gjson.features[j].geometry.coordinates[1],longitude:gjson.features[j].geometry.coordinates[0]};
		var d = haversine(a,b);
		if (d < 20000){
			if (gjson.features[i].properties.pop_max < gjson.features[j].properties.pop_max){
				if (gjson.features[i].properties.pop_min < gjson.features[j].properties.pop_min){
					if (gjson.features[i].properties.pop_max > 250){
						//console.log(gjson.features[i].properties,gjson.features[j].properties)
						counts[2]++;
					}
					else {
						counts[3]++;
						gjson.features.splice(i,1);
						break;
					}
					continue;
				}
			}
			
		}
	}
}

console.log(counts)

torem = [];
for (var i=gjson.features.length-1;i>=0;i--){
	counts[4]++;
	var a = {latitude: gjson.features[i].geometry.coordinates[1],longitude:gjson.features[i].geometry.coordinates[0]};
	for (var j=gjson.features.length-1;j>=0;j--){
		if (i == j){continue;}
		var b = {latitude: gjson.features[j].geometry.coordinates[1],longitude:gjson.features[j].geometry.coordinates[0]};
		var d = haversine(a,b);
		if (d >= 40000){
			continue;
		}
		for (var k=gjson.features.length-1;k>=0;k--){
			if (i == torem[torem.length-1]){continue;}
			var c = {latitude: gjson.features[k].geometry.coordinates[1],longitude:gjson.features[k].geometry.coordinates[0]};
			if (i == k){continue;}
			if (j == k){continue;}
			var d = haversine(a,c);
			if (d < 40000){
				if (gjson.features[i].properties.pop_max < gjson.features[j].properties.pop_max && gjson.features[i].properties.pop_max < gjson.features[k].properties.pop_max){
					if (gjson.features[i].properties.pop_min < gjson.features[j].properties.pop_min && gjson.features[i].properties.pop_min < gjson.features[k].properties.pop_min){
						if (gjson.features[i].properties.pop_max > 250){
							//console.log(gjson.features[i].properties,gjson.features[j].properties)
							counts[5]++;
						}
						else {
							counts[6]++;
							//gjson.features.splice(i,1);
							torem.push(i);
							break;
						}
						continue;
					}
				}
				
			}
		}
	}
}
console.log(torem.length);
for (var i=0;i<torem.length;i++){
	var ii=torem[i];
	gjson.features.splice(ii,1);
}
console.log(counts)
fs.writeFileSync(pathOut, JSON.stringify(gjson));


for (var i=gjson.features.length-1;i>=0;i--){
	if (i%100 == 0){console.log(i)}
	var a = {latitude: gjson.features[i].geometry.coordinates[1],longitude:gjson.features[i].geometry.coordinates[0]};
	for (var j=gjson.features.length-1;j>=0;j--){
		if (i == j){continue;}
		var b = {latitude: gjson.features[j].geometry.coordinates[1],longitude:gjson.features[j].geometry.coordinates[0]};
		var d = haversine(a,b);
		if (d >= 100000){
			continue;
		}
		for (var k=gjson.features.length-1;k>=0;k--){
			if (i == torem[torem.length-1]){continue;}
			var c = {latitude: gjson.features[k].geometry.coordinates[1],longitude:gjson.features[k].geometry.coordinates[0]};
			if (i == k){continue;}
			if (j == k){continue;}
			var d = haversine(a,c);
			if (d < 100000){
				counts[7]++;
				
				
			}
		}
	}
}
console.log(counts)