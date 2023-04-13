const express = require('express')
const router = express.Router({ mergeParams: true }) //{ mergeParams: true } to access params in the route of app.js

const neo4j = require('neo4j-driver')

const uri = "bolt://localhost:7687"
const user = "neo4j"
const password = "password"

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

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

router.post("/", async function(req, res) {
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

module.exports = router;