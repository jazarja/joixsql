import _ from 'lodash'
import knex from 'knex'

import Is from './is'
import Get from './get'

import { 
    DEFAULT_SQL_TYPES,
    MYSQL_NUMBER_TYPES,
    MYSQL_STRING_TYPES
} from '../mysql-types'

export default class Element {
    private _element: any
    private _is: Is
    private _key: string
    private _get: Get
    private _knexCO: knex

    constructor(element: any, key: string, knexCO: knex){
        this._element = element
        this._key = key
        this._knexCO = knexCO
        this._is = new Is(this)
        this._get = new Get(this)
    }

    public element = () => this._element
    public flags = () => this.element().flags
    public rules = () => this.element().rules
    public type = () => this.element().type
    public allow = () => this.element().allow
    public key = () => this._key

    public is = () => this._is
    public get = () => this._get
    public knex = (): knex => this._knexCO

    public addColumnOptions = (column: knex.ColumnBuilder) => {
     
        if (this.is().unique()){
            column = column.unique()
        }
        if (this.is().primaryKey()){
            column = column.primary()
        }
        if (this.is().foreignKey()){
            const [table, key] = this.get().foreignKey()
            column = column.references(key).inTable(table)
        }
        if (this.is().defaultValue()){
            let defaultValue = this.get().defaultValue()
            if (this.is().date() && defaultValue === 'now'){
                defaultValue = this.is().dateUnix() ? this.knex().fn.now() : this.knex().raw(`now()`)
            }
            column = column.defaultTo(defaultValue)
        }
        if (this.is().required()){
            column = column.notNullable()
        }
        if (this.is().deleteCascade()){
            column = column.onDelete('CASCADE')
        }
        if (this.is().updateCascade()){
            column = column.onUpdate('CASCADE')
        }
    }

    public parse = (table: knex.TableBuilder): knex.ColumnBuilder => {
        const typeParses: any = {
            number: this.parseNumber,
            string: this.parseString,
            date: this.parseDate,
            boolean: () => table.boolean(this.key()),
        }
        return typeParses[this.type()](table)
    }

    public parseDate = (table: knex.TableBuilder): knex.ColumnBuilder => {
        if (this.is().dateUnix()){
            return table.timestamp(this.key())
        }
        return table.dateTime(this.key())
    }

    public parseNumber = (table: knex.TableBuilder): knex.ColumnBuilder => {

        if (this.is().float() || this.is().precisionSet())
            return table.float(this.key(), this.get().precision())
        if (this.is().double())
            return table.specificType(this.key(),`DOUBLE${this.is().strictlyPositive() ? ' UNSIGNED' :''}`)
        if (this.is().portSet()){
            return table.integer(this.key()).unsigned()
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
            type = `double${isUnsigned ? ` unsigned`: ''}`
        else 
            type = `${e.type}${isUnsigned ? ` unsigned` : ''}`
        return table.specificType(this.key(), type)
    }

    public parseString = (table: knex.TableBuilder): knex.ColumnBuilder => {

        if (this.is().enum())
            return table.enum(this.key(), this.allow())


        else if (this.is().maxSet()){
            const max = this.get().max()
            if (max <= MYSQL_STRING_TYPES[0].max)
                return table.string(this.key(), max)
            else 
                return table.text(this.key(), max > MYSQL_STRING_TYPES[1].max ? 'longtext' : 'mediumtext')
        } 

        else {
            const max = this.get().stringLengthByType()
            if (max > MYSQL_STRING_TYPES[0].max || max == -1)
                return table.text(this.key(), max == -1 ? 'text' : (max > MYSQL_STRING_TYPES[1].max ? 'longtext' : 'mediumtext'))
            else 
                return table.string(this.key(), max)
        }
    }
}