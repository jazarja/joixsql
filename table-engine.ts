import { manager } from 'acey-node' 
import { Schema } from '@hapi/joi'
import _ from 'lodash'

const ENABLE_ACEY = true
export default class TableMakerEngine {

    static LIST_SUPPORTED_TYPES = ['string', 'number', 'boolean', 'date']
    static DEFAULTS_SQL_TYPE = [
        {
            key: 'string',
            type: 'TEXT'
        },
        {
            key: 'number',
            type: 'INT'
        },
        {
            key: 'boolean',
            type: 'BOOLEAN'
        },
        {
            key: 'date',
            type: 'TIMESTAMP'
        }
    ]

    static DEFAULT_NUMBER_TYPE = [
        {
            type: 'TINYINT',
            min: -128,
            max: 127
        },
        {
            type: 'SMALLINT',
            min: -32768,
            max: 32767
        },
        {
            type: 'MEDIUMINT',
            min: -8388608,
            max: 8388607
        },
        {
            type: 'INT',
            min: -2147483648,
            max: 2147483647
        },
        {
            type: 'BIGINT',
            min: -9223372036854775808,
            max: 9223372036854775807
        },
        {
            type: 'BIGINT',
            min: -9223372036854775808,
            max: 9223372036854775807
        }
    ]

    private _shema: Schema
    private _hasPrimaryKey: boolean = false
    private _tableName: string

    constructor(schema: Schema, tableName: string){
        this._shema = schema
        this._tableName = tableName
    }

    public schema = () => this._shema
    public containPrimaryKey = () => this._hasPrimaryKey
    public tableName = () => this._tableName

    public setSontainPrimaryKey = () => this._hasPrimaryKey = true

    getDefaultValueQuerySuffix = (type, flags) => {
        let defaultValue = this.getDefaultValue(flags)
        if (type === 'date'){
            if (defaultValue === 'now'){
                if (this.getDateFormat(flags))
                    return ` DEFAULT CURRENT_TIMESTAMP`
                else
                    return ` DEFAULT now()`
            }
        } else if (type === 'boolean'){
            return  ` DEFAULT ${defaultValue}`
        }

        return `${defaultValue != undefined ? ` DEFAULT ${typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue}` : ''}`
    }

    getNotNullQuerySuffix = (flags) => `${this.getIsRequired(flags) ? ' NOT NULL' : ''}`
    getUniqueQuerySuffix = (flags) => `${this.getIsUnique(flags) ? ' UNIQUE' : ''}`
    getAutoIncrementQuerySuffix = (flags) => `${this.getIsAutoIncrement(flags) ? ' AUTO_INCREMENT' : ''}`
    getPrimaryKeyQuerySuffix = (flags) => `${this.getIsPrimaryKey(flags) ? ' PRIMARY KEY' : ''}`

    getForeignKeyQuerySuffix = (flags) => {
        const values = this.getIsForeignKey(flags)
        if (!values)
            return ''
        const [table, key] = values
        return ` REFERENCES ${table}(${key})` + `${this.getIsDeleteCascade(flags) ? ' ON DELETE CASCADE' : ''}` + `${this.getIsUpdateCascade(flags) ? ' ON UPDATE CASCADE' : ''}`
    }

    getDefaultValue = (flags) => flags && `default` in flags ? flags.default : undefined
    getIsInsensitive = (flags) => flags && flags.insensitive || false
    getIsRequired = (flags) => flags && flags.presence === 'required' || false
    getIsUnique = (flags) => flags && flags.unique === true || false
    getIsAutoIncrement = (flags) => flags && flags.auto_increment === true || false
    getIsPrimaryKey = (flags) => flags && flags.primary_key === true || false
    getIsForeignKey = (flags) => flags && Array.isArray(flags.foreign_key) ? flags.foreign_key : false
    getIsDeleteCascade = (flags) => this.getIsForeignKey(flags) && flags && flags.delete_cascade
    getIsUpdateCascade = (flags) => this.getIsForeignKey(flags) && flags && flags.update_cascade
    getIsFloat = (flags) => flags && flags.float === true || false
    getIsDouble = (flags) => flags && flags.double === true || false
    getDateFormat = (flags) => flags ? flags.format : ''
    
    private _parseDate = (element) => {
        if (this.getDateFormat(element.flags) === 'unix')
            return `TIMESTAMP`
        return `DATETIME` 
    }

