import { Schema } from '@hapi/joi'
import fs from 'fs'
import _ from 'lodash'
import { config } from '../../index'
import Element from './element'

import { LIST_SUPPORTED_TYPES } from './mysql/types'
import Ecosystem from '../ecosystem'

const MYSQL_RESERVED_WORDS_LIST = JSON.parse(fs.readFileSync('./mysql-reserved-words.json', 'utf8'))

export const detectAndTriggerSchemaErrors = (schema: Schema, tableName: string) => {
    const described = schema.describe().keys
    let countPrimary = 0
    
    const detectMySQLNamingError = (key: string) => {
        if (_.find(MYSQL_RESERVED_WORDS_LIST, key)){
            throw new Error(`You can't use ${key} as a table or column name. ${key} is a transact-SQL reserved word. More here: https://dev.mysql.com/doc/refman/8.0/en/keywords.html`)
        }
        const reg = /^[\w][\w_]*$/
        if (!reg.test(key)){
            throw new Error(`Table and column name should be respecting this regex format: /^[A-Za-Z0-9][A-Za-Z0-9_]*$/`)
        }
    }

    detectMySQLNamingError(tableName)

    for (const key in described){
        const elem = parseSupportedTypes(schema, new Element(described[key], key))    
        if (elem.is().primaryKey())
            countPrimary++
        detectMySQLNamingError(key)
    }

    if (countPrimary > 1)
        throw new Error("Your schema contain many primary keys")
}

export const parseSupportedTypes = (schema: Schema, elem: Element): Element => {
    const key = elem.key()

    const assignSpecsToDescribeKey = (e: any) => {
        if (e && e.flags){
            if (e.flags.auto_increment){
                if (Array.isArray(e.rules)){
                    e.rules.push({name: 'positive'})
                } else {
                    e.rules = [{name: 'positive'}]
                }
            }
            e.flags.auto_increment = undefined
            e.flags.primary_key = elem.flags().primary_key
            e.flags.foreign_key = elem.flags().foreign_key
            e.flags.delete_cascade = elem.flags().delete_cascade
            e.flags.update_cascade = elem.flags().update_cascade
            e.flags.populate = elem.flags().populate
            e.flags.noPopulate = elem.flags().noPopulate
            e.flags.group = elem.flags().group
        }
        return e
    }

    if (config.hasEcosystem()){
        const ecosystem = config.ecosystem() as Ecosystem
        if (elem.is().foreignKey() || elem.is().populate()){
            const [table, k] = elem.is().foreignKey() ? elem.get().foreignKey() : elem.get().populate()
            const m = ecosystem.getModel(table)
            if (m){
                return new Element(assignSpecsToDescribeKey(m.schema.describe().keys[k]), key)
            }
        }
    }

    if (elem.is().ref()){
        const ref = elem.get().ref()
        const newElemObject = assignSpecsToDescribeKey(schema.describe().keys[ref])
        return new Element(newElemObject, key)
    }

    if (LIST_SUPPORTED_TYPES.indexOf(elem.type()) == -1){
        throw new Error(`${elem.type()} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)  
    }
    
    return elem
}