import { Schema } from '@hapi/joi'
import _ from 'lodash'
import knex, { SchemaBuilder } from 'knex'
import config from '../config'

import { IAnalyze } from './types'

import Element from './element'
import Options from './options'


import { 
    LIST_SUPPORTED_TYPES,
    MYSQL_STRING_TYPES
} from '../mysql-types'

export default class TableMakerEngine {
    private _shema: Schema
    private _hasPrimaryKey: boolean = false
    private _options: Options;

    constructor(schema: Schema, ...options: any){
        this._shema = schema
        this._options = new Options(Object.assign({}, ...options))
    }

    private _resetTemporarys = () => {
        this._resetContainPrimaryKey()
    }

    private _containPrimaryKey = () => this._hasPrimaryKey
    private _setContainPrimaryKey = () => this._hasPrimaryKey = true
    private _resetContainPrimaryKey = () => this._hasPrimaryKey = false

    public options = () => this._options
    public schema = () => this._shema
    
    public setOptions = (options: any) => this._options = Object.assign({}, this.options(), options)


    private _parseAndTriggerErrors = (e: Element) => {
        //primary key
        if (e.is().primaryKey()){
            if (this._containPrimaryKey())
                throw new Error("Your schema contain many primary keys")
            if (e.is().foreignKey())
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
            this._setContainPrimaryKey()
        }

        if (e.is().string()){
            if (!e.is().enum() && e.is().defaultValue() && !e.is().maxSizeSet()){
                throw new Error("A TEXT can't have a default value, you need to set a column size")
            }
        }

        
        if (e.is().enum() && e.is().defaultValue()){
            const defaultValue = e.get().defaultValue()
            const allows = e.get().allow()
            if (allows.indexOf(defaultValue) == -1){
                throw new Error("Enum's default value can't be different than the values.")
            }
        }

        if (e.is().string()){
            const max = e.is().maxSet() ? e.get().max() : e.get().stringLengthByType()
            if ((max > MYSQL_STRING_TYPES[0].max || max == -1) && e.is().unique()){
                throw new Error("The maximum length of a string with a UNIQUE options should be defined. The maximum size is 65535")                
            }
        }

        if (e.is().defaultValue() && e.is().date()){
            const defaultValue = e.get().defaultValue()
            if (!e.is().dateUnix()){
                if (defaultValue != 'now'){
                    throw new Error(`Default on non-unix date can only be 'now' in this version. key:${e.key()}`)
                }
            }
        }

        this.options().onParseError(e)

        //only unix allowed on date format
        if (e.is().dateFormatSet() && !e.is().dateUnix()){
            throw new Error("only unix format is supported")
        }
    }

    public analyze = (): IAnalyze => {
        const ret: IAnalyze = {
            primary_key: null,
            foreign_keys: [],
            all_keys: [],
            populate: [],
            refs: [],
            defaults: {},
            groups: {}
        }

        const described = this.schema().describe().keys
        for (const key in described){
            const elemOrigin = new Element(described[key], key, {} as knex)
            const elem = this._parseSupportedAnys(elemOrigin)            
            this._parseAndTriggerErrors(elem)

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

    private _parseSupportedAnys = (elem: Element): Element => {
        const key = elem.key()

        if (elem.is().ref()){
            const ref = elem.get().ref()
            const newElemObject = this.schema().describe().keys[ref]
            return new Element(newElemObject, key, config.mysqlConnexion())
        }

        if (LIST_SUPPORTED_TYPES.indexOf(elem.type()) == -1){
            throw new Error(`${elem.type()} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  
        }
        
        return elem
    }

    public tableString = (tableName: string): string => {
        this._resetTemporarys()
        const described = this.schema().describe().keys
        
        const columnSTR = {string: `return knex.schema.createTable('${tableName}', function(t) {\n`}

        config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
            for (const key in described){
                const elem = this._parseSupportedAnys(new Element(described[key], key, config.mysqlConnexion()))    
                this._parseAndTriggerErrors(elem)
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

    public table = (tableName: string): SchemaBuilder => {
        this._resetTemporarys()
        const described = this.schema().describe().keys
        
        return config.mysqlConnexion().schema.createTable(tableName, (table: knex.TableBuilder) => {
            for (const key in described){
                const elem = this._parseSupportedAnys(new Element(described[key], key, config.mysqlConnexion()))    
                this._parseAndTriggerErrors(elem)
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
}