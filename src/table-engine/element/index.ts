import _ from 'lodash'
import knex from 'knex'

import Is from './is'
import Get, { IFloatPrecision } from './get'

import { 
    DEFAULT_SQL_TYPES,
    MYSQL_NUMBER_TYPES,
    MYSQL_STRING_TYPES
} from '../mysql/types'

import config from '../../config'

export default class Element {
    private _element: any
    private _is: Is
    private _key: string
    private _get: Get
    private _isFromRefKind: boolean = false

    constructor(element: any, key: string){
        this._element = element
        this._key = key
        this._is = new Is(this)
        this._get = new Get(this)
    }

    public isFromRefKind = () => this._isFromRefKind
    public setAsFromRefKind = () => this._isFromRefKind = true

    public element = () => this._element
    public flags = () => this.element().flags
    public rules = () => this.element().rules
    public type = () => this.element().type
    public allow = () => this.element().allow
    public key = () => this._key

    public is = () => this._is
    public get = () => this._get

    public addColumnOptions = (column: knex.ColumnBuilder, columnSTR: any) => {
     
        if (this.is().unique() && !this.is().primaryKey()){
            column = column.unique()
            columnSTR.string += '.unique()'
        }
        if (this.is().primaryKey()){
            column = column.primary()
            columnSTR.string += '.primary()'
        }
        if (this.is().foreignKey()){
            const [table, key] = this.get().foreignKey()
            column = column.references(key).inTable(table)
            columnSTR.string += `.references('${key}').inTable('${table}')`
        }
        if (this.is().defaultValue()){
            const initialDefaultValue = this.get().defaultValue()
            let defaultValue = initialDefaultValue

            if (this.is().date() && initialDefaultValue === 'now'){
                columnSTR.string += `.defaultTo(${initialDefaultValue === 'now' ? (this.is().dateUnix() ? `knex.fn.now()` : `knex.raw('now()')`) : `'${initialDefaultValue}'`})`
                defaultValue = this.is().dateUnix() ? config.mysqlConnexion().fn.now() : config.mysqlConnexion().raw(`now()`)
            } else {
                columnSTR.string += `.defaultTo('${defaultValue}')`
            }
            column = column.defaultTo(defaultValue)
        }
        if (this.is().required() && !this.is().primaryKey()){
            column = column.notNullable()
            columnSTR.string += `.notNullable()`
        }
        if (this.is().deleteCascade() && this.is().foreignKey()){
            column = column.onDelete('CASCADE')
            columnSTR.string += `.onDelete('CASCADE')`
        }
        if (this.is().updateCascade() && this.is().foreignKey()){
            column = column.onUpdate('CASCADE')
            columnSTR.string += `.onUpdate('CASCADE')`
        }
    }

    public errorScanner = () => {
        //primary key
        if (this.is().primaryKey()){
            if (this.is().foreignKey())
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
        }
    
        if (this.is().string()){
            if (!this.is().enum() && this.is().defaultValue() && !this.is().maxSizeSet()){
                throw new Error("A TEXT can't have a default value, you need to set a column size")
            }
        }
    
        if (this.is().enum() && this.is().defaultValue()){
            const defaultValue = this.get().defaultValue()
            const allows = this.get().allow()
            if (allows.indexOf(defaultValue) == -1){
                throw new Error("Enum's default value can't be different than the values.")
            }
        }
    
        if (this.is().string()){
            const max = this.is().maxSet() ? this.get().max() : this.get().stringLengthByType()
            if ((max > MYSQL_STRING_TYPES[0].max || max == -1) && this.is().unique()){
                throw new Error("The maximum length of a string with a UNIQUE options should be defined. The maximum size is 65535")                
            }
        }
    
        if (this.is().defaultValue() && this.is().date()){
            const defaultValue = this.get().defaultValue()
            if (!this.is().dateUnix()){
                if (defaultValue != 'now'){
                    throw new Error(`Default on non-unix date can only be 'now' in this version. key:${this.key()}`)
                }
            }
        }
    
        //only unix allowed on date format
        if (this.is().dateFormatSet() && !this.is().dateUnix()){
            throw new Error("only unix format is supported")
        }
        return this
    }


    public parse = (column: knex.TableBuilder, columnSTR: any): knex.ColumnBuilder => {
        const typeParses: any = {
            number: this.parseNumber,
            string: this.parseString,
            date: this.parseDate,
            boolean: this.parseBoolean,
        }
        return typeParses[this.type()](column, columnSTR)
    }

