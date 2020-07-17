import { Schema } from '@hapi/joi'
import _ from 'lodash'
import config from '../config'
import Element from './element'

import { LIST_SUPPORTED_TYPES } from './mysql/types'

export const detectAndTriggerSchemaErrors = (schema: Schema) => {
    const described = schema.describe().keys
    
    let countPrimary = 0
    for (const key in described){
        const elem = parseSupportedTypes(schema, new Element(described[key], key, config.mysqlConnexion()))    
        if (elem.is().primaryKey())
            countPrimary++
    }
    if (countPrimary > 1)
        throw new Error("Your schema contain many primary keys")
}

export const parseSupportedTypes = (schema: Schema, elem: Element): Element => {
    const key = elem.key()

    if (elem.is().ref()){
        const ref = elem.get().ref()
        const newElemObject = schema.describe().keys[ref]
        return new Element(newElemObject, key, config.mysqlConnexion())
    }

    if (LIST_SUPPORTED_TYPES.indexOf(elem.type()) == -1){
        throw new Error(`${elem.type()} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  
    }
    
    return elem
}