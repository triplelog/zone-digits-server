import rioxarray
import pandas
from haversine import haversine
import time
import math

latConstant = 1.0/24
def computeArea(lat):
	er = 6371
	return 3.14159265/180*er*er*abs(math.sin((lat-latConstant/2)*3.14159265/180)-math.sin((lat+latConstant/2)*3.14159265/180))*latConstant
def withinRadius(loc,r):
	#print(time.time())
	pop = 0
	area = 0
	dds = 0
	idxI = round(float(loc[0])*24-1.0/2) 
	idxJ = round(float(loc[1])*24-1.0/2) 
	offset = round(r/2+5)+1
	for i in range(idxI-offset,idxI+offset+1):
		ii = (i+1.0/2)/24
		iArea = computeArea(ii)
		for j in range(idxJ-offset,idxJ+offset+1):
			jj = (j+1.0/2)/24
			d = haversine((ii,jj),loc)
			if d < r+2.5:
				dd = 1
				if d > r - 2.5:
					dd = ((r+2.5)-d)/5
				areaAdd = iArea*dd
				try:
					#print(countMap[str(i)+"-"+str(j)],dd,iArea,pop,area)
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
	print(pop/area*r*r*3.14159265)
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


withinRadius([34,-81],10)
withinRadius([34,-81],25)
withinRadius([34,-81],50)
withinRadius([34,-81],100)


