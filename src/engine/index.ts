import { Schema } from '@hapi/joi'
import _ from 'lodash'
import Element from './element'
import knex, { SchemaBuilder } from 'knex'

import { LIST_SUPPORTED_TYPES } from '../mysql-types'


const MYSQL_CONFIG = {
    host: '',
    user: 'root',
    password: '',
    database: 'acey'
}

const knexCO = knex({
    client: 'mysql', 
    connection: MYSQL_CONFIG
})

const DEFAULT_OPTIONS = {
    table: '',
    onParseError: () => null,
    knex: knexCO
}

interface IOptions {
    table: string
    onParseError: Function,
    knex: knex
}

export default class Engine {
    private _shema: Schema
    private _hasPrimaryKey: boolean = false
    private _options: IOptions = DEFAULT_OPTIONS

    constructor(schema: Schema, options: any){
        this._shema = schema
        this._options = Object.assign({}, this._options, options)
    }

    public resetTemporarys = () => {
        this.resetContainPrimaryKey()
    }

    public getTable = () => this.options().table
    public schema = () => this._shema
    
    public options = () => this._options
    public setOptions = (options: any) => this._options = Object.assign({}, this.options(), options)

    public containPrimaryKey = () => this._hasPrimaryKey
    public setContainPrimaryKey = () => this._hasPrimaryKey = true
    public resetContainPrimaryKey = () => this._hasPrimaryKey = false

    private _parseAndTriggerErrors = (e: Element) => {
        //primary key
        if (e.is().primaryKey()){
            if (this.containPrimaryKey())
                throw new Error("Your schema contain many primary key")
            if (e.is().foreignKey())
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
            this.setContainPrimaryKey()
        }

        if (e.type() === 'string'){
            if (e.is().defaultValue() && !e.is().maxSizeSet()){
                throw new Error("A TEXT can't have a default value, you need to set a column size")
            }
        }

        this.options().onParseError(e)

        //only unix allowed on date format
        if (e.is().dateFormatSet() && !e.is().dateUnix()){
            throw new Error("only unix format is supported")
        }
    }

    public table = (): SchemaBuilder => {
        this.resetTemporarys()
        const described = this.schema().describe().keys

        return knexCO.schema.createTable(this.getTable(), (table: knex.TableBuilder) => {
            for (const key in described){
                const elem = new Element(described[key], key, this.options().knex)
                if (LIST_SUPPORTED_TYPES.indexOf(elem.type()) == -1)
                    throw new Error(`${elem.type()} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  
    
                this._parseAndTriggerErrors(elem)
                elem.addColumnOptions(elem.is().increment() ? table.increments(elem.key()) : elem.parse(table))
            }
        })
    }
}