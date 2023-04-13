const express = require("express")
require('dotenv').config()

const documents = require('./src/routes/documents.js')
const entities = require('./src/routes/entities.js')
const activities = require('./src/routes/activities.js')
const agents = require('./src/routes/agents.js')
const relations = require('./src/routes/relations.js')


const port = process.env.PORT || 3000

const app = express()

// middleware
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// api routes
app.use('/api/v0/documents', documents)
app.use('/api/v0/documents/:docId/entities', entities)
app.use('/api/v0/documents/:docId/activities', activities)
app.use('/api/v0/documents/:docId/agents', agents)
app.use('/api/v0/documents/:docId/relations', relations)


app.listen(port, () => {
    console.log('server listening on port ' + port)
})