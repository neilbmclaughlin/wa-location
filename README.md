# Water Availability Mapping Proof of Concept

A web application that displays water availability data and related hydrological information for UK locations based on postcode input.

## Features

- **Postcode Search**: Enter a UK postcode to center the map and display relevant data
- **Water Availability Layer**: Interactive WMS tiles showing water availability status with clickable polygons
- **Operational Catchments**: Display operational catchment boundaries when available, showing both outer perimeter and internal structure
- **Monitoring Sites**: Water monitoring site locations as clickable markers (with priority rendering above other layers)
- **Waterbody Features**: Displays catchment areas and river lines within 1km of the postcode with labels
- **Geological Layer**: BGS Hydrogeology data (optional overlay)
- **Interactive Popups**: Click on polygons and markers to view detailed information
- **Results List**: Detailed list view showing catchments with operational catchment names and related waterbody features
- **Distance Calculation**: Accurate distance calculation (0km if inside catchment, distance to boundary if outside)

## Data Sources

### Water Availability Data
- **Display**: WMS tiles from Environment Agency service
- **Interaction**: WMS GetFeatureInfo for polygon clicks
- **Spatial Queries**: WFS for finding polygons within radius
- **Service**: `https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/`
- **Properties**: Includes `camscdsq95` (color classification) and `ea_wb_id` (waterbody identifier)

### Operational Catchment Data
- **Source**: Environment Agency ArcGIS REST Service and Catchment Planning API
- **Classification Service**: `https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/WFD_Cycle_2_River_catchment_classification/FeatureServer`
- **Geometry Service**: `https://environment.data.gov.uk/catchment-planning/OperationalCatchment/{id}.geojson`
- **Content**: Links waterbodies to operational catchments, provides OPCAT_ID and OPCAT_NAME
- **Display**: Green boundary showing outer perimeter (thick) and internal polygons (thin)

### Geological Data
- **Source**: British Geological Survey (BGS)
- **Service**: `https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer`
- **Layer**: Hydrogeology data
- **Format**: WMS tiles

### Monitoring Sites
- **Source**: Environment Agency Hydrology API
- **Service**: `https://environment.data.gov.uk/hydrology/id/stations`
- **Content**: Hydrological monitoring stations including river flows, levels, groundwater, rainfall, and water quality
- **Format**: JSON transformed to GeoJSON
- **Display**: Orange circle markers with popup data, rendered above other layers

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

- **Backend**: Node.js with Hapi.js framework using proxy routes with mapUri for efficient service integration
- **Frontend**: Leaflet.js for mapping, Turf.js for spatial operations (union, distance calculations)
- **Coordinate Systems**: WGS84 (EPSG:4326) throughout with proper OGC service configuration
- **Performance**: WMS tiles for display, WFS for spatial queries, viewport-based filtering
- **Architecture**: Modular service URLs defined as constants for maintainability

## Service Integration

- **WMS (Web Map Service)**: Fast tile rendering and GetFeatureInfo queries
- **WFS (Web Feature Service)**: Spatial queries for polygons within radius
- **ArcGIS REST**: Monitoring sites, operational catchment classification, and waterbody feature data
- **OGC Standards**: Proper coordinate system handling across all services

## Usage

1. Start the server: `npm start`
2. Navigate to `http://localhost:3000`
3. Enter a UK postcode
4. View the map with water availability data
5. Toggle layers on/off using the control panel
6. Click on polygons and markers for detailed information
7. Use "View Catchments" to see detailed list with operational catchment information
8. Click "View on Map" from results to see specific catchment with operational boundary

## API Endpoints

- `GET /` - Postcode input page
- `POST /postcode` - Geocode postcode to coordinates
- `GET /map` - Interactive map view
- `GET /results` - Catchment results list view
- `GET /water-availability-info` - WMS GetFeatureInfo for polygon clicks (proxied with mapUri)
- `GET /nearby-catchments` - WFS spatial query for polygons within radius (proxied with mapUri)
- `GET /operational-catchments-by-ids` - Get operational catchment info by waterbody IDs
- `GET /monitoring-sites` - Monitoring sites GeoJSON data
- `GET /waterbody/{id}` - Waterbody features for specific ID
- `GET /operational-catchment/{id}` - Operational catchment GeoJSON for specific OPCAT ID
- `GET /water-availability-wms` - Proxy for EA water availability WMS service
- `GET /water-availability-wfs` - Proxy for EA water availability WFS service
- `GET /hydrology-wms` - Proxy for BGS geological WMS service

## Development

### Codespaces
- Use `./startup-codespace.sh` to create and configure a GitHub Codespace
- Automatically sets up port forwarding and opens the application
- Includes devcontainer configuration for consistent development environment

### Code Standards
- Backend follows neostandard coding standards
- Service URLs centralized as constants for maintainability
- Proxy routes use Hapi.js mapUri for efficient parameter transformation

---

## CORS and Proxy Routes

The application uses server-side proxy routes to avoid Cross-Origin Resource Sharing (CORS) issues when accessing external services. 

**The Problem**: Web browsers block direct requests from the frontend (running on `localhost:3000` or codespace URL) to external domains like `environment.data.gov.uk`, `services1.arcgis.com`, and `map.bgs.ac.uk`.

**The Solution**: All external service calls are proxied through the Node.js server:
- Frontend calls local routes like `/nearby-catchments`, `/water-availability-info`
- Server transforms parameters and proxies requests to external OGC/ArcGIS services
- External services respond to server (no CORS restrictions on server-to-server calls)
- Server returns data to frontend

**Benefits**: Avoids CORS issues, enables parameter transformation, provides centralized error handling, and hides external service URLs from the frontend.
