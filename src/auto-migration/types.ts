import Joi from '@hapi/joi'

export type TColumn = string

export interface IInfo {
    column: string
    index: number
    date: boolean
    timestamp: boolean
    string: boolean
    text: boolean
    boolean: boolean
    number: boolean
    type: string
    key: string
    accurate_type: string
    hasDefault: boolean
    isUnsigned: boolean
    isNotNull: boolean
    isOnDeleteCascade: boolean
    isOnUpateCascade: boolean
    hasForeignKey: boolean
    hasUniqueKey: boolean
    hasPrimaryKey: boolean
    hasAutoIncrement: boolean
}

export interface IMigration {
    schema: Joi.Schema
    table: string
}

export interface IChange {
    column: TColumn
    info: IInfo
}

export interface IRenamed {
    before: string
    after: string
}

export interface ITemplate {
    up: string
    down: string
    extraUp: string
    extraDown: string
}

export interface IFullColumn {
    columns: TColumn[]
    infos: IInfo[]
}

export type TObjectStringString = { [char: string]: string } 