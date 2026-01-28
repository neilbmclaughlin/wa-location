import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Service URLs
const BGS_WMS_URL = 'https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer'
const EA_WMS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wms'
const EA_WFS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wfs'
const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes'
const CATCHMENT_API_URL = 'https://environment.data.gov.uk/catchment-planning/WaterBody'
const MONITORING_SITES_URL = 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/WFD_monitoring_sites/FeatureServer/0/query'

const server = Hapi.server({
  port: 3000,
  host: 'localhost'
})

await server.register([Inert, H2o2])

server.route({
  method: 'GET',
  path: '/',
  handler: (request, h) => h.file('postcode.html')
})

server.route({
  method: 'GET',
  path: '/results',
  handler: (request, h) => h.file('results.html')
})

server.route({
  method: 'GET',
  path: '/map',
  handler: (request, h) => h.file('map.html')
})

server.route({
  method: 'GET',
  path: '/hydrology-wms',
  handler: {
    proxy: {
      uri: `${BGS_WMS_URL}{query}`,
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
      const response = await fetch(`${POSTCODES_API_URL}/${postcode}`)
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
  path: '/water-availability-wms',
  handler: {
    proxy: {
      uri: `${EA_WMS_URL}{query}`,
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-availability-wfs',
  handler: {
    proxy: {
      uri: `${EA_WFS_URL}{query}`,
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-availability-info',
  handler: {
    proxy: {
      mapUri: (request) => {
        const { bbox, width, height, x, y } = request.query
        const query = new URLSearchParams({
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetFeatureInfo',
          LAYERS: 'Resource_Availability_at_Q95',
          QUERY_LAYERS: 'Resource_Availability_at_Q95',
          STYLES: '',
          BBOX: bbox,
          FEATURE_COUNT: '10',
          HEIGHT: height,
          WIDTH: width,
          FORMAT: 'image/png',
          INFO_FORMAT: 'application/json',
          CRS: 'EPSG:4326',
          I: x,
          J: y
        })
        return { uri: `${EA_WMS_URL}?${query.toString()}` }
      },
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-features-radius',
  handler: async (request, h) => {
    const { lat, lng, radius = 1000 } = request.query

    try {
      // Calculate precise bbox for 1km radius (1 degree ≈ 111km at equator)
      const radiusInDegrees = parseFloat(radius) / 111000 // Convert meters to degrees
      const minLng = parseFloat(lng) - radiusInDegrees
      const minLat = parseFloat(lat) - radiusInDegrees
      const maxLng = parseFloat(lng) + radiusInDegrees
      const maxLat = parseFloat(lat) + radiusInDegrees

      const wfsUrl = `${EA_WFS_URL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=Resource_Availability_at_Q95&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&BBOX=${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`

      const response = await fetch(wfsUrl)

      if (!response.ok) {
        console.error('WFS response not ok:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('WFS error response:', errorText)
        return h.response({ error: 'WFS service error', details: errorText }).code(500)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('WFS query error:', error)
      return h.response({ error: 'Failed to fetch features within radius', details: error.message }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/waterbody/{id}',
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const response = await fetch(`${CATCHMENT_API_URL}/${id}.geojson`)
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
  path: '/monitoring-sites',
  handler: async (request, h) => {
    try {
      const response = await fetch(`${MONITORING_SITES_URL}?where=1%3D1&outFields=*&f=geojson`)
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
