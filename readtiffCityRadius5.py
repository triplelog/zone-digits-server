import rioxarray
import pandas
from haversine import haversine
import time
import math
import json

outFile = './ne_10m_populated_places_simple/citiesVS9Pops.geojson'
fj = open('./ne_10m_populated_places_simple/citiesVS9.geojson')
  
# returns JSON object as 
# a dictionary
cityData = json.load(fj)
fj.close()

pixelToCities = {}
dubs = {}

latConstant = 1.0/24
def computeArea(lat):
	er = 6371
	return 3.14159265/180*er*er*abs(math.sin((lat-latConstant/2)*3.14159265/180)-math.sin((lat+latConstant/2)*3.14159265/180))*latConstant
def assignRadius(loc,r,city):
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
		for j in range(idxJ-offset,idxJ+offset+1):
			try:
				cityOld = pixelToCities[str(i)+"-"+str(j)]
				if cityOld != city and r == 50:
					dubs[str(i)+"-"+str(j)]=1
				continue
			except:
				pass
			jj = (j+1.0/2)/24
			if jj < -180 or jj > 180:
				continue
			d = haversine((ii,jj),loc)
			if d < r+2.5:
				pixelToCities[str(i)+"-"+str(j)]=city

def withinRadius(loc,r,city):
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
		for j in range(idxJ-offset,idxJ+offset+1):
			
			jj = (j+1.0/2)/24
			if jj < -180 or jj > 180:
				continue
			d = haversine((ii,jj),loc)
			if d < r+2.5:
				dd = 1
				if d > r - 2.5:
					dd = ((r+2.5)-d)/5

				areaAdd = iArea*dd
				try:
					#print(countMap[str(i)+"-"+str(j)],dd,iArea,pop,area)
					popAdd = 0
					try:
						cityOld = pixelToCities[str(i)+"-"+str(j)]
						if city == cityOld:
							popAdd = countMap[str(i)+"-"+str(j)]*dd
					except:
						popAdd = countMap[str(i)+"-"+str(j)]*dd
					pop += popAdd
					area += areaAdd
					dds += dd
				except:
					#print(str(i)+"-"+str(j),dd,iArea,pop,area)
					pop += 0
					area += areaAdd
					dds += dd
					#print(ii,jj)
	return pop/area*r*r*3.14159265
	#print(time.time())


rds = rioxarray.open_rasterio("./grid_totals_tif/grid_totals.tif",)

rds = rds.squeeze().drop("spatial_ref").drop("band")
rds.name = "data"


df = rds.to_dataframe().reset_index()
df[df.data>=10.0].to_csv("./grid_totals_tif/out2020.csv", index=False)


f = open('./grid_totals_tif/out2020.csv','r')
lines = f.readlines()
  
count = 0
count2 = 0
countMap = {}
countTotal = 0
for line in lines:
	line2 = line.strip().split(",")
	if count == 0:
		count += 1
		continue
	line2[0] = round(float(line2[0])*24-1.0/2)
	line2[1] = round(float(line2[1])*24-1.0/2)
	countMap[str(line2[0])+"-"+str(line2[1])]=float(line2[2])
	countTotal += float(line2[2])
	
print(count,count2,countTotal)
f.close()


#withinRadius([34,-81],10)
#withinRadius([34,-81],25)
#withinRadius([34,-81],50)
#withinRadius([34,-81],100)

leng = len(cityData['features'])
rankedCities = []
for i in range(0,leng):
	city = cityData['features'][i]
	rankedCities.append({'oid':i,'name':city['properties']['name'],'pop_max':city['properties']['pop_max']})
def mySort1(a):
	return a['pop_max']
rankedCities.sort(key=mySort1,reverse=True)
print(rankedCities[0:10])

leng = len(rankedCities)
for i in range(0,leng):
	if i%500 == 0:
		print(i)
	oid = rankedCities[i]['oid']
	locLL = cityData['features'][oid]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	assignRadius(loc,10,oid)
for i in range(0,leng):
	if i%500 == 0:
		print(i)
	oid = rankedCities[i]['oid']
	locLL = cityData['features'][oid]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	assignRadius(loc,25,oid)
for i in range(0,leng):
	if i%500 == 0:
		print(i)
	oid = rankedCities[i]['oid']
	locLL = cityData['features'][oid]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	assignRadius(loc,50,oid)

for i in range(0,leng):
	if i%500 == 0:
		print(i)
	oid = rankedCities[i]['oid']
	locLL = cityData['features'][oid]['geometry']['coordinates']
	loc = [locLL[1],locLL[0]]
	pop50 = withinRadius(loc,50,oid)
	rankedCities[i]['pop50']=pop50

def mySort2(a):
	return a['pop50']
rankedCities.sort(key=mySort2,reverse=True)
print(rankedCities[0:10])
print(leng)
npixels = 0
dpix = 0
for key in pixelToCities:
	npixels += 1
for key in dubs:
	dpix += 1
print(npixels, dpix)
pairs50 = 0

toDelete = {}
c = 2500
biggerRadius = {}
for i in range(0,leng):
	biggerRadius[i]=[]
for i in range(0,leng):
	#the bigger city
	oid1 = rankedCities[i]['oid']
	locLL1 = cityData['features'][oid1]['geometry']['coordinates']
	loc1 = [locLL1[1],locLL1[0]]
	for ii in range(i+1,leng):
		oid2 = rankedCities[ii]['oid']
		locLL2 = cityData['features'][oid2]['geometry']['coordinates']
		loc2 = [locLL2[1],locLL2[0]]
		d = haversine(loc1,loc2)
		biggerRadius[ii].append(d)
		if d < 100:
			gdp =  cityData['features'][oid2]['properties']['gdp']
			ratio = c*25/(d*d)*1000*rankedCities[i]['pop50']/(rankedCities[ii]['pop50']*rankedCities[ii]['pop50'])
			if ratio > math.sqrt(gdp)/math.sqrt(100000):
				toDelete[oid2]=True
			pairs50+=1

for i in range(0,leng):
	oid = rankedCities[i]['oid']
	biggerRadius[i].sort()
	if len(biggerRadius[i]) < 10:
		rankedCities[i]['rad10'] = 1000000
	else:
		rankedCities[i]['rad10'] = 1*biggerRadius[i][2]+2*biggerRadius[i][4]+1*biggerRadius[i][9]
def mySort3(a):
	return a['rad10']
rankedCities.sort(key=mySort3,reverse=True)
print(rankedCities[0:30])
for i in range(0,leng):
	oid = rankedCities[i]['oid']
	cityData['features'][oid]['properties']['scalerank2']=i+1
	cityData['features'][oid]['properties']['pop50']=round(rankedCities[i]['pop50']/1000)
	del cityData['features'][oid]['properties']['pop_min']
	del cityData['features'][oid]['properties']['pop_max']
		

json_object = json.dumps(cityData, indent=4)
with open(outFile, "w") as outfile:
    outfile.write(json_object)


