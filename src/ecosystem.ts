import _ from 'lodash'
import Joi from "joi";
import TableEngine from './table-engine'
import { IForeign, ITableEngine, IValidation, IPopulate, IAnalyze, TObjectAny, TObjectArrayString, IRef } from './table-engine/types'

export interface IModel {
    schema: Joi.ObjectSchema<any>
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

/* 
    Ecosystem is a mangager allowing to manage all the Joi schema created.
    It allows, for example, to do table creation or table migration, thanks to change recording.
*/
export default class Ecosystem {

    private _list: IModel[] = []
    constructor(){
    }

    list = () => this._list

    //Add a new Joi Schema to the Ecosystem
    add = (model: IModel) => {
        this.delete(model.tableName)
        this.list().push(model)
        return model
    }

    reset = () => this._list = []
    
    //Get a Schema from the table name in the ecosystem
    getModel = (tableName: string) => _.find(this.list(), {tableName})

    //Remove a Schema from the table name in the ecosystem
    delete = (tableName: string) => _.remove(this.list(), {tableName})

    schema = (m: IModel): ISchema => {
        const { schema } = m

        //Returns the table engine
        const engine = (): ITableEngine => TableEngine

        //Checks wether the value matches the schema validation system
        const validate = (value: any): IValidation => {
            const ret = schema.validate(value)
            return {
                error: ret.error ? ret.error.details[0].message : undefined,
                value: ret.value
            }
        }

        /*
            Returns populated column.
            Populated columns are columns linked with other ones in other tables.
            It can be a column with a foreign key or just a "populate" indicating the link between two columns
            without sql consequences.
            "Populate" extension has been added to enable feature developement on top of Joixsql for formating rendered data for example.
        */
        const getPopulate = () => {
            const { foreign_keys, populate } = engine().analyzeSchema(schema)
            for (let foreign of foreign_keys){
                const { key, table_reference, key_reference, group_id, no_populate } = foreign
                //if the current extension noPopulate() IS NOT set            
                if (!no_populate){
                    const modelRef = this.getModel(table_reference)
                    if (modelRef){
                        this.schema(modelRef).getPrimaryKey() === key_reference && 
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
    
        //Remove the key/value in the state if the keys are not present in the schema
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

    //Returns different tests on a Schema to check that they are correctly set
    verify = (v: IModel): IVerify => {

        //Do every available tests to check the model is receivable by MySQL/MariaDB
        const all = () => {
            foreignKeyExistences()
            populateExistences()
            crossedForeignKey()
            groupingValuesExistence()
            crossedPopulatedValues()
        }

        //Check that there is no crossed populated columns
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

        //Check that the key and table pointed in a populate setting exists in the ecosystem.
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

        //Check that the key and table pointed in a foreign key setting exists in the ecosystem.
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
                const { table_reference, group_id, key } = p
                if (group_id){
                    const mRef = this.getModel(table_reference) as IModel
                    const groups = this.schema(mRef).getGroups()
                    if (!groups[group_id])
                        throw new Error(`A GROUP_ID: '${group_id}' from the table: '${mRef?.tableName}' is referenced in ${origin_table}[${key}]. This GROUP_ID does NOT exist.`)
                }
            }
        }

        //Check that there is no crossed foreign key columns
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