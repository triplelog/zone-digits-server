import rioxarray
import pandas


rds = rioxarray.open_rasterio("./pops/density25.tif",)

rds = rds.squeeze().drop("spatial_ref").drop("band")
rds.name = "data"

print(rds.to_dataframe())
print(soto)
df = rds.to_dataframe().reset_index()

df[df.data>=1.0].to_csv("./pops/out2020.csv", index=False)


f = open('./pops/out2020.csv','r')
ff = open('./pops/out2020out.csv','w')
lines = f.readlines()
  
count = 0
count2 = 0
for line in lines:
	line2 = line.strip().split(",")
	if count == 0:
		ff.write(line)
		count += 1
		continue
	c1 = f"{float(line2[0]):.4f}"
	c2 = f"{float(line2[1]):.4f}"
	c3 = f"{float(line2[2]):.0f}"
	if (float(line2[2]) >= 1000):
		count2+=1
		#row = c1+", "+c2+","+c3+"\n"
		row = c1+", "+c2+"\n"
		ff.write(row)
	
	
	count += 1
	#if (count > 100):
	#	break
print(count,count2)
f.close()
ff.close()
