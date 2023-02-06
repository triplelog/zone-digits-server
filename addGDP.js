const haversine = require('haversine-distance')
const fs = require('fs');

var path = "./ne_10m_populated_places_simple/citiesVS2.geojson";
var pathOut = "./ne_10m_populated_places_simple/citiesVS3.geojson";

var gj = fs.readFileSync(path, {encoding: 'utf8'});
var gjson = JSON.parse(gj);

var gdpData = fs.readFileSync("./gdp.tsv",{encoding:"utf8"});
var gdpMap = {};
var gdpLines = gdpData.split("\n");
for (var i=0;i<gdpLines.length;i++){
	var line = gdpLines[i].trim().split("\t");
	if (line.length > 2){
		var gdp = Math.max(5000,Math.ceil(parseFloat(line[2])));
		gdpMap[line[1]]={name:line[0],gdp:5000};
	}
	else if (line.length > 1){
		gdpMap[line[1]]={name:line[0],gdp:5000};
	}
}
gdpMap['TWN']={name:'Taiwan',gdp:60000};
gdpMap['KOS']={name:'Kosovo',gdp:12000};
gdpMap['SOL']={name:'Somaliland',gdp:5000};
gdpMap['PSX']={name:'Palestine',gdp:5000};

counts = [0,0,0,0,0,0,0,0];
for (var i=gjson.features.length-1;i>=0;i--){
	var a3 = gjson.features[i].properties['adm0_a3'];
	if (!gdpMap[a3]){
		gjson.features.splice(i,1);
		continue;
	}
	gjson.features[i].properties.gdp = gdpMap[a3].gdp;
	gjson.features[i].properties.cname = gdpMap[a3].name;
}

fs.writeFileSync(pathOut, JSON.stringify(gjson));
