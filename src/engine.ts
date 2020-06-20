import { Schema } from '@hapi/joi'
import _ from 'lodash'

import { 
    LIST_SUPPORTED_TYPES,
    DEFAULT_SQL_TYPES,
    MYSQL_NUMBER_TYPES,
    MYSQL_STRING_TYPES
} from './mysql-types'

const DEFAULT_OPTIONS = {
    table: '',
    onParseError: () => null
}

interface IOptions {
    table: string
    onParseError: Function
}

export default class Engine {
    private _shema: Schema
    private _hasPrimaryKey: boolean = false
    private _options: IOptions = DEFAULT_OPTIONS

    constructor(schema: Schema, options: any){
        this._shema = schema
        this._options = Object.assign({}, this._options, options)
    }

    public schema = () => this._shema
    public containPrimaryKey = () => this._hasPrimaryKey
    public options = () => this._options

    public setOptions = (options: any) => this._options = Object.assign({}, this.options(), options)
    public setSontainPrimaryKey = () => this._hasPrimaryKey = true

    public formatQuerySuffix = (element: any) => {
        const o: any = this.getQuerySuffix(element)
        let ret = ``
        for (let key in o)
            ret += o[key]
        return ret
    }

    public getQuerySuffix = (element: any) => {
        const { type, flags } = element
        return {
            defaultValue: this._defaultValueQuerySuffix(type, flags),
            notNull: `${this.IsRequired(flags) ? ' NOT NULL' : ''}`,
            unique: `${this.IsUnique(flags) ? ' UNIQUE' : ''}`,
            autoIncrement: `${this.IsAutoIncrement(flags) ? ' AUTO_INCREMENT' : ''}`,
            primaryKey: `${this.IsPrimaryKey(flags) ? ' PRIMARY KEY' : ''}`,
            foreignKey: this._getForeignKeyQuerySuffix(flags)
        }
    }

    private _defaultValueQuerySuffix = (type: any, flags: any) => {
        let defaultValue = this.getDefaultValue(flags)
        if (defaultValue === undefined || defaultValue === null)
            return ''

        let ret = ` DEFAULT `
        defaultValue = typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue

        if (type === 'date'){
            ret += (defaultValue === `'now'` ? (this.IsUnixDateFormat(flags) ? 'CURRENT_TIMESTAMP' : 'now()') : defaultValue)
        } else {
            ret += defaultValue            
        }
        return ret
    }

    private _getForeignKeyQuerySuffix = (flags: any) => {
        const values = this.GetForeignKey(flags)
        if (!values)
            return ''
        const [table, key] = values
        return ` REFERENCES ${table}(${key})` + `${this.IsDeleteCascade(flags) ? ' ON DELETE CASCADE' : ''}` + `${this.IsUpdateCascade(flags) ? ' ON UPDATE CASCADE' : ''}`
    }

    getDefaultValue = (flags: any) => flags && `default` in flags ? flags.default : undefined
    IsInsensitive = (flags: any) => flags && flags.insensitive || false
    IsRequired = (flags: any) => flags && flags.presence === 'required' || false
    IsUnique = (flags: any) => flags && flags.unique === true || false
    IsAutoIncrement = (flags: any) => flags && flags.auto_increment === true || false
    IsPrimaryKey = (flags: any) => flags && flags.primary_key === true || false
    GetForeignKey = (flags: any) => flags && Array.isArray(flags.foreign_key) ? flags.foreign_key : null
    IsDeleteCascade = (flags: any) => this.GetForeignKey(flags) && flags && flags.delete_cascade
    IsUpdateCascade = (flags: any) => this.GetForeignKey(flags) && flags && flags.update_cascade
    IsFloat = (flags: any) => flags && flags.float === true || false
    IsDouble = (flags: any) => flags && flags.double === true || false
    IsDateFormatSet = (flags: any) => flags && flags.format ? true : false
    IsUnixDateFormat = (flags: any) => flags && flags.format && flags.format === 'unix'
    IsStrictlyPositive = (rules: any) => {
        const isNegative = _.find(rules, {name: 'negative'})
        const isPositive = _.find(rules, {name: 'positive'})
        const isSign = _.find(rules, {name: 'sign'})

        if (isNegative)
            return false
        if (isPositive)
            return true
        if (isSign)
            return isSign.args.sign === 'positive'
        return false
    }


    private _parseAndTriggerErrors = (element: any) => {
        const { flags } = element

        //primary key
        if (this.IsPrimaryKey(flags)){
            if (this.containPrimaryKey())
                throw new Error("Your schema contain many primary key")
            if (this.GetForeignKey(flags)){
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
            }
            this.setSontainPrimaryKey()
        }

        this.options().onParseError(element)

        //only unix allowed on date format
        if (flags && flags.format === 'javascript'){
            throw new Error("only unix format is supported")
        }
    }

