import { Joi, TableEngine } from '../index'
import { expect } from 'chai';
import 'mocha';

import TableErrors from '../src/table-engine/errors'

const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

const main = () => {

    it('Wrong default value: number instead of Date', () => {
        const defaultValue = 12

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): number instead of Date', () => {
        const defaultValue = () => 12

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: boolean instead of Date', () => {
        const defaultValue = true

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): boolean instead of Date', () => {
        const defaultValue = () => true

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): (): Date instead of string or (): Date', () => {
        const defaultValue = () => () => new Date()
        
        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })
        
        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })

    it('Correct default value: (): Date', () => {
        const defaultValue = () => new Date()
        
        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: Date', () => {
        const defaultValue = new Date()

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: (): String', () => {
        const defaultValue = () => new Date().toString()
        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: Date', () => {
        const defaultValue = () => new Date().toString()

        const Schema = Joi.object({
            id: Joi.date().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })
}

main()