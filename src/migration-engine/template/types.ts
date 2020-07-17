import Joi from '@hapi/joi'

export type TColumn = string

export interface IMigration {
    schema: Joi.Schema
    table: string
}

export interface IUpdated {
    old: string
    new: string
}

export interface ITemplate {
    data: string
}

export type TObjectUpdated = { [char: string]: IUpdated } 

export type TObjectStringString = { [char: string]: string } 