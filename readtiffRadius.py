import rioxarray
import pandas


rds = rioxarray.open_rasterio("./grid_totals_tif/grid_totals.tif",)

rds = rds.squeeze().drop("spatial_ref").drop("band")
rds.name = "data"


df = rds.to_dataframe().reset_index()
df[df.data>=100.0].to_csv("./grid_totals_tif/out2020.csv", index=False)


f = open('./grid_totals_tif/out2020.csv','r')
ff = open('./grid_totals_tif/out2020out.csv','w')
lines = f.readlines()
  
count = 0
count2 = 0
for line in lines:
	line2 = line.strip().split(",")
	if count == 0:
		ff.write(line)
		count += 1
		continue
	line2[0] = round(float(line2[0])*24-1.0/48)
	line2[1] = round(float(line2[1])*24-1.0/48)
	c1 = f"{float(line2[0]):.0f}"
	c2 = f"{float(line2[1]):.0f}"
	c3 = f"{float(line2[2]):.0f}"
	if (float(line2[2]) >= 250):
		count2+=1
		row = c1+", "+c2+","+c3+"\n"
		#row = c1+", "+c2+"\n"
		ff.write(row)
	
	
	count += 1
	#if (count > 100):
	#	break
print(count,count2)
f.close()
ff.close()
