import { Joi, TableEngine } from '../index'
import TableErrors from '../src/table-engine/errors'
import { expect } from 'chai';

const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

const main = () => {

    it('Ecosystem not set: dropAllFromEcosystem', () => {
        return TableEngine.dropAllFromEcosystem().then(() => {
        }).catch((e) => {
            expect(e.message).to.eq(TableErrors.noEcosystem().message)
        })
    })

    it('Ecosystem not set: buildAllFromEcosystem', () => {
        return TableEngine.buildAllFromEcosystem().catch((e) => {
            expect(e.message).to.eq(TableErrors.noEcosystem().message)
        })
    })

    it('Table has many primary keys', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.number().required().primaryKey(),
            created_at: Joi.date().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.manyPrimaryKey('test').message)
    })

    it('Column is primary and foreign', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey().foreignKey('test', 'id'),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.primaryKeyIsForeign('id').message)
    })

    it('Column is primary and unique', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey().unique(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.primaryKeyIsUnique('id').message)
    })

    it('Timestamp is not supported 1/2', () => {
    
        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().timestamp().default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.timestampIsUnsupported('created_at').message)
    })

    it('Timestamp is not supported 2/2', () => {
        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().timestamp('unix').default('now').required()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.timestampIsUnsupported('created_at').message)
    })

    it('array type is not supported', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
            ips: Joi.array().max(10)
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.unsupportedType('array').message)
    })

    it('object type is not supported', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
            ips: Joi.object()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.unsupportedType('object').message)
    })

    it('binary type is not supported', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
            ips: Joi.binary().max(10)
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.unsupportedType('binary').message)
    })

    it('symbol type is not supported', () => {

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
            ips: Joi.symbol()
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.unsupportedType('symbol').message)
    })

    it('Wrong enum value 1/2', () => {
        const Schema = Joi.object({
            id: Joi.string().allow("Hello", "Bonjour", 'Hola').default('Mike'),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('Wrong enum value 2/2', () => {
        const Schema = Joi.object({
            id: Joi.number().allow(1, 2, 3).default(4),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('Wrong enum type 1/6', () => {
        const Schema = Joi.object({
            id: Joi.string().allow("Hello", "Bonjour", 1).default('Mike'),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('Wrong enum type 2/6', () => {
        const Schema = Joi.object({
            id: Joi.string().allow("Hello", false, "Wesh").default('Mike'),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('Wrong enum type 3/6', () => {
        const Schema = Joi.object({
            id: Joi.string().allow({id: 'hey'}, "Bonjour", "Wesh").default('Mike'),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('Wrong enum type 4/6', () => {
        const Schema = Joi.object({
            id: Joi.number().allow({id: 1}, 2, 3).default(4),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)     
    })

    it('Wrong enum type 5/6', () => {
        const Schema = Joi.object({
            id: Joi.number().allow(1, 1.3, 3).default(4),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)      
    })

    it('Wrong enum type 6/6', () => {
        const Schema = Joi.object({
            id: Joi.number().allow(1, 2, "Hey").default(4),
            content: Joi.string().required(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.enumHasWrongValue('id').message)    
    })

    it('cant be unique with a text', () => {
        const Schema = Joi.object({
            id: Joi.string().required(),
            content: Joi.string().required().max(80000).unique(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.uniqueStringShouldHaveAMaxLengthSet('content').message)    
    })

    it('Unique string has no max set part', () => {
        const Schema = Joi.object({
            id: Joi.string().required(),
            content: Joi.string().required().unique(),
            created_at: Joi.date().default('now').required(),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.uniqueStringShouldHaveAMaxLengthSet('content').message)
    })

    it('Wrong column format 1/3', () => {
        const Schema = Joi.object({
            '124ed': Joi.string().required(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now'),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.wrongColumnOrTableFormat('124ed').message)
    })

    it('Wrong column format 2/3', () => {
        const Schema = Joi.object({
            'Dev-12': Joi.string().required(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now'),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.wrongColumnOrTableFormat('Dev-12').message)
    })

    it('Wrong column format 3/4', () => {
        const Schema = Joi.object({
            '@dev12': Joi.string().required(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now'),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.wrongColumnOrTableFormat('@dev12').message)
    })

    it('Wrong column format 4/4', () => {
        const Schema = Joi.object({
            '#dev_12': Joi.string().required(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now'),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.wrongColumnOrTableFormat('#dev_12').message)
    })

    it('Reserved transactional keyword', () => {
        const Schema = Joi.object({
            GROUP: Joi.string().required(),
            content: Joi.string().required(),
            created_at: Joi.date().default('now'),
        })

        expect(() => getTable(Schema, 'test').toString()).to.throw(TableErrors.reservedMySQLTransacKeyWord('GROUP').message)
    })

}

main()