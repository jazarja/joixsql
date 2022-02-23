import  { Root, StringSchema, DateSchema, NumberSchema, BooleanSchema } from 'joi'

export interface JoiSQLStringSchema extends StringSchema {
    unique(): this;
    foreignKey(table: string, key: string, groupID: void | string): this;
    populate(table: string, key: string, groupID: void | string): this;
    noPopulate(): this;
    deleteCascade(): this;
    updateCascade(): this;
    group(ids: string[]): this;
}

export interface JoiSQLNumberSchema extends NumberSchema {
    unique(): this;
    primaryKey(): this;
    autoIncrement(): this;
    foreignKey(table: string, key: string, groupID: void | string): this;
    populate(table: string, key: string, groupID: void | string): this;
    noPopulate(): this;
    deleteCascade(): this;
    updateCascade(): this;
    float(precision: number, scale: number): this;
    double(): this;
    group(ids: string[]): this;
}

export interface JoiSQLDateSchema extends DateSchema {
    unique(): this;
    primaryKey(): this;
    foreignKey(table: string, key: string, groupID: void | string): this;
    populate(table: string, key: string, groupID: void | string): this;
    noPopulate(): this;
    deleteCascade(): this;
    updateCascade(): this;
    group(ids: string[]): this;
}

export interface JoiSQLBooleanSchema extends BooleanSchema {
    group(ids: string[]): this;
}

export interface JoiSQLRoot extends Root {
    string(): JoiSQLStringSchema;
    number(): JoiSQLNumberSchema;
    date(): JoiSQLDateSchema;
    boolean(): JoiSQLBooleanSchema;
}
