import { Joi, TableEngine } from '../index'
import { expect } from 'chai';
import 'mocha';

import TableErrors from '../src/table-engine/errors'

const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

const main = () => {

    it('Unsupported default value : Object', () => {
        const Schema = Joi.object({
            id: Joi.number().required().default({id: 'Hey'}),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.typeNotAcceptedForDefaultValue(Object.name).message)
    })

    it('Unsupported default value : Array', () => {
        const Schema = Joi.object({
            id: Joi.number().required().default([1, 2]),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.typeNotAcceptedForDefaultValue(Array.name).message)
    })

    it('Incorrect default value: () => () => null', () => {
        const defaultValue = () => () => null

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })

    it('Incorrect default value: () => null', () => {
        const defaultValue = () => null

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })

    it('Incorrect default value: undefined', () => {
        const defaultValue = () => undefined

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })


    it('Incorrect default value: () => NaN', () => {
        const defaultValue = () => NaN

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.forbiddenDefaultValue(NaN, 'id').message)
    })

    it('Incorrect default value: () => NaN', () => {
        const defaultValue = NaN

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.forbiddenDefaultValue(NaN, 'id').message)
    })
}

main()