import { Schema } from '@hapi/joi'
import _ from 'lodash'
import knex, { SchemaBuilder } from 'knex'
import { config } from '../../index'
import { IAnalyze, IForeign } from './types'
import Element from './element'
import { Color } from '../migration-engine/managers/utils'
import {
    detectAndTriggerSchemaErrors,
    parseSupportedTypes
} from './parse'
import { IModel } from '../ecosystem'
import { MigrationManager } from '../..'


const analyzeSchema = (schema: Schema): IAnalyze => {
    detectAndTriggerSchemaErrors(schema, 'empty')
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
        const elemOrigin = new Element(described[key], key)
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
    detectAndTriggerSchemaErrors(schema, tableName)
    const described = schema.describe().keys
    
    const columnSTR = {string: `return knex.schema.createTable('${tableName}', function(t) {\n`}

    config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
        for (const key in described){
            const elem = parseSupportedTypes(schema, new Element(described[key], key)).errorScanner()

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
    detectAndTriggerSchemaErrors(schema, tableName) 
    const described = schema.describe().keys
    
    return config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
        for (const key in described){
            const elem = parseSupportedTypes(schema, new Element(described[key], key)).errorScanner()
            
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

export const buildAllFromEcosystem = async () => {
    const created: IModel[] = []
    const ecosystem = config.ecosystem()
    if (!ecosystem)
        throw new Error("No ecosystem set")

    const log = (...v: any) => config.isLogEnabled() && console.log(...v)

    const getMessage = () => {
        const olds: string[] = []
        const news: string[] = []

        for (let schema of ecosystem.list()){
            const tName = schema.tableName
            MigrationManager.schema().lastFilename(tName) === null ? news.push(tName) : olds.push(tName)
        }
        let msg = ''
        if (news.length > 0){
            msg += `${Color.Reset}${Color.FgGreen}+++${Color.Reset} We detected ${Color.FgWhite}MySQL table(s) add. ${Color.Reset}${Color.FgGreen}+++${Color.Reset}\n\n\n`
            if (olds.length > 0) msg += `${Color.FgWhite}Existing${Color.Reset} table${olds.length > 1 ? 's' : ''}:\n\n`
            for (const old of olds)
                msg += `    - ${Color.FgWhite}${old}${Color.Reset}\n`
            msg += `${olds.length > 0 ? `\n\n` : ``}${Color.FgGreen}New${Color.Reset} table${news.length > 1 ? 's' : ''}:\n\n`
            for (const n of news)
                msg += `    - ${Color.FgGreen}${n}${Color.Reset}\n`
            msg += '\n\n'
        }
        return {news, msg}
    }

    const buildAll = async () => {
        try {
            const res = await config.mysqlConnexion().transaction(async (trx: knex.Transaction) => {
                const queries = sortTableToCreate().map((tName: string) => {
                    const isCreated = MigrationManager.schema().lastFilename(tName) != null 
                    if (!isCreated){
                        const ecosystemModel = ecosystem.getModel(tName) as IModel
                        created.push(ecosystemModel)
                        return buildTable(ecosystemModel.schema, ecosystemModel.tableName)
                    }
                })
                return Promise.all(queries).then(trx.commit).catch(trx.rollback)
            })
            for (let m of created)
                MigrationManager.schema().create(m)
            return res
        } catch (e){
            throw new Error(e)
        }
    }

    try {
        const startTime = new Date().getTime()
        const {news, msg} = getMessage()
        if (news.length > 0){
            log('\n-------------------------------------------\n')
            log(msg)
            await buildAll()
            for (const n of news){
                const ecoModel = ecosystem.getModel(n) as IModel
                MigrationManager.schema().create(ecoModel)
            }
            log(`Table${news.length > 1 ? 's' : ''} creation ${Color.FgGreen}succeed${Color.Reset} in ${ ((new Date().getTime() - startTime) / 1000).toFixed(3)} seconds. ✅`)
            log('\n-------------------------------------------\n')
        }
    } catch (e){
        throw new Error(e)
    }
}


const dropAllFromEcosystem = async () => {
    const ecosystem = config.ecosystem()
    if (!ecosystem){
        throw new Error("No ecosystem set")
    }
    
    const deleteAll = async () => {
        const deleted: IModel[] = []
        try {
            await config.mysqlConnexion().raw(`SET FOREIGN_KEY_CHECKS=0;`)
            const res = await config.mysqlConnexion().transaction(async (trx: knex.Transaction) => {
                const queries = sortTableToCreate().map((tName: string) => {
                    const isCreated = MigrationManager.schema().lastFilename(tName) != null 
                    if (isCreated){
                        deleted.push(ecosystem.getModel(tName) as IModel)
                        return config.mysqlConnexion().schema.dropTableIfExists(tName)
                    }
                })
                return Promise.all(queries).then(trx.commit).catch(trx.rollback)
            })        
            for (let m of deleted)
                MigrationManager.removeAllHistory(m.tableName)
            return res
        } catch (e){
            throw new Error(e)
        } finally {
            await config.mysqlConnexion().raw(`SET FOREIGN_KEY_CHECKS=1;`)
        }
    }

    await deleteAll()
}

const sortTableToCreate = () => {
    const ecosystem = config.ecosystem()
    if (!ecosystem){
        return []
    }
    const schemaList = ecosystem.list()
    let tablesToCreate = []
    let tablesWithFK = []

    const toArrayTableRef = (list: IForeign[]): string[] => list.map((e) => e.required ? e.table_reference : '').filter((e) => e != '')

    for (let schema of schemaList){
        const tName = schema.tableName
        const foreignKeys = ecosystem.schema(schema).getForeignKeys()
        if (foreignKeys.length == 0 || _.every(foreignKeys, {required: false})) 
            tablesToCreate.push(tName)
        else 
            tablesWithFK.push(tName)
    }

    let i = 0;
    while (i < tablesWithFK.length){
        const schema = ecosystem.getModel(tablesWithFK[i]) as IModel
        const listKeys = toArrayTableRef(ecosystem.schema(schema).getForeignKeys())
        let count = 0
        for (const key of listKeys)
            tablesToCreate.indexOf(key) != -1 && count++
        
        if (count === listKeys.length){
            tablesToCreate.push(tablesWithFK[i])
            tablesWithFK.splice(i, 1)
            i = 0;
        } else {
            i++
        }
    }

    if (tablesWithFK.length > 0)
        throw new Error(`Table${tablesWithFK.length > 1 ? 's' : ''}: ${tablesWithFK.join(', ')} not created because of crossed foreign keys`)
    
    return tablesToCreate
}


export default {
    buildTable,
    buildTableString,
    analyzeSchema,
    buildAllFromEcosystem,
    dropAllFromEcosystem
}
