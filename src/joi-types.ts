import { Root, StringSchema, DateSchema, NumberSchema } from '@hapi/joi'

export interface JoiSQLStringSchema extends StringSchema {
    unique(): this;
    primaryKey(): this;
    foreignKey(table: string, key: string): this;
    deleteCascade(): this;
    updateCascade(): this;
}

export interface JoiSQLNumberSchema extends NumberSchema {
    unique(): this;
    primaryKey(): this;
    autoIncrement(): this;
    foreignKey(table: string, key: string): this;
    deleteCascade(): this;
    updateCascade(): this;
    float(): this;
    double(): this;
}

export interface JoiSQLDateSchema extends DateSchema {
    unique(): this;
    primaryKey(): this;
    foreignKey(table: string, key: string): this;
    deleteCascade(): this;
    updateCascade(): this;
}

export interface JoiSQLRoot extends Root {
    string(): JoiSQLStringSchema;
    number(): JoiSQLNumberSchema;
    date(): JoiSQLDateSchema;
}
