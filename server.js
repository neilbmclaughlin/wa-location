import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import fs from 'fs/promises'
import proj4 from 'proj4'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Define coordinate systems
proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs')

// Load GeoJSON data at startup and transform coordinates
let waterAvailabilityData
try {
  const geojsonData = await fs.readFile('./Resource_Availability_at_Q95.geojson', 'utf8')
  const rawData = JSON.parse(geojsonData)

  // Transform coordinates from EPSG:27700 to EPSG:4326
  waterAvailabilityData = {
    ...rawData,
    features: rawData.features.map(feature => ({
      ...feature,
      geometry: transformGeometry(feature.geometry)
    }))
  }

  console.log(`Loaded and transformed ${waterAvailabilityData.features.length} water availability features`)
} catch (error) {
  console.error('Failed to load GeoJSON:', error)
}

function transformGeometry (geometry) {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(ring =>
        ring.map(coord => proj4('EPSG:27700', 'EPSG:4326', coord))
      )
    }
  } else if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(coord => proj4('EPSG:27700', 'EPSG:4326', coord))
        )
      )
    }
  }
  return geometry
}

const server = Hapi.server({
  port: 3000,
  host: 'localhost'
})

await server.register([Inert, H2o2])

server.route({
  method: 'GET',
  path: '/',
  handler: (request, h) => h.file('index.html')
})

server.route({
  method: 'GET',
  path: '/postcode',
  handler: (request, h) => h.file('postcode.html')
})

server.route({
  method: 'GET',
  path: '/wms',
  handler: {
    proxy: {
      uri: 'https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer{query}',
      passThrough: true
    }
  }
})

server.route({
  method: 'POST',
  path: '/postcode',
  handler: async (request, h) => {
    const { postcode } = request.payload

    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`)
      const data = await response.json()

      if (data.status === 200) {
        return {
          postcode,
          lat: data.result.latitude,
          lng: data.result.longitude
        }
      }

      return h.response({ error: 'Invalid postcode' }).code(400)
    } catch (error) {
      console.error('Fetch error:', error)
      return h.response({ error: 'Service unavailable' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/geojson/water-availability',
  handler: (request, h) => {
    if (!waterAvailabilityData) {
      return h.response({ error: 'Data not available' }).code(500)
    }
    return waterAvailabilityData
  }
})

server.route({
  method: 'GET',
  path: '/waterbody/{id}',
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const response = await fetch(`https://environment.data.gov.uk/catchment-planning/WaterBody/${id}.geojson`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Waterbody fetch error:', error)
      return h.response({ error: 'Failed to fetch waterbody data' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/monitoring-sites-geojson',
  handler: async (request, h) => {
    try {
      const response = await fetch('https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/WFD_monitoring_sites/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson')
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Monitoring sites fetch error:', error)
      return h.response({ error: 'Failed to fetch monitoring sites' }).code(500)
    }
  }
})

await server.start()
console.log('Server running on %s', server.info.uri)
