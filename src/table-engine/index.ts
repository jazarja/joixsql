import { Schema } from '@hapi/joi'
import _ from 'lodash'
import knex, { SchemaBuilder } from 'knex'
import config from '../config'
import { IAnalyze } from './types'
import Element from './element'

import {
    detectAndTriggerSchemaErrors,
    parseSupportedTypes
} from './parse'


export const analyzeSchema = (schema: Schema): IAnalyze => {
    detectAndTriggerSchemaErrors(schema)
    const ret: IAnalyze = {
        primary_key: null,
        foreign_keys: [],
        all_keys: [],
        populate: [],
        refs: [],
        defaults: {},
        groups: {}
    }

    const described = schema.describe().keys
    for (const key in described){
        const elemOrigin = new Element(described[key], key, {} as knex)
        const elem = parseSupportedTypes(schema, elemOrigin).errorScanner()

        ret.all_keys.push(key)

        if (elemOrigin.is().ref()){
            ret.refs.push({
                origin: key,
                dest: elemOrigin.get().ref()
            })
        }
        
        if (elem.is().primaryKey()){
            ret.primary_key = key
        }
        
        if (elem.is().foreignKey()){
            const foreign = elem.get().foreignKey()
            ret.foreign_keys.push({
                key: key,
                table_reference: foreign[0],
                key_reference: foreign[1],
                no_populate: elem.is().noPopulate(),
                group_id: foreign[2],
                required: elem.is().required(),
                delete_cascade: elem.is().deleteCascade(),
                update_cascade: elem.is().updateCascade()
            })
        }

        if (elem.is().populate()){
            const populate = elem.get().populate()
            ret.populate.push({
                key: key,
                table_reference: populate[0],
                key_reference: populate[1],
                group_id: populate[2],
                no_populate: elem.is().noPopulate()

            })
        }

        if (elem.is().defaultValue()){
            let dv = elem.get().defaultValue()
            if (elem.is().date() && dv === 'now'){
                if (elem.is().dateUnix())
                    dv = new Date().getTime() / 1000
                else {
                    dv = new Date()
                    dv.setMilliseconds(0)
                }
            }
            ret.defaults[key] = dv
        }

        if (elem.is().group()){
            for (const e of elem.get().group()){
                if (!(e in ret.groups))
                    ret.groups[e] = [key]
                else 
                    ret.groups[e].push(key)
            }
        }
    }
    return ret
}

const buildTableString = (schema: Schema, tableName: string): string => {
    detectAndTriggerSchemaErrors(schema)
    const described = schema.describe().keys
    
    const columnSTR = {string: `return knex.schema.createTable('${tableName}', function(t) {\n`}

    config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
        for (const key in described){
            const elem = parseSupportedTypes(schema, new Element(described[key], key, config.mysqlConnexion())).errorScanner()

            let col: any
            columnSTR.string += `   t`
            if (elem.is().increment()){
                columnSTR.string += `.increments('${elem.key()}')`
                col = table.increments(elem.key())
            } else {
                col =elem.parse(table, columnSTR)
            }
            elem.addColumnOptions(col, columnSTR)
            columnSTR.string += ';\n'
        }
    }).toString()
    columnSTR.string += `   }
    );`
    return columnSTR.string
}

const buildTable = (schema: Schema, tableName: string): SchemaBuilder => {
    detectAndTriggerSchemaErrors(schema) 
    const described = schema.describe().keys
    
    return config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
        for (const key in described){
            const elem = parseSupportedTypes(schema, new Element(described[key], key, config.mysqlConnexion())).errorScanner()
            
            let col: any
            if (elem.is().increment()){
                col = table.increments(elem.key())
            } else {
                col = elem.parse(table, {string: ''})
            }
            elem.addColumnOptions(col, {string: ''})
        }
    })
}


export default {
    buildTable,
    buildTableString,
    analyzeSchema
}