    private _parseDate = (element: any) => {
        if (this.IsUnixDateFormat(element.flags))
            return `TIMESTAMP`
        return `DATETIME` 
    }

    private _parseString = (element: any) => {
        const { flags, rules, allow } = element

        //get the max length property
        const f = _.find(rules, {name: 'max'})
        //get default type
        let type = _.find(DEFAULT_SQL_TYPES, {key: 'string'}).type

        //if this is an ENUM
        if (allow){
            if (this.IsPrimaryKey(flags)){
                throw new Error("Enum can't be a primary key")
            }
            type = `ENUM(${allow.map((e: string) => `'${e}'`)})`        
        }
        //if thee max length is enabled 
        else if (f){
            const length = f.args.limit
            const isInsensitive = this.IsInsensitive(flags)
            if (length <= 255)
                type = `VARCHAR(${length})${isInsensitive ? '' : ' BINARY'}`
            else {
                const e = _.find(MYSQL_STRING_TYPES, (o) => length < o.max)
                if (!isInsensitive)
                    type = e.type.replace('TEXT', 'BLOB')
                else
                    type = e.type
            }
        //if the max length is not enabled
        } else {
            if (_.find(rules, o => o.name === 'creditCard' || o.name === 'ip' || o.name === 'isoDate' || o.name === 'isoDuration'))
                type = `VARCHAR(32)`
            if (_.find(rules, {name: 'guid'}))
                type = `VARCHAR(70)`
            if (_.find(rules, o => o.name === 'email' || o.name === 'domain' || o.name === 'hostname' || o.name === 'ipVersion'))
                type = `VARCHAR(255) BINARY`               
            if (_.find(rules, o => o.name === 'dataUri' || o.name === 'uri' || o.name === 'uriCustomScheme' || o.name === "uriRelativeOnly"))
                type = `BLOB`
        }
        return type
    }

    private _parseNumber = (element: any) => {
        const { flags, rules } = element
        const isPrecision = _.find(rules, {name: 'precision'})
        const isPort = _.find(rules, {name: 'port'})

        if (this.IsFloat(flags) || (isPrecision && isPrecision.args.limit !== 0))
            return `FLOAT${this.IsStrictlyPositive(rules) ? ' UNSIGNED' :''}`
        if (this.IsDouble(flags))
            return `DOUBLE${this.IsStrictlyPositive(rules) ? ' UNSIGNED' :''}`
        if (isPort){
            return `SMALLINT UNSIGNED`
        }

        let minimum: any, maximum: any;
        let type = _.find(DEFAULT_SQL_TYPES, {key: 'number'}).type

        const max = _.find(rules, {name: 'max'})
        const min = _.find(rules, {name: 'min'})
        const greater = _.find(rules, {name: 'greater'})
        const less = _.find(rules, {name: 'less'})

        if (max)
            maximum = max.args.limit
        if (min)
            minimum = min.args.limit
        if (greater)
            minimum = typeof minimum === 'number' ? Math.min(minimum, greater.args.limit) : greater.args.limit
        if (less)
            maximum = typeof maximum === 'number' ? Math.max(maximum, less.args.limit) : less.args.limit

        if (minimum == undefined)
            minimum = this.IsStrictlyPositive(rules) ? 0 : -2147483648
        if (maximum == undefined)
            maximum = 2147483647

        const isUnsigned = minimum >= 0 
        const isMinBiggest = (Math.max(Math.abs(minimum), Math.abs(maximum)) * -1 === minimum)
        const elem = _.find(MYSQL_NUMBER_TYPES, (o) => {
            if (isMinBiggest){
                return minimum >= o.min
            } else {
                return maximum <= o.max
            }
        })
        if (!elem)
            type = `DOUBLE${isUnsigned ? ` UNSIGNED`: ''}`
        else 
            type = `${elem.type}${isUnsigned ? ` UNSIGNED` : ''}`
        return type
    }

    public generateTable = () => {
        let countColumn = 0
        let tableQuery = `CREATE TABLE IF NOT EXISTS ${this.options().table} (\n`
        const described = this.schema().describe().keys

        for (const key in described){
            const { type, flags, rules } = described[key]

            if (LIST_SUPPORTED_TYPES.indexOf(type) == -1)
                throw new Error(`${type} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  

            this._parseAndTriggerErrors(described[key])

            const method: any = {
                string: this._parseString,
                number: this._parseNumber,
                date: this._parseDate,
                boolean: () => `boolean`
            }
            
            tableQuery += `     ${key} ${method[type](described[key])}` + this.formatQuerySuffix(described[key])
            if (countColumn + 1 !== described.length)
                tableQuery += `,\n`
        }
        tableQuery += ')'
        return tableQuery
    }

    tableToString = () => this.generateTable()
}