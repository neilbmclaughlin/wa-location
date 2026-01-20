import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
      console.log(`Fetching postcode: ${postcode}`)
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`)
      console.log(`Response status: ${response.status}`)

      const data = await response.json()
      console.log('Response data:', data)

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

await server.start()
console.log('Server running on %s', server.info.uri)
