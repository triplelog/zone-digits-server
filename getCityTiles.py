import rioxarray
import pandas
from haversine import haversine
import time
import math
import json
from pyproj import Transformer


transformer = Transformer.from_crs("EPSG:4326", "EPSG:3857")

fj = open('./cities-final.json')
  
# returns JSON object as 
# a dictionary
cityData = json.load(fj)
fj.close()


cityTiles = {}
for i in range(0,4):
	for j in range(0,4):
		cityTiles[str(i)+"-"+str(j)]=[]



leng = len(cityData['features'])
rankedCities = []
magicNumber = 20037508.3427892
for i in range(0,leng):
	city = cityData['features'][i]
	x1,y1 = city['geometry']['coordinates'][1],city['geometry']['coordinates'][0]
	x2,y2 = transformer.transform(x1,y1)
	tileX1 = math.floor((x2+magicNumber)/(2*magicNumber)*4)
	tileY1 = 3-math.floor((y2+magicNumber)/(2*magicNumber)*4)
	#print(city['properties']['name'],x2,y2,tileX1,tileY1)
	if tileX1 > 3 or tileX1 < 0:
		print(tileX1)
		continue
	if tileY1 > 3 or tileY1 < 0:
		print(tileY1)
		continue
	cityTiles[str(tileX1)+"-"+str(tileY1)].append(city)



for i in range(0,4):
	for j in range(0,4):
		json_object = json.dumps(cityTiles[str(i)+"-"+str(j)], indent=4)
		with open('./cityTiles/cities-'+str(i)+"-"+str(j)+".json", "w") as outfile:
			outfile.write(json_object)


