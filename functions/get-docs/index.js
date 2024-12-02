const express = require('express')
const serverless = require('serverless-http')
const swaggerUI = require('swagger-ui-express')

var options = {
    swaggerOptions: {
        url: './swagger/swagger.yaml'
    }
}

const app = express()
app.use('/docs',
    swaggerUI.serve,
    swaggerUI.setup(null, options))

module.exports.handler = serverless(app)