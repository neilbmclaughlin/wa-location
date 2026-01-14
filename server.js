import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'

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

await server.start()
console.log('Server running on %s', server.info.uri)
