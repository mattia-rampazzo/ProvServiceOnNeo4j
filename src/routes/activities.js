const express = require('express')
const router = express.Router({ mergeParams: true }) //{ mergeParams: true } to access params in the route of app.js

const neo4j = require('neo4j-driver')

const uri = "bolt://localhost:7687"
const user = "neo4j"
const password = "password"

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))


async function addActivity(tx, docId, acId, props){
    
    props.id = acId; // add the id to the properties of the node
    
    return result = await tx.run(
        'MATCH (d:Document {id: $docId}) CREATE (d)<-[:IS_CONTAINED_IN]-(:Activity $props)',
        { docId: docId, props: props }
    )

}

router.post("/", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    // get the activity id and props
    const [acId, props] = parseBodyReqElement(req, "activity")
    
    // open a session
    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx => {
        return await addActivity(tx, docId, acId, props)
    })
    
    console.log(result)
        
    } finally {
        await session.close()
    }


    res.send("It's working!")
})

module.exports = router;