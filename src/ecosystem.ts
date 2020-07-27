import _ from 'lodash'
import Joi from "@hapi/joi";
import TableEngine from './table-engine'
import { IForeign, ITableEngine, IValidation, IPopulate, IAnalyze, TObjectAny, TObjectArrayString, IRef } from './table-engine/types'

export interface IModel {
    schema: Joi.Schema
    tableName: string
}

export interface ISchema {
    engine(): ITableEngine
    validate(value: any): IValidation
    getPopulate(): IPopulate[]
    cleanNonPresentValues(state: any): any
    analyze(): IAnalyze
    getAllKeys(): string[]
    getGroups(): TObjectArrayString
    getPrimaryKey(): string
    getForeignKeys(): IForeign[]
    getRefs(): IRef[]
    defaults(): TObjectAny
    ecosystemModel(): IModel
}

export interface IVerify {
    all(): void
    foreignKeyExistences(): void
    populateExistences(): void
    crossedForeignKey(): void
    groupingValuesExistence(): void
    crossedPopulatedValues(): void
}

export default class Ecosystem {

    private _list: IModel[] = []
    constructor(){
    }

    list = () => this._list

    add = (model: IModel) => {
        this.delete(model.tableName)
        this.list().push(model)
        return model
    }

    reset = () => this._list = []
    
    getModel = (tableName: string) => _.find(this.list(), {tableName})

    delete = (tableName: string) => _.remove(this.list(), {tableName})

    schema = (m: IModel): ISchema => {
        const { schema } = m

        const engine = (): ITableEngine => TableEngine

        const validate = (value: any): IValidation => {
            const ret = schema.validate(value)
            return {
                error: ret.error ? ret.error.details[0].message : undefined,
                value: ret.value
            }
        }
    
        const getPopulate = () => {
            const { foreign_keys, populate } = engine().analyzeSchema(schema)
            let pops = populate.slice()
            _.remove(pops, {no_populate: true})
            for (let foreign of foreign_keys){
                const { key, table_reference, key_reference, group_id, no_populate } = foreign
                if (!no_populate){
                    const modelRef = this.getModel(table_reference)
                    if (modelRef){
                        this.schema(modelRef).getPrimaryKey() === key_reference
                        !_.find(populate, {key}) && populate.push({
                            key, 
                            table_reference, 
                            key_reference, 
                            group_id, 
                            no_populate
                        })
                    }
                }
            }
            return populate
        }
    
        const cleanNonPresentValues = (state: any) => {
            const newState = _.cloneDeep(state)
            const describedSchema = schema.describe().keys
            for (const key in state)
                !(key in describedSchema) && delete newState[key]
            return newState
        }

        return {
            cleanNonPresentValues,
            validate,
            engine,
            getPopulate,
            analyze: () => engine().analyzeSchema(schema),
            getAllKeys: () => engine().analyzeSchema(schema).all_keys,
            getGroups: () => engine().analyzeSchema(schema).groups,
            getPrimaryKey: () => engine().analyzeSchema(schema).primary_key as string,
            getForeignKeys: () => engine().analyzeSchema(schema)?.foreign_keys,
            getRefs: () => engine().analyzeSchema(schema)?.refs,
            defaults: () => engine().analyzeSchema(schema)?.defaults,
            ecosystemModel: () => m
        }
    }

    verify = (v: IModel): IVerify => {

        const all = () => {
            foreignKeyExistences()
            populateExistences()
            crossedForeignKey()
            groupingValuesExistence()
            crossedPopulatedValues()
        }

        const crossedPopulatedValues = () => {
            const origin_table = v.tableName
    
            const recur = (v: IModel) => {
                const populate = this.schema(v).getPopulate()
                for (let p of populate){
                    const { table_reference } = p
                    if (table_reference === origin_table)
                        throw new Error(`Crossed populate found in node model of the collection: ${origin_table}. You can use the method noPopulate() on your shema to disable auto-population mode on foreign keys pointed on primary keys.`)
                    recur(this.getModel(table_reference) as IModel)
                }
            }
            recur(v)
        }

        const populateExistences = () => {
            const origin_table = v.tableName
            const populate = this.schema(v).getPopulate()
        
            for (let p of populate){
                const { table_reference: table, key_reference, key } = p
                const cRef = this.getModel(table)
                if (!cRef)
                    throw new Error(`${origin_table}[${key}] is populated with the key: '${key_reference}' from the TABLE: '${table}'. This TABLE does NOT exist.`)
                const allKeys = this.schema(cRef).getAllKeys()
                if (allKeys.indexOf(key_reference) == -1){
                    throw new Error(`${origin_table}[${key}] is populated with the KEY: '${key_reference}' from the TABLE: '${table}'. This KEY does NOT exist.`)
                }
            }
        }

        const foreignKeyExistences = () => {
            const origin_table = v.tableName
            const foreigns = this.schema(v).getForeignKeys()
        
            for (let f of foreigns){
                const { table_reference: table, key_reference, key } = f
                const cRef = this.getModel(table)
                if (!cRef)
                    throw new Error(`${origin_table}[${key}] is a defined foreign key pointing towards the key: '${key_reference}' in the TABLE: '${table}'. This TABLE does NOT exist.`)
                const allKeys = this.schema(cRef).getAllKeys()
                if (allKeys.indexOf(key_reference) == -1){
                    throw new Error(`${origin_table}[${key}] is a defined foreign key pointing towards the KEY: '${key_reference}' in the table: '${table}'. This KEY does NOT exist.`)
                }
            }
        }

        const groupingValuesExistence = () => {
            const origin_table = v.tableName
            const populate = this.schema(v).getPopulate()
            for (let p of populate){
                const { table_reference, group_id, key_reference, key } = p
                if (group_id){
                    const mRef = this.getModel(table_reference) as IModel
                    const groups = this.schema(mRef).getGroups()
                    if (!groups[group_id])
                        throw new Error(`A GROUP_ID: '${group_id}' from the table: '${mRef?.tableName}' is referenced in ${origin_table}[${key}]. This GROUP_ID does NOT exist.`)
                }
            }
        }

        const crossedForeignKey = () => {
            const recur = (elem: IForeign, history: string[], over: string[], tableName: string) => {
                const { table_reference, key_reference} = elem
                const hash = table_reference+key_reference
        
                if (history.indexOf(hash) != -1){
                    throw new Error(`You created 2 crossed foreign keys with cascade action table: ${table_reference}, key: ${key_reference} `)
                } else if (history.indexOf(hash) == -1){
                    history.push(hash)
                }
                if (over.indexOf(hash+tableName) != -1)
                    return
                else 
                    over.push(hash + tableName)
        
                const cRef = this.getModel(table_reference) as IModel
                for (const f of this.schema(cRef).getForeignKeys()){
                    recur(f, history, over, cRef.tableName)
                }
            }
        
            for (const f of this.schema(v).getForeignKeys()){
                const history: string[] = []
                const over: string[] = []
                recur(f, history, over, v.tableName)
             }
        }

        return {
            all,
            crossedPopulatedValues,
            populateExistences,
            foreignKeyExistences,
            groupingValuesExistence,
            crossedForeignKey
        }
    }
 }