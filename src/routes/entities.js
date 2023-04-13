const express = require('express')
const router = express.Router({ mergeParams: true }) //{ mergeParams: true } to access params in the route of app.js

// contains objects and function for prov elements and relations
const provUtils = require('../provUtils.js')
const driver = require('../neo4j-driver.js')


// old version
async function createEntities(doc_id, e_id, attributes, session){
    
    const node_properties = attributes // doesnt create a new object
    node_properties.id = e_id; // add the id to the attributes for the properties of the node
    //const node_properties = Object.assign({'id': e_id}, attributes) // create a new object
    
    const result = await session.run(
        'MATCH (d:Document {id: $doc_id}) CREATE (d)<-[:IS_CONTAINED_IN]-(:Entity $node_properties)',
        { doc_id: doc_id, node_properties: node_properties }
    )     

    console.log(result)

}

// label parametrization not supported
async function createElement(tx, docId, elId, elType, props){
    
    props.id = elId; // add the id to the properties of the node
    
    return result = await tx.run(
        'MATCH (d:Document {id: $docId}) CREATE (d)<-[:IS_CONTAINED_IN]-(el $props) SET el:$elType',
        { docId: docId, props: props, elType: elType }
    )

}

async function addEntity(tx, docId, eId, props){
    
    props.id = eId; // add the id to the properties of the node
    
    return result = await tx.run(
        'MATCH (d:Document {id: $docId}) CREATE (d)<-[:IS_CONTAINED_IN]-(:Entity $props)',
        { docId: docId, props: props }
    )

}


router.post("/", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    console.log(docId)
    // get the entity id and props
    const [eId, props] = provUtils.parseBodyReqElement(req, "entity")
    
    // open a session
    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx => {
            return await addEntity(tx, docId, eId, props)
        })
        
        console.log(result)
        
    } finally {
        await session.close()
    }

    res.send("It's working!")
})


module.exports = router;