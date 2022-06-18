import { Joi, TableEngine, config, Ecosystem } from '../index'
import { expect } from 'chai';
import 'mocha';

const main = () => {

    const connection = config.connection()

    const removeTable = async (table: string) => {
        await connection.raw('SET foreign_key_checks = 0;')
        await connection.schema.dropTableIfExists(table)
        await connection.raw('SET foreign_key_checks = 1;')
    }
    const getTable = (schema: any, table: string) => TableEngine.buildTable(schema, table)

    it('INT : id, primary key and auto-increment', async () => {
        const TABLE_NAME = 'test1'
        await removeTable(TABLE_NAME)

        const Schema1 = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.string(),
            created_at: Joi.date().default('now').required()
        })
        return getTable(Schema1, TABLE_NAME).then( async () => {

            await connection.insert({content: 'Hello'}).into(TABLE_NAME)
            await connection.insert({content: 'World'}).into(TABLE_NAME)
            await connection.insert({content: '123'}).into(TABLE_NAME)
            await connection.insert({content: 'AZE'}).into(TABLE_NAME)

            const rows = await connection.select('*').from(TABLE_NAME)
            for (let i = 1; i < rows.length; i++){
                const { id, content, created_at } = rows[i]
                expect(id).to.be.greaterThan(rows[i - 1].id)
                expect(new Date(created_at)).to.be.gte(new Date(rows[i - 1].created_at))
            }
            await removeTable(TABLE_NAME)
        })
    })
    it('STRING : unique value', async () => {
        
        const TABLE_NAME = 'test3'
        await removeTable(TABLE_NAME)

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.string().unique(),
            created_at: Joi.date().default('now').required()
        })
        // expect(getTable(Schema, TABLE_NAME).table).to.throw(Error)

        const Schema2 = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.string().unique().max(400),
            created_at: Joi.date().default('now').required()
        })
        return getTable(Schema2, TABLE_NAME).then( async () => {
            await connection.insert({content: 'Hello'}).into(TABLE_NAME)
            return await connection.insert({content: 'Hello'}).into(TABLE_NAME).catch((e) => {
                expect(e.code).to.eq('ER_DUP_ENTRY')
            })
        })

    })

    it('INT : unique value + Date instance as default value', async () => {
        const TABLE_NAME = 'test4'
        await removeTable(TABLE_NAME)

        const Schema2 = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.number().unique().max(400),
            created_at: Joi.date().default(new Date()).required(),
            end_at: Joi.date().default(() => new Date()).required()
        })

        return getTable(Schema2, TABLE_NAME).then( async () => {
            await connection.insert({content: 1, end_at: new Date() }).into(TABLE_NAME)
            await connection.insert({content: 2, end_at: new Date() }).into(TABLE_NAME)
            return await connection.insert({content: 1, end_at: new Date() }).into(TABLE_NAME).catch((e) => {
                expect(e.code).to.eq('ER_DUP_ENTRY')
            })
        })
    })

    it('DATE : unique value', async () => {
        const TABLE_NAME = 'test5'
        await removeTable(TABLE_NAME)

        const Schema2 = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.number().max(400),
            created_at: Joi.date().default('now').required().unique()
        })
        return getTable(Schema2, TABLE_NAME).then(async () => {
            await connection.insert({content: 1}).into(TABLE_NAME)
            return await connection.insert({content: 2}).into(TABLE_NAME).catch((e) => {
                expect(e.code).to.eq('ER_DUP_ENTRY')
            })    
        })
    })


    it('required: NOT NULL', async () => {
        const TABLE_NAME = 'test6'
        await removeTable(TABLE_NAME)

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.number(),
            created_at: Joi.date().required()
        })
        return getTable(Schema, TABLE_NAME).then(async() => {
            return await connection.insert({content: 2}).into(TABLE_NAME).catch((e) => {
                expect(e.code).to.eq('ER_NO_DEFAULT_FOR_FIELD')
            })
        })
    })

    it('default : DEFAULT', async () => {
        const TABLE_NAME = 'test7'
        await removeTable(TABLE_NAME)

        const Schema = Joi.object({
            id: Joi.number().required().primaryKey().autoIncrement(),
            content: Joi.string().max(4000).required().default('yes'),
            created_at: Joi.date().required().default('now')
        })
        return getTable(Schema, TABLE_NAME).then( async () => {
            await connection.insert({}).into(TABLE_NAME)
            const rows = await connection.select('*').from(TABLE_NAME)
            expect(rows[0].content).to.eq('yes')
    
            const Schema2 = Joi.object({
                id: Joi.number().required().primaryKey().autoIncrement(),
                content: Joi.string().required().default('yes'),
                created_at: Joi.date().required().default('now')
            })
        })
    })

    it('INTEGER foreign key : on DELETE CASCADE', async () => {
        const TABLE_NAME_1 = 'test8'
        const TABLE_NAME_2 = 'test9'
        await removeTable(TABLE_NAME_1)
        await removeTable(TABLE_NAME_2)

        config.setEcosystem(new Ecosystem())

        const User = Joi.object({
            id: Joi.number().required().autoIncrement(),
            username: Joi.string().lowercase().required().unique().min(3).max(20),
            created_at: Joi.date().required().default('now')
        })
        config.ecosystem()?.add({schema: User, tableName: TABLE_NAME_1})

        const Device = Joi.object({
            id: Joi.number().required().autoIncrement(),
            name: Joi.string().required().max(100).lowercase(),
            user_id: Joi.number().foreignKey(TABLE_NAME_1, 'id').deleteCascade()
        })

        config.ecosystem()?.add({schema: Device, tableName: TABLE_NAME_2})
        return getTable(User, TABLE_NAME_1).then(() => {

            return getTable(Device, TABLE_NAME_2).then( async () => {

                await connection.insert({ username: 'louis' }).into(TABLE_NAME_1)
                await connection.insert({ name: 'iPhone6', user_id: 1 }).into(TABLE_NAME_2)
        
                const countUserBefore = (await connection(TABLE_NAME_1).count('* as count'))[0].count
                const countDeviceBefore = (await connection(TABLE_NAME_2).count('* as count'))[0].count
        
                expect(countUserBefore).to.eq(1)
                expect(countDeviceBefore).to.eq(1)
        
                await connection(TABLE_NAME_1).where({id: 1}).del()
        
                const countUserAfter = (await connection(TABLE_NAME_1).count('* as count'))[0].count
                const countDeviceAfter = (await connection(TABLE_NAME_2).count('* as count'))[0].count
        
                expect(countUserAfter).to.eq(0)
                expect(countDeviceAfter).to.eq(0)
                config.removeEcosystem()
            })
        })
    })

    it('STRING foreign key : on DELETE CASCADE and UPDATE CASCADE', async () => {
        const TABLE_NAME_1 = 'test10'
        const TABLE_NAME_2 = 'test11'
        await removeTable(TABLE_NAME_1)
        await removeTable(TABLE_NAME_2)

        config.setEcosystem(new Ecosystem())

        const User = Joi.object({
            id: Joi.number().required().autoIncrement(),
            username: Joi.string().lowercase().required().unique().min(3).max(20),
            password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]$')).min(3).max(30),
            repeat_password: Joi.ref('password'),
            created_at: Joi.date().required().default('now')
        })

        config.ecosystem()?.add({schema: User, tableName: TABLE_NAME_1})

        const Device = Joi.object({
            id: Joi.number().required().autoIncrement(),
            name: Joi.string().required().max(100).lowercase(),
            username: Joi.string().foreignKey(TABLE_NAME_1, 'username').deleteCascade().updateCascade()
        })

        config.ecosystem()?.add({schema: Device, tableName: TABLE_NAME_2})

        return getTable(User, TABLE_NAME_1).then(() => {

            return getTable(Device, TABLE_NAME_2).then( async () => {

                await connection.insert({ username: 'louis' }).into(TABLE_NAME_1)
                await connection.insert({ name: 'iPhone6', username: 'louis' }).into(TABLE_NAME_2)

                expect((await connection(TABLE_NAME_2).select('*'))[0].username).to.eq('louis')            
                await connection(TABLE_NAME_1).where({id: 1}).update({username: 'fantasim'})
                expect((await connection(TABLE_NAME_2).select('*'))[0].username).to.eq('fantasim')

                await connection(TABLE_NAME_1).where({username: 'fantasim'}).del()

                const countUser = (await connection(TABLE_NAME_1).count('* as count'))[0].count
                const countDevice = (await connection(TABLE_NAME_2).count('* as count'))[0].count
                
                expect(countUser).to.eq(0)
                expect(countDevice).to.eq(0)
                config.removeEcosystem()
            })
        })
    })
}

main()