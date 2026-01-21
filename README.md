# Water Availability Mapping Proof of Concept

A web application that displays water availability data and related hydrological information for UK locations based on postcode input.

## Features

- **Postcode Search**: Enter a UK postcode to center the map and display relevant data
- **Water Availability Layer**: Interactive WMS tiles showing water availability status with clickable polygons
- **Geological Layer**: BGS Hydrogeology data (optional overlay)
- **Monitoring Sites**: Water monitoring site locations as clickable markers
- **Waterbody Features**: Displays catchment areas and river lines within 1km of the postcode
- **Interactive Popups**: Click on polygons and markers to view detailed information

## Data Sources

### Water Availability Data
- **Display**: WMS tiles from Environment Agency service
- **Interaction**: WMS GetFeatureInfo for polygon clicks
- **Spatial Queries**: WFS for finding polygons within radius
- **Service**: `https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/`
- **Properties**: Includes `camscdsq95` (color classification) and `ea_wb_id` (waterbody identifier)

### Geological Data
- **Source**: British Geological Survey (BGS)
- **Service**: `https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer`
- **Layer**: Hydrogeology data
- **Format**: WMS tiles

### Monitoring Sites
- **Source**: Environment Agency ArcGIS REST Service
- **Service**: `https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/WFD_monitoring_sites/FeatureServer`
- **Content**: Water Framework Directive monitoring site locations
- **Format**: GeoJSON from ArcGIS FeatureServer

### Waterbody Features
- **Source**: Environment Agency Catchment Planning API
- **Service**: `https://environment.data.gov.uk/catchment-planning/WaterBody/{ea_wb_id}.geojson`
- **Content**: Catchment boundaries, river lines, and other waterbody features
- **Format**: GeoJSON

### Postcode Geocoding
- **Source**: Postcodes.io
- **Service**: `https://api.postcodes.io/postcodes/{postcode}`
- **Content**: Converts UK postcodes to WGS84 coordinates

## Technical Implementation

- **Backend**: Node.js with Hapi.js framework
- **Frontend**: Leaflet.js for mapping, Turf.js for spatial operations
- **Coordinate Systems**: WGS84 (EPSG:4326) throughout with proper OGC service configuration
- **Performance**: WMS tiles for display, WFS for spatial queries, viewport-based filtering

## Service Integration

- **WMS (Web Map Service)**: Fast tile rendering and GetFeatureInfo queries
- **WFS (Web Feature Service)**: Spatial queries for polygons within radius
- **ArcGIS REST**: Monitoring sites and waterbody feature data
- **OGC Standards**: Proper coordinate system handling across all services

## Usage

1. Start the server: `npm start`
2. Navigate to `http://localhost:3000/postcode`
3. Enter a UK postcode
4. View the map with water availability data
5. Toggle layers on/off using the control panel
6. Click on polygons and markers for detailed information

## API Endpoints

- `GET /postcode` - Postcode input page
- `POST /postcode` - Geocode postcode to coordinates
- `GET /water-availability` - WMS GetFeatureInfo for polygon clicks
- `GET /water-features-radius` - WFS spatial query for polygons within radius
- `GET /monitoring-sites` - Monitoring sites GeoJSON data
- `GET /waterbody/{id}` - Waterbody features for specific ID
- `GET /wms` - Proxy for BGS geological WMS service
- `GET /water-wms` - Proxy for EA water availability WMS service
- `GET /water-wfs` - Proxy for EA water availability WFS service
