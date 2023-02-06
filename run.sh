#!/bin/bash

# shapefile name (the folder name)
SHPFILE="ne_10m_populated_places_simple"
#geojson filename to output
GJFILE="cities"
#filename of gridded pop count
POPFILE="grid_totals"
#radius
R=$1

ogr2ogr -f GeoJSON -s_srs ${SHPFILE}/${SHPFILE}.prj -t_srs EPSG:4326 ${GJFILE}.json ${SHPFILE}/${SHPFILE}.shp

#Run simplifyGeojson.js to convert shapefile of cities to a geojson
node simplifyGeojson.js ${GJFILE}

#run readtiffCityRadius.py to add population within radius to geojson
python3 readtiffCityRadius.py ${GJFILE} ${POPFILE} ${R}

#run computeStationRadius.js to get population within station zones
#node computeStationRadius.js ${GJFILE} ${R}


python3 getScalerank.py

python3 getCityTiles.py