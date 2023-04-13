const express = require('express')
const router = express.Router()
const driver = require('../neo4j-driver.js')



async function createDocument(doc_id, prefix, session){

    const node_properties = prefix
    node_properties.id = doc_id

    const result = await session.run(
        'CREATE (:Document $node_properties)',
        { node_properties: node_properties }
    )     

    console.log(result)

}

// logs the match n return n
async function getDocumento(doc_id, session){

    const rtn = {}

    const result = await session.run(
        'MATCH (d:Document {id:$doc_id}) RETURN d{.*} as prefix',
        { doc_id : doc_id}
    )      
    const singleRecord = result.records[0]
    const prefix = singleRecord.get(0)
    delete prefix.id 

    rtn.prefix = prefix



    const result2 = await session.run(
        'UNWIND ["Entity","Activity","Agent"] AS l MATCH (n)-[:IS_CONTAINED_IN*]->(:Document {id: $doc_id}) WHERE l IN labels(n) RETURN toLower(l) as type, collect(n{.*}) as props',
        { doc_id : doc_id}
    )

    result2.records.forEach(record => {
        console.log(record.get('type'), record.get('props'))
    })


}

async function getDocument(doc_id){

    var provDocument = {}
    var prefixes = elements = {}

    // open a session
    const session = driver.session()
    try {
        [prefixes, elements] = await session.executeRead(async tx => {
            // get the prefixes
            const result1 = await tx.run(
                'MATCH (d:Document {id: $doc_id}) RETURN d{.*}',
                { doc_id : doc_id}
            ) 

            // get the elements
            const result2 = await tx.run(
                'UNWIND ["Entity","Activity","Agent"] AS l MATCH (n)-[:IS_CONTAINED_IN*]->(:Document {id: $doc_id}) WHERE l IN labels(n) RETURN toLower(l) as type, collect(n{.*}) as props',
                { doc_id : doc_id}
            )
            
            return [result1.records[0].get(0) , result2.records.map(record => record.toObject())]
        })

    } finally {
        await session.close()
    }

    delete prefixes.id
    
    // check if there are any prefix
    if(Object.keys(prefixes).length !== 0 && prefixes.constructor === Object){
        provDocument.prefix = prefixes
    }

    // loop trough the elements
    elements.forEach(e => {
        provDocument[e.type] = {}

        e.props.forEach(p => {
            let id = p.id
            delete p.id

            provDocument[e.type][id] = p            
        })
    })

    return provDocument
}

async function addDocument(doc_id, doc){

    const docProps = doc.prefix
    docProps.id = doc_id

    // open a session
    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx => {
            // get the prefixes
            const result1 = await tx.run(
                'CREATE (:Document $docProps)',
                { docProps : docProps}
            ) 

            // get the elements
            const result2 = await tx.run(
                'UNWIND ["Entity","Activity","Agent"] AS l MATCH (n)-[:IS_CONTAINED_IN*]->(:Document {id: $doc_id}) WHERE l IN labels(n) RETURN toLower(l) as type, collect(n{.*}) as props',
                { doc_id : doc_id}
            )
            
            return [result1.records[0].get(0) , result2.records.map(record => record.toObject())]
        })

    } finally {
        await session.close()
    }

    delete prefixes.id
    
    // check if there are any prefix
    if(Object.keys(prefixes).length !== 0 && prefixes.constructor === Object){
        provDocument.prefix = prefixes
    }

    // loop trough the elements
    elements.forEach(e => {
        provDocument[e.type] = {}

        e.props.forEach(p => {
            let id = p.id
            delete p.id

            provDocument[e.type][id] = p            
        })
    })

    return provDocument
}





// Create a new document
router.put("/:id", async function(req, res) {
    // get the document id
    const doc_id = req.params.id

    const provDocument = req.body

    const prefix = provDocument.prefix
    const entities = provDocument.entity

    const result = await session.run(
        'CREATE (:Document $node_properties)',
        { node_properties: node_properties }
    )     

    console.log(result)

    res.send("It's working!")

})

// Get a document
router.get("/:docId", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    
    const provDocument = await getDocument(docId)

    //console.log(provDocument)

    res.send(provDocument)
})


module.exports = router;