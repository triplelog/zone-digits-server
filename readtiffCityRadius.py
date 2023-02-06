import rioxarray
import pandas
from haversine import haversine
import time
import math
import json
import sys


outFile = './'+sys.argv[1]+'-simple-pop.json'
outFile2 = './'+sys.argv[1]+'-simple-countMap.json'
outFile3 = './'+sys.argv[1]+'-simple-main.json'
fj = open('./'+sys.argv[1]+'-simple.json')
popfile = './'+sys.argv[2]
popR = 50
if len(sys.argv) > 3:
	popR = float(sys.argv[3])
#outFile = './ne_10m_populated_places_simple/citiesVS3Pops.geojson'
#fj = open('./ne_10m_populated_places_simple/citiesVS3.geojson')

# returns JSON object as 
# a dictionary
cityData = json.load(fj)
fj.close()

closestCity = {}
latConstant = 1.0/24
def computeArea(lat):
	er = 6371
	return 3.14159265/180*er*er*abs(math.sin((lat-latConstant/2)*3.14159265/180)-math.sin((lat+latConstant/2)*3.14159265/180))*latConstant
def withinRadius(loc,r,isc=False):
	#print(time.time())
	pop = 0
	area = 0
	dds = 0
	idxI = round(float(loc[0])*24-1.0/2) 
	idxJ = round(float(loc[1])*24-1.0/2) 
	offset = round(r/3+5)+1
	for i in range(idxI-offset,idxI+offset+1):
		ii = (i+1.0/2)/24
		if ii < -90 or ii > 90:
			continue
		iArea = computeArea(ii)
		twoMiss = 0
		#for j in range(idxJ-offset,idxJ+offset+1):
		#	jj = (j+1.0/2)/24
		for ji in range(0,2*offset+2):
			if ji %2 == 0:
				j = round(idxJ+ji/2)
			else:
				j = round(idxJ-(ji+1)/2)
			jj = (j+1.0/2)/24	
			if jj < -180 or jj > 180:
				continue
			d = haversine((ii,jj),loc)
			if not isc:
				try:
					if d < closestCity[str(i)+";"+str(j)]:
						closestCity[str(i)+";"+str(j)] = d
				except:
					closestCity[str(i)+";"+str(j)] = d
			if d < r+2.5:
				
				twoMiss = 0
				dd = 1
				if d > r - 2.5:
					dd = ((r+2.5)-d)/5
				areaAdd = iArea*dd
				cellMap[str(i)+";"+str(j)]=d
				try:
					#print(countMap[str(i)+";"+str(j)],dd,iArea,pop,area)
					
					popAdd = countMap[str(i)+";"+str(j)]*dd
					if isc:
						try:
							if d > closestCity[str(i)+";"+str(j)]:
								popAdd = 0
						except:
							pass
					pop += popAdd
					area += areaAdd
					dds += dd
				except:
					#print(str(i)+";"+str(j),dd,iArea,pop,area)
					pop += 0
					area += areaAdd
					dds += dd
					#print(ii,jj)
			else:
				twoMiss+=1
				if twoMiss > 1:
					break
	return pop/area*r*r*3.14159265
	#print(time.time())

rds = rioxarray.open_rasterio(popfile+".tif",)
rds = rds.squeeze().drop("spatial_ref").drop("band")
rds.name = "data"


df = rds.to_dataframe().reset_index()
df[df.data>=1.0].to_csv(popfile+".csv", index=False)


f = open(popfile+".csv",'r')
lines = f.readlines()

count = 0
countMap = {}
countTotal = 0
for line in lines:
	line2 = line.strip().split(",")
	if count == 0:
		count += 1
		continue
	line2[0] = round(float(line2[0])*24-1.0/2)
	line2[1] = round(float(line2[1])*24-1.0/2)
	if float(line2[2])>=10.0:
		countMap[str(line2[0])+";"+str(line2[1])]=round(float(line2[2]))
		countTotal += float(line2[2])

json_object = json.dumps(countMap, indent=4)
with open(outFile2, "w") as outfile:
    outfile.write(json_object)
print(countTotal,popR)
f.close()


leng = len(cityData['features'])



closestCity = {}
print(time.time())
cellMap = {}
for i in range(0,leng):
	locLL = cityData['features'][i]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	
	cellMap = {}
	pop = withinRadius(loc,popR)
	cityData['features'][i]['properties']['cells']=cellMap
	cityData['features'][i]['properties']['popR']=round(pop/1000)
	cityData['features'][i]['properties']['pairs']=[]


for i in range(0,leng):
	locLL = cityData['features'][i]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	pop = withinRadius(loc,popR,True)
	cityData['features'][i]['properties']['popC']=round(pop/1000)



print(time.time())
for i in range(0,leng):
	locLL = cityData['features'][i]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	for j in range(i+1,leng):
		locLL2 = cityData['features'][j]['geometry']['coordinates']
		loc2 = [locLL2[1],locLL2[0]]
		d = haversine(loc,loc2)
		if d < 2*popR:
			cityData['features'][i]['properties']['pairs'].append(cityData['features'][j]['properties']['ne_id'])
			cityData['features'][j]['properties']['pairs'].append(cityData['features'][i]['properties']['ne_id'])

print(time.time())
json_object = json.dumps(cityData, indent=4)
with open(outFile, "w") as outfile:
    outfile.write(json_object)

lowCount = 0
for ii in range(0,leng):
	i = leng-1-ii
	try:
		locLL = cityData['features'][i]['geometry']['coordinates']
	except:
		continue
	loc = [locLL[1],locLL[0]]
	
	pop = withinRadius(loc,popR)
	cityData['features'][i]['properties']['pop']=round(pop/1000)
	del cityData['features'][i]['properties']['pairs']
	del cityData['features'][i]['properties']['cells']
	del cityData['features'][i]['properties']['pop_min']
	del cityData['features'][i]['properties']['pop_max']
	cityData['features'][i]['properties']['pop'] = cityData['features'][i]['properties']['popR']
	del cityData['features'][i]['properties']['popR']
	cityData['features'][i]['geometry']['coordinates'][0] = round(cityData['features'][i]['geometry']['coordinates'][0],4)
	cityData['features'][i]['geometry']['coordinates'][1] = round(cityData['features'][i]['geometry']['coordinates'][1],4)
	#del cityData['features'][i]['properties']['gdp']
	#del cityData['features'][i]['properties']['cname']
print("new n cities: ", leng, lowCount)
json_object = json.dumps(cityData, indent=4)
with open(outFile3, "w") as outfile:
    outfile.write(json_object)

