import { Schema } from '@hapi/joi'
import _ from 'lodash'
import knex, { SchemaBuilder } from 'knex'
import { IAnalyze } from './types'

import Element from './element'
import Options from './options'

import { 
    LIST_SUPPORTED_TYPES,
    MYSQL_STRING_TYPES
} from '../mysql-types'

export default class Engine {
    private _shema: Schema
    private _hasPrimaryKey: boolean = false
    private _options: Options;
    private _connection: knex

    constructor(schema: Schema, options: any){
        this._shema = schema
        this._options = new Options(options)

        this._connection = knex({
            client: 'mysql',
            connection: this.options().mysqlConfig()
        })
    }

    private _resetTemporarys = () => {
        this.resetContainPrimaryKey()
    }

    public mysql = () => this._connection
    public options = () => this._options
    public schema = () => this._shema
    
    public setOptions = (options: any) => this._options = Object.assign({}, this.options(), options)

    public containPrimaryKey = () => this._hasPrimaryKey
    public setContainPrimaryKey = () => this._hasPrimaryKey = true
    public resetContainPrimaryKey = () => this._hasPrimaryKey = false


    private _parseAndTriggerErrors = (e: Element) => {
        //primary key
        if (e.is().primaryKey()){
            if (this.containPrimaryKey())
                throw new Error("Your schema contain many primary keys")
            if (e.is().foreignKey())
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
            this.setContainPrimaryKey()
        }

        if (e.is().string()){
            if (!e.is().enum() && e.is().defaultValue() && !e.is().maxSizeSet()){
                throw new Error("A TEXT can't have a default value, you need to set a column size")
            }
        }

        if (e.is().enum() && e.is().primaryKey()){
            throw new Error("Enum can't be a primary key")
        }

        if (e.is().string()){
            const max = e.is().maxSet() ? e.get().max() : e.get().stringLengthByType()
            if ((max > MYSQL_STRING_TYPES[0].max || max == -1) && e.is().unique()){
                throw new Error("The maximum length of a string with a UNIQUE options should be defined. The maximum size is 65535")                
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
            refs: [],
            defaults: {},
            groups: {}
        }

        const described = this.schema().describe().keys
        for (const key in described){
            const elemOrigin = new Element(described[key], key, {} as knex)
            const elem = this._parseSupportedAnys(elemOrigin)            
            this._parseAndTriggerErrors(elem)

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
                    group_id: foreign[2],
                    delete_cascade: elem.is().deleteCascade(),
                    update_cascade: elem.is().updateCascade()
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
            return new Element(newElemObject, key, this.mysql())
        }

        if (LIST_SUPPORTED_TYPES.indexOf(elem.type()) == -1){
            throw new Error(`${elem.type()} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  
        }
        
        return elem
    }

    public table = (tableName: string): SchemaBuilder => {
        this._resetTemporarys()
        const described = this.schema().describe().keys

        return this.mysql().schema.createTable(tableName, (table: knex.TableBuilder) => {
            for (const key in described){
                const elem = this._parseSupportedAnys(new Element(described[key], key, this.mysql()))    
                this._parseAndTriggerErrors(elem)
                elem.addColumnOptions(elem.is().increment() ? table.increments(elem.key()) : elem.parse(table))
            }
        })
    }
}