import { Joi, TableEngine,} from '../index'
import { expect } from 'chai';
import 'mocha';

import TableErrors from '../src/table-engine/errors'

const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

const main = () => {

    it('Wrong default value: string instead of number', () => {
        const defaultValue = 'Hello'

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): string instead of number', () => {
        const defaultValue = () => 'Hello'

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): Date instead of number', () => {
        const defaultValue = () => new Date()

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: Date instead of number', () => {
        const defaultValue = new Date()

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: boolean instead of number', () => {
        const defaultValue = true

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): boolean instead of number', () => {
        const defaultValue = () => true

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueHasWrongType('id').message)
    })

    it('Wrong default value: (): (): number instead of number or (): number', () => {
        const defaultValue = () => () => 10

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.elementTypeUnsupported('id').message)
    })

    it('Correct default value: (): Number', () => {
        const defaultValue = () => 10

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: Number', () => {
        const defaultValue = 10

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Correct default value: Number', () => {
        const defaultValue = 9007199254740992

        const Schema = Joi.object({
            id: Joi.number().required().default(defaultValue).max(9007199254740992 * 2),
        })

        expect(() => getTable(Schema, 'test').toString()).to.not.throw(Error)
    })

    it('Less than allowed number type 1/3', () => {
        const Schema = Joi.object({
            id: Joi.number().required().default(-10).positive(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueIsLessThanMinType('id', 'int unsigned').message)
    })

    it('Less than allowed number type 2/3', () => {
        const Schema = Joi.object({
            id: Joi.number().required().default(-2147483649),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueIsLessThanMinType('id', 'int').message)
    })

    it('Less than allowed number type 3/3', () => {
        const Schema = Joi.object({
            id: Joi.number().required().port().default(-10)
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueIsLessThanMinType('id', 'int').message)
    })

    it('Greater than allowed number type 1/2', () => {
        const Schema = Joi.object({
            id: Joi.number().required().default(2147483648),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueIsGreaterThanMaxType('id', 'int').message)
    })

    it('Greater than allowed number type 2/2', () => {
        const Schema = Joi.object({
            id: Joi.number().required().port().default(2147483648 * 2)
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.defaultValueIsGreaterThanMaxType('id', 'int').message)
    })


}

main()