    private _parseGeneral = (element) => {
        const { flags } = element

        //primary key
        if (this.getIsPrimaryKey(flags)){
            if (this.containPrimaryKey())
                throw new Error("Your schema contain many primary key")
            if (this.getIsForeignKey(flags)){
                throw new Error("Your schema can't contain a value that is a primary key and a foreign key")
            }
            this.setSontainPrimaryKey()
        }

        //foreign key
        let foreignKey = this.getIsForeignKey(flags)
        if (foreignKey && ENABLE_ACEY){
            const [table, key] = foreignKey
            if (!table || !manager.models().exist(table)){
                throw new Error("No connected Collection exists with this key.")
            }
        }

        //only unix allowed on date format
        if (flags && flags.format === 'javascript'){
            throw new Error("only unix format is supported")
        }
    }

    private _parseString = (element) => {
        const { flags, rules, allow } = element

        //get the max length property
        const f = _.find(rules, {name: 'max'})
        //get default type
        let type = _.find(TableMakerEngine.DEFAULTS_SQL_TYPE, {key: 'string'}).type

        //if this is an ENUM
        if (allow){
            if (this.getIsPrimaryKey(flags)){
                throw new Error("Enum can't be a primary key")
            }
            type = `ENUM(${allow.map(e => `'${e}'`)})`        
        }
        //if thee max length is enabled 
        else if (f){
            const length = f.args.limit
            const isInsensitive = this.getIsInsensitive(flags)
            if (length <= 255)
                type = `VARCHAR(${length})${isInsensitive ? '' : ' BINARY'}`
            else if (length <= 65535){
                type = isInsensitive ? 'TEXT' : 'BLOB'
            } else if (length <= 16777215){
                type = isInsensitive ? 'MEDIUMTEXT' : 'MEDIUMBLOB'
            } else if (length <= 16777215){
                type = isInsensitive ? 'LONGTEXT' : 'LONGBLOB'
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

    private _parseNumber = (element) => {
        const getIsFloat = (flags) => flags && flags.float === true || false
        const getIsDouble = (flags) => flags && flags.double === true || false
        const getIsPositive = (rules) => {
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
        const { flags, rules } = element
        const isPrecision = _.find(rules, {name: 'precision'})
        const isPort = _.find(rules, {name: 'port'})

        if (getIsFloat(flags) || (isPrecision && isPrecision.args.limit !== 0))
            return `FLOAT${getIsPositive(rules) ? ' UNSIGNED' :''}`
        if (getIsDouble(flags))
            return `DOUBLE${getIsPositive(rules) ? ' UNSIGNED' :''}`
        if (isPort){
            return `SMALLINT UNSIGNED`
        }

        let minimum, maximum;
        let type = _.find(TableMakerEngine.DEFAULTS_SQL_TYPE, {key: 'number'}).type
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
            minimum = getIsPositive(rules) ? 0 : -2147483648
        if (maximum == undefined)
            maximum = 2147483647


        const isUnsigned = minimum >= 0 
        const isMinBiggest = (Math.max(Math.abs(minimum), Math.abs(maximum)) * -1 === minimum)
        const elem = _.find(TableMakerEngine.DEFAULT_NUMBER_TYPE, (o) => {
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

    private _generateTable = () => {
        const { LIST_SUPPORTED_TYPES } = TableMakerEngine
        let tableQuery = `CREATE TABLE IF NOT EXISTS ${this.tableName()} (\n`
        const described = this.schema().describe().keys
        
        let countColumn = 0
        for (const key in described){
            const { type, flags, rules } = described[key]
            if (LIST_SUPPORTED_TYPES.indexOf(type) == -1)
                throw new Error(`${type} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  

            this._parseGeneral(described[key])

            const method = {
                string: this._parseString,
                number: this._parseNumber,
                date: this._parseDate,
                boolean: () => `boolean`
            }
            
            tableQuery += `     ${key} ${method[type](described[key])}`
            tableQuery += this.getNotNullQuerySuffix(flags) + this.getDefaultValueQuerySuffix(type, flags) + this.getUniqueQuerySuffix(flags) + this.getPrimaryKeyQuerySuffix(flags) + this.getForeignKeyQuerySuffix(flags)         
            if (countColumn + 1 !== described.length)
                tableQuery += `,\n`
        }
        tableQuery += ')'
        return tableQuery
    }

    toString = () => this._generateTable()
    run = () => {}
}