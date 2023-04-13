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



function parseBodyReqElement(req, type){
    // get the element
    const element = req.body[type]
    // get the id of the element 
    const elId = Object.getOwnPropertyNames(element)[0]
    // get the props
    const props = element[elId]

    return [elId, props]
}

