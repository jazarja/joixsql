import _ from 'lodash'
import knex from 'knex'
import { config } from '../../../index'

import Is from './is'
import Get, { IFloatPrecision } from './get'
import { toValidMySQLDateString, isValidDefaultValueFunction } from './utils'

import { 
    DEFAULT_SQL_TYPES,
    MYSQL_NUMBER_TYPES,
    MYSQL_STRING_TYPES
} from '../mysql/types'

import errors from '../errors'

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
        if (this.is().isSQLDefaultValue()){
            const initialDefaultValue = this.get().defaultValue()
            let defaultValue = initialDefaultValue

            if (this.is().date() && initialDefaultValue === 'now'){
                columnSTR.string += `.defaultTo(${initialDefaultValue === 'now' ? (this.is().dateUnix() ? `knex.fn.now()` : `knex.raw('now()')`) : `'${initialDefaultValue}'`})`
                defaultValue = this.is().dateUnix() ? config.mysqlConnexion().fn.now() : config.mysqlConnexion().raw(`now()`)
                column = column.defaultTo(defaultValue)
            } else if (this.is().date() && initialDefaultValue !== 'now' ){
                defaultValue = column.defaultTo(toValidMySQLDateString(new Date(defaultValue)))
                columnSTR.string += `.defaultTo('${defaultValue}')`
            } else {
                columnSTR.string += `.defaultTo('${defaultValue}')`
                column = column.defaultTo(defaultValue)
            }
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

    public defaultValueErrorScanner = () => {
        if (this.is().defaultValue()){
            let defaultValue = this.get().defaultValue()
            let dvType = typeof defaultValue
            
            const isPureDefaultValueForbidden = () => dvType !== 'boolean' && dvType !== 'string' && dvType != 'number' && !(defaultValue instanceof Date)
            
            if (isPureDefaultValueForbidden()){
                const err = isValidDefaultValueFunction(defaultValue)
                if (err)
                    throw err
                defaultValue = defaultValue()
                dvType = typeof defaultValue
                if (isPureDefaultValueForbidden())
                    throw errors.elementTypeUnsupported(this.key())
            }

            if (this.is().enum()){
                const allows = this.get().allow()

                if (allows.indexOf(defaultValue) == -1)
                    throw errors.enumHasWrongValue(this.key())

                for (const e of allows){
                    if ((this.is().number() && typeof e !== 'number') || 
                        (this.is().string() && typeof e !== 'string') || 
                        (this.is().dateFormatSet() && typeof e !== 'string' && !(e instanceof Date))){
                        throw errors.enumHasWrongType(this.key())
                    }
                }

            } else {
                if ((this.is().string() && dvType !== 'string') ||
                    (this.is().number() && dvType !== 'number') ||
                    (this.is().date() && dvType !== 'string' && !(defaultValue instanceof Date))){
                    throw errors.defaultValueHasWrongType(this.key())
                }
            }

            if (this.is().string()){
                const max = this.get().max() || this.get().stringLengthByType()
                if (max == -1)
                    throw errors.noMaxSetOnString(this.key())
                if (max < defaultValue.length)
                    throw errors.stringDefaultValueOversized(this.key())
            }
    
            if (this.is().number()){
                const v = this.get().numberValueAndType()
                if (!v)
                    throw errors.internalErrorWithDefaultValueAsNumber(this.key())
                if (v.maximum > defaultValue)
                    throw errors.defaultValueIsGreaterThanMaxType(this.key(), v.type)
                if (v.minimum < defaultValue)
                    throw errors.defaultValueIsLessThanMinType(this.key(), v.type)
            }
        }
    }

    public errorScanner = () => {
        //primary key
        if (this.is().primaryKey()){
            if (this.is().foreignKey())
                throw errors.primaryKeyIsForeign(this.key())
            if (this.is().unique())
                throw errors.primaryKeyIsUnique(this.key())
        }
    
        if (this.is().string()){
            if (!this.is().enum() && this.is().defaultValue() && !this.is().maxSizeSet())
                throw errors.textDefaultValueForbidden(this.key())

            const max = this.is().maxSet() ? this.get().max() : this.get().stringLengthByType()
            if ((max > MYSQL_STRING_TYPES[0].max || max == -1) && this.is().unique()){
                throw errors.uniqueStringShouldHaveAMaxLengthSet(this.key())
            }
        }

        if (this.is().dateUnix() || this.is().dateFormatSet())
            throw errors.timestampIsUnsupported(this.key())
        
        // //only unix allowed on date format
        // if (this.is().dateFormatSet() && !this.is().dateUnix()){
        //     throw new Error("only unix format is supported")
        // }

        this.defaultValueErrorScanner()
    
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