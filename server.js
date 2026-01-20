import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import fs from 'fs/promises'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import proj4 from 'proj4'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Define coordinate systems
proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs')

// Load GeoJSON data at startup
let waterAvailabilityData
try {
  const geojsonData = await fs.readFile('./Resource_Availability_at_Q95.geojson', 'utf8')
  waterAvailabilityData = JSON.parse(geojsonData)
  console.log(`Loaded ${waterAvailabilityData.features.length} water availability features`)
} catch (error) {
  console.error('Failed to load GeoJSON:', error)
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
  method: 'GET',
  path: '/water-wms',
  handler: {
    proxy: {
      uri: 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wms{query}',
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
  path: '/water-availability',
  handler: async (request, h) => {
    const { lat, lng } = request.query

    if (!waterAvailabilityData) {
      return h.response({ error: 'Data not available' }).code(500)
    }

    // Convert WGS84 lat/lng to British National Grid
    const [x, y] = proj4('EPSG:4326', 'EPSG:27700', [parseFloat(lng), parseFloat(lat)])
    const queryPoint = point([x, y])

    for (const feature of waterAvailabilityData.features) {
      if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
        if (booleanPointInPolygon(queryPoint, feature.geometry)) {
          return feature.properties
        }
      }
    }

    return { error: 'No data found for location' }
  }
})

await server.start()
console.log('Server running on %s', server.info.uri)
