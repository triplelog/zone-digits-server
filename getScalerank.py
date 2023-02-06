import rioxarray
import pandas
from haversine import haversine
import time
import math
import json

outFile = './cities-final.json'
outFile4 = './cities-1000.json'
fj = open('./cities-simple-main.json')
  
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




leng = len(cityData['features'])
rankedCities = []
for i in range(0,leng):
	city = cityData['features'][i]
	rankedCities.append({'oid':i,'name':city['properties']['name'],'pop':city['properties']['pop'],'popC':city['properties']['popC']})
def mySort1(a):
	return a['popC']
rankedCities.sort(key=mySort1,reverse=True)
print(rankedCities[0:10])


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

for i in range(0,leng):
	oid = rankedCities[i]['oid']
	biggerRadius[i].sort()
	if len(biggerRadius[i]) < 20:
		rankedCities[i]['rad10'] = 1000000
		rankedCities[i]['rad1'] = 1000000
	else:
		rankedCities[i]['rad10'] = 1*biggerRadius[i][2]+1*biggerRadius[i][4]+1*biggerRadius[i][9]+1*biggerRadius[i][19]
		rankedCities[i]['rad1'] = biggerRadius[i][0]
def mySort3(a):
	return a['rad10']
rankedCities.sort(key=mySort3,reverse=True)
print(rankedCities[0:30])
for i in range(0,leng):
	oid = rankedCities[i]['oid']
	cityData['features'][oid]['properties']['scalerank']=i+1
	cityData['features'][oid]['properties']['nextrank']=round(rankedCities[i]['rad1'])
		

json_object = json.dumps(cityData, indent=4)
with open(outFile, "w") as outfile:
	outfile.write(json_object)


topop = []
for i in range(1000,leng):
	oid = rankedCities[i]['oid']
	topop.append(oid)
topop.sort(reverse=True)
for i in range(0,len(topop)):
	cityData['features'].pop(topop[i])
		

json_object = json.dumps(cityData, indent=4)
with open(outFile4, "w") as outfile:
	outfile.write(json_object)



