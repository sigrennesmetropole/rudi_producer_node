exports.options = {
  routePrefix: '/documentation',
  exposeRoute: true,
  swagger: {
    info: {
      title: 'RUDI Producer API',
      description: 'API for the RUDI Proxy on the Producer node',
      version: '1.0.3',
    },
    externalDocs: {
      url: 'https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER',
      description: 'OAS3 specifications',
    },
    host: 'localhost/RUDI-PRODUCER/api/v1',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
}
