const fs = require('fs');

var path = process.argv[2]+".json";
var pathOut = process.argv[2]+"-simple.json";


//var path = "./ne_10m_populated_places_simple/cities.geojson";
//var pathOut = "./ne_10m_populated_places_simple/citiesVS.geojson";

//var keeps = ['scalerank','labelrank','name','pop_min','pop_max','adm0_a3','ne_id'];
var keeps = ['scalerank','name','pop_min','pop_max','adm0_a3','ne_id','adm1name'];//adm1name

var gj = fs.readFileSync(path, {encoding: 'utf8'});
var gjson = JSON.parse(gj);




var cityCount = 0;
var cityRanks = {};
var cityDupes = {};
for (var i=gjson.features.length-1;i>=0;i--){
	var props = gjson.features[i].properties;
	//if (i == gjson.features.length-1){console.log(JSON.stringify(props))}
	var newProps = {};
	for (var j=0;j<keeps.length;j++){
		//only keep some properties
		newProps[keeps[j]]=props[keeps[j]];
	}
	var a3 = gjson.features[i].properties['adm0_a3'];
	
	

	//simplify lat/lng coordinates and round pops to 1000s
	newProps['pop_min'] = Math.round(newProps['pop_min']/1000);
	newProps['pop_max'] = Math.round(newProps['pop_max']/1000);
	gjson.features[i].geometry.coordinates[0] = Math.round(gjson.features[i].geometry.coordinates[0]*1000000)/1000000;
	gjson.features[i].geometry.coordinates[1] = Math.round(gjson.features[i].geometry.coordinates[1]*1000000)/1000000;
	gjson.features[i].properties = {};
	for (var j=0;j<keeps.length;j++){
		gjson.features[i].properties[keeps[j]]=newProps[keeps[j]];
	}
	if (a3 != "USA"){
		delete gjson.features[i].properties['adm1name'];
	}
	else {
		gjson.features[i].properties['state'] = gjson.features[i].properties['adm1name'];
		delete gjson.features[i].properties['adm1name'];
	}
	
	cityCount++;
}
console.log("Number of cities: ", cityCount)
fs.writeFileSync(pathOut, JSON.stringify(gjson));

for (var i in cityDupes){
	if (cityDupes[i] > 1){
		console.log(i,cityDupes[i])
	}
}