    public parseBoolean = (column: knex.TableBuilder, columnSTR: any): knex.ColumnBuilder => {
        columnSTR.string += `.boolean('${this.key()}')`
        return column.boolean(this.key())
    }

    public parseDate = (column: knex.TableBuilder, columnSTR: any): knex.ColumnBuilder => {
        if (this.is().dateUnix()){
            columnSTR.string += `.timestamp('${this.key()}')`
            return column.timestamp(this.key())
        }
        columnSTR.string += `.dateTime('${this.key()}')`
        return column.dateTime(this.key())
    }

    public parseNumber = (column: knex.TableBuilder, columnSTR: any): knex.ColumnBuilder => {

        if (this.is().float()){
            const floatPrecision = this.get().floatPrecision() as IFloatPrecision
            columnSTR.string += `.float('${this.key()}', ${floatPrecision.precision}, ${floatPrecision.scale})`
            return column.float(this.key(), floatPrecision.precision, floatPrecision.scale)
        }
        if (this.is().double()){
            columnSTR.string += `.specificType('${this.key()}', 'DOUBLE${this.is().strictlyPositive() ? ' UNSIGNED' :''}')`
            return column.specificType(this.key(),`DOUBLE${this.is().strictlyPositive() ? ' UNSIGNED' :''}`)
        }
        if (this.is().portSet()){
            columnSTR.string += `.integer('${this.key()}').unsigned()`
            return column.integer(this.key()).unsigned()
        }

        let minimum: any, maximum: any;
        let type = _.find(DEFAULT_SQL_TYPES, {key: 'number'}).type

        minimum = this.get().greater() || minimum
        maximum = this.get().less() || maximum
        maximum = this.get().max() || maximum
        minimum = this.get().min() || minimum

        if (minimum == undefined)
            minimum = this.is().strictlyPositive() ? 0 : _.find(MYSQL_NUMBER_TYPES, {type: 'int'}).min
        if (maximum == undefined)
            maximum = _.find(MYSQL_NUMBER_TYPES, {type: 'int'}).max

        const isUnsigned = minimum >= 0 
        const isMinBiggest = (Math.max(Math.abs(minimum), Math.abs(maximum)) * -1 === minimum)
        const e = _.find(MYSQL_NUMBER_TYPES, (o) => isMinBiggest ? minimum >= o.min : maximum <= o.max)
        if (!e)
            type = `DOUBLE${isUnsigned ? ` unsigned`: ''}`
        else 
            type = `${e.type}${isUnsigned ? ` unsigned` : ''}`
        columnSTR.string += `.specificType('${this.key()}', '${type}')`
        return column.specificType(this.key(), type)
    }

    public parseString = (column: knex.TableBuilder, columnSTR: any): knex.ColumnBuilder => {

        if (this.is().enum()){
            columnSTR.string += `.enum('${this.key()}', [${this.allow().map((v: string) => `'${v}'`).join(',')}])`    
            return column.enum(this.key(), this.allow())
        }
        
        else if (this.is().maxSet()){
            const max = this.get().max()
            if (max <= MYSQL_STRING_TYPES[0].max){
                columnSTR.string += `.string('${this.key()}', ${max})`
                return column.string(this.key(), max)
            } else {
                columnSTR.string += `.text('${this.key()}', ${max > MYSQL_STRING_TYPES[1].max ? `'longtext'` : `'mediumtext'`})`
                return column.text(this.key(), max > MYSQL_STRING_TYPES[1].max ? `'longtext'` : `'mediumtext'`)
            }
        } 

        else {
            const max = this.get().stringLengthByType()
            if (max > MYSQL_STRING_TYPES[0].max || max == -1){
                if (max === -1){
                    columnSTR.string += `.text('${this.key()}')`
                    return column.text(this.key())
                } else {
                    columnSTR.string += `.text('${this.key()}', ${max > MYSQL_STRING_TYPES[1].max ? `'longtext'` : `'mediumtext'`})`
                    return column.text(this.key(), max > MYSQL_STRING_TYPES[1].max ? `'longtext'` : `'mediumtext'`)
                }
            }
            else {
                columnSTR.string += `.string('${this.key()}', ${max})`
                return column.string(this.key(), max)
            }
        }
    }

}