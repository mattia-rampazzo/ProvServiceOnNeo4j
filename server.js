const express = require("express")
const app = express()

// middleware for JSON body
app.use(express.json());

const neo4j = require('neo4j-driver')

const uri = "bolt://localhost:7687"
const user = "neo4j"
const password = "password"

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))


// map wich assign foreach PROV-DM Relation its binary(subject, object) PROV-DM Types
// Note: every core relation in PROV-DM is binary
// i have to manage all the special cases (Expanded Relations wich are n-ary, reation with optional object)
const mapProvRelTypes= new Map();
mapProvRelTypes.set("wasGeneratedBy",["prov:entity", "prov:activity"])
mapProvRelTypes.set("used",["prov:activity", "prov:entity"])
mapProvRelTypes.set("wasInformedBy",["prov:informed", "prov:informant"])
mapProvRelTypes.set("wasStartedBy",["prov:activity", "prov:trigger"])
mapProvRelTypes.set("wasEndedBy",["prov:activity", "prov:trigger"])
mapProvRelTypes.set("wasInvalidatedBy",["prov:entity", "prov:activity"])
mapProvRelTypes.set("wasDerivedFrom",["prov:generatedEntity", "prov:usedEntity"])
mapProvRelTypes.set("wasAttributedTo",["prov:entity", "prov:agent"])
mapProvRelTypes.set("wasAssociatedWith",["prov:activity", "prov:agent"])
mapProvRelTypes.set("actedOnBehalfOf",["prov:delegate", "prov:responsible"])
mapProvRelTypes.set("wasInfluencedBy",["prov:influencee", "prov:influencer"])
mapProvRelTypes.set("specializationOf",["prov:specificEntity", "prov:generalEntity"])
mapProvRelTypes.set("alternateOf",["prov:alternate1", "prov:alternate2"])
mapProvRelTypes.set("hadMember",["prov:collection", "prov:entity"])


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

function parseBodyReqElement(req, type){
    // get the element
    const element = req.body[type]
    // get the id of the element 
    const elId = Object.getOwnPropertyNames(element)[0]
    // get the props
    const props = element[elId]

    return [elId, props]
}

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

async function addActivity(tx, docId, acId, props){
    
    props.id = acId; // add the id to the properties of the node
    
    return result = await tx.run(
        'MATCH (d:Document {id: $docId}) CREATE (d)<-[:IS_CONTAINED_IN]-(:Activity $props)',
        { docId: docId, props: props }
    )

}

async function addAgent(tx, docId, agId, props){
    
    props.id = agId; // add the id to the properties of the node
    
    return result = await tx.run(
        'MATCH (d:Document {id: $docId}) CREATE (d)<-[:IS_CONTAINED_IN]-(:Agent $props)',
        { docId: docId, props: props }
    )

}

/*
se relazione ha un nome diverso da errore
salva elementi terzi come 
nel caso di oggetto opzionale che fa
query da sistemare
non gestisce errori
forza in questo caso a seguire modello
*/
async function createRelations(doc_id, r_id, attributes, rel_name, session){
    // subject and object of a relation
    var subject = object = ""
    const properties = {}
    // if not a blank node
    if(r_id[0]!="_") properties.id = r_id


    const tmp = mapProvRelTypes.get(rel_name)
    for(const p in attributes){
        if(p==tmp[0]){//subject
            subject = attributes[p]
        }else if(p==tmp[1]){//object
            object = attributes[p]
        }else{
            properties[p] = attributes[p]
        }
    }

    const result = await session.run(
        'MATCH (subject {id: $s_id})-[:IS_CONTAINED_IN*]->(:Document {id: $doc_id}) WITH subject MATCH (object {id: $o_id})-[:IS_CONTAINED_IN*]->(:Document {id: $doc_id}) CREATE (subject)-[:'+ rel_name +' $properties]->(object)',
        { doc_id: doc_id, s_id: subject, o_id: object, properties: properties }
    )     

    console.log(result)
}

// old version
async function createRelationsv0(doc_id, r_id, attributes, rel_name, session){
    
    //estraggo subject and object da attributes
    var subject = object = ""
    const optional = []
    const rel_properties = {}
    //if id starts with _ non lo uso
    if(r_id[0]!="_") rel_properties.id = r_id
    var s = o = false
    for(att in attributes){
        if (att.includes("entity") || att.includes("agent") || att.includes("activity")){
            if(!s){
                subject = attributes[att]
                s=true
            }else if(!o){
                object = attributes[att]
                o=true
            }else{
                optional.push(attributes[att])
            }
        }else{
            rel_properties[att] = attributes[att]
        }
    }
    if(optional.length!=0) rel_properties.optional = optional

    console.log(subject)
    console.log(object)
  
    const result = await session.run(
        'MATCH (s {id: $s_id}), (o {id: $o_id}) CREATE (s)-[:'+ rel_name +' $rel_properties]->(o)',
        { s_id: subject, o_id: object, rel_properties: rel_properties }
    )     

    console.log(result)


}



// Create a new document
app.put("/api/v0/documents/:id", async function(req, res) {
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
app.get("/api/v0/documents/:docId", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    
    const provDocument = await getDocument(docId)

    //console.log(provDocument)

    res.send(provDocument)
})

app.post("/api/v0/documents/:docId/entities/", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    // get the entity id and props
    const [eId, props] = parseBodyReqElement(req, "entity")
    
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

app.post("/api/v0/documents/:docId/activities/", async function(req, res) {
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

app.post("/api/v0/documents/:docId/agents/", async function(req, res) {
    // get the document id
    const docId = req.params.docId
    // get the agent id and props
    const [agId, props] = parseBodyReqElement(req, "agent")
    
    // open a session
    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx => {
        return await addAgent(tx, docId, agId, props)
    })
    
    console.log(result)
        
    } finally {
        await session.close()
    }


    res.send("It's working!")
})

app.post("/api/v0/documents/:did/relations/", async function(req, res) {
    // get the document id
    const doc_id = req.params.did
    // get the relation
    const relation = req.body
    // get the relation name
    const name = Object.getOwnPropertyNames(relation)[0]

    // get the relation id and attributes
    const [r_id, attributes] = parseBody(req, name)
   
    // open a session
    const session = driver.session()
    
    try {
        // create a new agent node
        await createRelations(doc_id, r_id, attributes, name, session)
    } finally {
        await session.close()
    }

    res.send("It's working!")
})

app.listen(3000, () => {
  console.log("app listening on port 3000")
})