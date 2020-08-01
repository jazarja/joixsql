import { Joi, TableEngine, MigrationManager, Ecosystem, config } from '../index'
import MigrationErrors from '../src/migration-engine/template/errors'
import { expect } from 'chai'


const main = async () => {
    const connection = config.mysqlConnexion()
    const ecosystem = new Ecosystem()

    const genTableName = (name: string) => `migration_advanced_test_${name}`

    const removeTable = async (table: string) => {

        await config.mysqlConnexion().raw('SET foreign_key_checks = 0;')
        await config.mysqlConnexion().schema.dropTableIfExists(table)
        await config.mysqlConnexion().raw('SET foreign_key_checks = 1;')
        await MigrationManager.removeAllHistory(table)
    }

    const createTable = async (schema: any, tableName: string) => {
        if (MigrationManager.schema().lastFilename(tableName) == null){
            await TableEngine.buildTable(schema, tableName)
            await MigrationManager.schema().create({schema, tableName})
            ecosystem.add({schema, tableName})
        }
    }

    const USER_TABLE_NAME = genTableName('users')
    const TODO_TABLE_NAME = genTableName('todos')
    

    describe("Play with Todo and User Migrations", async () => {

        it('Clean all', async () => {
            config.disableCriticalConfirmation()
            config.disableLog()
            config.removeEcosystem()
            config.setEcosystem(ecosystem)
            config.disableMigrationRemovingOnError()

            await removeTable(USER_TABLE_NAME)
            await removeTable(TODO_TABLE_NAME)
            await removeTable('knex_migrations_lock')
            await removeTable('knex_migrations')
        })

        it('Create Todo Table', async () => {

            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now')
            })

            await createTable(Todo, TODO_TABLE_NAME)
            const hasTable = await connection.schema.hasTable(TODO_TABLE_NAME)
            expect(hasTable).to.eq(true)
        })
    
        it('Create User Table', async () => {

            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required(),
                created_at: Joi.date().default('now').group(['todo']),
            })

            await createTable(User, USER_TABLE_NAME)
            const hasTable = await connection.schema.hasTable(USER_TABLE_NAME)
            expect(hasTable).to.eq(true)
        })

        it('Insert 2 todos', async () => {
            await connection.insert({content: 'Hello'}).into(TODO_TABLE_NAME)
            await connection.insert({content: 'World'}).into(TODO_TABLE_NAME)

            const count = await connection.table(TODO_TABLE_NAME).count()
            expect(count[0]['count(*)']).to.eq(2)
        })

        it('Insert 2 Users', async () => {
            await connection.insert({email: 'louisdite@yahoo.fr'}).into(USER_TABLE_NAME)
            await connection.insert({email: 'louisdite@yahoo.fr'}).into(USER_TABLE_NAME)

            const count = await connection.table(USER_TABLE_NAME).count()
            expect(count[0]['count(*)']).to.eq(2)
        })

        it('Migrate User - add UNIQUE key on email with existing duplications', async () => {

            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
            })

            ecosystem.add({schema: User, tableName: USER_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.uniqueBlocked('email', USER_TABLE_NAME, 1).message)
            })

        })

        it('Migrate User - add UNIQUE key on email with no duplications', async () => {

            await connection.table(USER_TABLE_NAME).where({id: 2}).update({email: 'fantasim.dev@gmail.com'})

            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
            })

            ecosystem.add({schema: User, tableName: USER_TABLE_NAME})
            await MigrationManager.smartMigration()
        })

        it('Migrate Todo - add NOT NULLABLE foreign key with NO DEFAULT VALUE on non-empty table', async () => {

            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id').required()
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.notNullAddBlocked('user', TODO_TABLE_NAME, 2).message)
            })
        })

        it('Migrate Todo - add NOT NULLABLE foreign key with non existing DEFAULT VALUE.', async () => {

            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id').required().default(3)
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.foreignKeyDefaultValueDoesNotExist('user', TODO_TABLE_NAME, USER_TABLE_NAME, '3').message)
            })
        })

        it('Migrate Todo - add foreign key.', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            await MigrationManager.smartMigration()
        })

        it('Migrate Todo - update `user` foreign key to NOT NULLABLE with no DEFAULT VALUE.', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id').required()
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.notNullBlocked('user', TODO_TABLE_NAME, 2).message)
            })
        })

        it('Migrate Todo - update `user` foreign key with a non existing DEFAULT VALUE', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(400).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id').default(3)
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.foreignKeyDefaultValueDoesNotExist('user', TODO_TABLE_NAME, USER_TABLE_NAME, '3').message)
            })
        })

        it('Migrate Todo - change content length with a max inferior to current present values length', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(4).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.stringMaxChangeBlocked('content', TODO_TABLE_NAME, 2, 4).message)
            })
        })

        it('Migrate Todo - change content type', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.columnTypeChangeForbidden('content', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - change content length', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(5).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            await MigrationManager.smartMigration()
        })

        it('Migrate User - Add a currency float field ', async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
                currency: Joi.number().float(8, 4).default(0).required()
            })

            ecosystem.add({schema: User, tableName: USER_TABLE_NAME})
            await MigrationManager.smartMigration()

            await connection.table(USER_TABLE_NAME).where({id: 2}).update({ currency: 1244.52 })
        })

        it('Migrate User - Update currency field from max 9999.9999 to max 999.9999', async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
                currency: Joi.number().float(7, 4).default(0).required()
            })

            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.floatMaxChangeBlocked('currency', USER_TABLE_NAME, 1, 999.9999).message)
            })
        })

        it('Migrate Todo - Add a score int value ', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(5).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            await MigrationManager.smartMigration()
            await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ score: -1 })
            await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ score: -1 })
        })
    
        it('Migrate Todo - Switch score to unsigned ', async () => {
            const Todo = Joi.object({
                id: Joi.number().autoIncrement().primaryKey(),
                content: Joi.string().min(1).max(5).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().positive()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.columnTypeChangeForbidden('score', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - Switch Primary key to score 1/2', async () => {
            const Todo = Joi.object({
                id: Joi.number().positive(),
                content: Joi.string().min(1).max(5).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.primaryDuplicatesBlocked('score', TODO_TABLE_NAME, 1).message)
            })
        })

        it('Update All Todo - Init their score with null', async () => {

            await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ score: null })
            await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ score: null })

        })

        it('Migrate Todo - Switch Primary key to score 2/2', async () => {
            const Todo = Joi.object({
                id: Joi.number().positive(),
                content: Joi.string().min(1).max(5).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(MigrationErrors.primaryNullBlocked('score', TODO_TABLE_NAME, 2).message)
            })
        })

        it('Update All Todo - Init their score with positive scores', async () => {

            await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ score: 4 })
            await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ score: 5 })
        })
    })

}

main()