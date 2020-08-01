import { Joi, TableEngine } from '../index'
import { expect } from 'chai';
import 'mocha';

import TableErrors from '../src/table-engine/errors'

const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

const main = () => {

    it('Wrong default value: number instead of string', () => {
        const defaultValue = 12

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): number instead of string', () => {
        const defaultValue = () => 12

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): Date instead of string', () => {
        const defaultValue = () => new Date()

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: boolean instead of string', () => {
        const defaultValue = true

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): boolean instead of string', () => {
        const defaultValue = () => true

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): (): string instead of string or (): string', () => {
        const defaultValue = () => () => 'Hey'

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })

    it('Correct default value: (): string', () => {
        const defaultValue = () => 'Hey'

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: String', () => {
        const defaultValue = 'Hey'

        const Schema = Joi.object({
            id: Joi.string().uuid().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Default value on string with no max set', () => {
    
        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required().default('Hello'),
            created_at: Joi.date().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.textDefaultValueForbidden('content').message)
    })

    it('Default value length greater than varchar length', () => {
    
        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required().max(10).default('Hello World!'),
            created_at: Joi.date().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.stringDefaultValueOversized('content').message)
    })

}

main()