const express = require('express')
const router = express.Router({ mergeParams: true }) //{ mergeParams: true } to access params in the route of app.js

// contains objects and function for prov elements and relations
const provUtils = require('../provUtils.js')
const driver = require('../neo4j-driver.js')


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
    const [acId, props] = provUtils.parseBodyReqElement(req, "activity")
    
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