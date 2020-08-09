import { Schema } from '@hapi/joi'

interface ITableEngine {
    analyzeSchema(schema: Schema): IAnalyze
    buildTableString(schema: Schema, tableName: string): string
    buildTable(schema: Schema, tableName: string): Promise<any>
    buildAllFromEcosystem(): Promise<void>
    dropAllFromEcosystem(): Promise<void>
}

interface IAnalyze {
    primary_key: string | null
    foreign_keys: Array<IForeign>
    unique_keys: Array<string>
    populate: Array<IPopulate>
    all_keys: Array<string>
    refs: Array<IRef>
    defaults: TObjectAny
    groups: TObjectArrayString
}

type TObjectArrayString = { [char: string]: string[] } 
type TObjectAny = { [char: string]: any } 

interface IValidation {
    error: string | undefined
    value: string
}

interface IRef {
    origin: string
    dest: string
}

interface IPopulate {
    key: string
    table_reference: string
    key_reference: string
    group_id: void | string
    no_populate: boolean
}

interface IForeign {
    key: string
    table_reference: string
    key_reference: string
    group_id: void | string
    required: boolean
    no_populate: boolean
    update_cascade: boolean
    delete_cascade: boolean
}

export {
    IAnalyze,
    IForeign,
    IValidation,
    IRef,
    IPopulate,
    ITableEngine,
    TObjectArrayString,
    TObjectAny
}