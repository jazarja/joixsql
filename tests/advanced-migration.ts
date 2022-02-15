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
            return MigrationManager.smartMigration().catch((e: Error) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.uniqueBlocked('email', USER_TABLE_NAME, 1).message)
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
            return await MigrationManager.smartMigration()
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.notNullAddBlocked('user', TODO_TABLE_NAME, 2).message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.foreignKeyDefaultValueDoesNotExist('user', TODO_TABLE_NAME, USER_TABLE_NAME, '3').message)
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
            return await MigrationManager.smartMigration()
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.notNullBlocked('user', TODO_TABLE_NAME, 2).message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.foreignKeyDefaultValueDoesNotExist('user', TODO_TABLE_NAME, USER_TABLE_NAME, '3').message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.stringMaxChangeBlocked('content', TODO_TABLE_NAME, 2, 4).message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('content', TODO_TABLE_NAME).message)
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
            return await MigrationManager.smartMigration()
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

        it('Migrate User - Update currency field from max 9999.9999 to max 999.9999 with present greater values', async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
                currency: Joi.number().float(7, 4).default(0).required()
            })

            ecosystem.add({ schema: User, tableName: USER_TABLE_NAME })
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.numberMaxChangedBlocked('currency', USER_TABLE_NAME, 1, 999.9999).message)
            })
        })

        it('Migrate User - Update currency field from min -9999.9999 to min -999.9999 with present lower values', async () => {
            await connection.table(USER_TABLE_NAME).where({id: 2}).update({ currency: -1244.52 })

            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
                currency: Joi.number().float(7, 4).default(0).required()
            })

            ecosystem.add({ schema: User, tableName: USER_TABLE_NAME })
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.numberMinChangedBlocked('currency', USER_TABLE_NAME, 1, -999.9999).message)
            })
        })


        it('Migrate Todo - Add a score int value ', async () => {
            
            const User = Joi.object({
                id: Joi.number().autoIncrement().primaryKey().group(['todo']),
                email: Joi.string().email().lowercase().required().unique(),
                created_at: Joi.date().default('now').group(['todo']),
                currency: Joi.number().float(8, 4).default(0).required()
            })

            ecosystem.add({ schema: User, tableName: USER_TABLE_NAME })
            
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.numberMinChangedBlocked('score', TODO_TABLE_NAME, 2, 0).message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.primaryDuplicatesBlocked('score', TODO_TABLE_NAME, 1).message)
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
                expect(e.message).to.eq(`Error: ` + MigrationErrors.primaryNullBlocked('score', TODO_TABLE_NAME, 2).message)
            })
        })

        it('Update All Todo - Init their score with positive scores', async () => {
            await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ score: 4 })
            await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ score: 5 })
        })

        it('Migrate Todo - Update content to 1000 char maximum', async () => {
            const Todo = Joi.object({
                id: Joi.number().positive(),
                content: Joi.string().min(1).max(1000).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            await MigrationManager.smartMigration()
            await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ content: `Batnae municipium in Anthemusia conditum Macedonum manu priscorum ab Euphrate flumine brevi spatio disparatur, refertum mercatoribus opulentis, ubi annua sollemnitate prope Septembris initium mensis ad nundinas magna promiscuae fortunae convenit multitudo ad commercanda quae Indi mittunt et Seres aliaque plurima vehi terra marique consueta. Post haec Gallus Hierapolim profecturus ut expeditioni specie tenus adesset, Antiochensi plebi suppliciter obsecranti ut inediae dispelleret metum, quae per multas difficilisque causas adfore iam sperabatur, non ut mos est principibus, quorum diffusa potestas localibus subinde medetur aerumnis, disponi quicquam statuit vel ex provinciis alimenta transferri conterminis, sed consularem Syriae Theophilum prope adstantem ultima metuenti multitudini dedit id adsidue replicando quod invito rectore nullus egere poterit victu.` })
            await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ content: `Batnae municipium in Anthemusia conditum Macedonum manu priscorum ab Euphrate flumine brevi spatio disparatur, refertum mercatoribus opulentis` })
        })

        it('Migrate Todo - Update content to 155 char maximum with greater present values.', async () => {
            const Todo = Joi.object({
                id: Joi.number().positive(),
                content: Joi.string().min(1).max(155).default(''),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.stringMaxChangeBlocked('content', TODO_TABLE_NAME, 1, 155).message)
            })
        })

        it('Migrate Todo - Update content to text', async () => {
            const Todo = Joi.object({
                id: Joi.number().positive(),
                content: Joi.string(),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            await MigrationManager.smartMigration()
        })

        // it('Migrate Todo - Update id to an unsigned big int', async () => {
        //     const Todo = Joi.object({
        //         id: Joi.number().max(9923372036854775807).positive(),
        //         content: Joi.string(),
        //         created_at: Joi.date().default('now'),
        //         user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
        //         score: Joi.number().primaryKey()
        //     })
    
        //     ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
        //     await MigrationManager.smartMigration()
        //     await connection.table(TODO_TABLE_NAME).where({id: 1}).update({ id: 9923372036854775801 })
        //     await connection.table(TODO_TABLE_NAME).where({id: 2}).update({ id: 9923372036854775800 })
        // })

        it('Migrate Todo - Try to remove unsigned', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9123372036854775807),
                content: Joi.string(),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
    
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.numberMaxChangedBlocked('id', TODO_TABLE_NAME, 2, 9223372036854775807).message)
            })
        })


        it('Migrate Todo - Try to changed created_at type with STRING', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.string(),
                created_at: Joi.string(),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('created_at', TODO_TABLE_NAME).message)
            })
        })


        it('Migrate Todo - Try to changed created_at type with INT', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.string(),
                created_at: Joi.number().max(10000000000000),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('created_at', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - Try to changed created_at type with FLOAT', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.string(),
                created_at: Joi.number().float(10, 2),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('created_at', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - Try to changed created_at type with DOUBLE', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.string(),
                created_at: Joi.number().double(),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('created_at', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - Try to changed created_at type with BOOLEA', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.string(),
                created_at: Joi.boolean(),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('created_at', TODO_TABLE_NAME).message)
            })
        })

        it('Migrate Todo - Try to changed content type with Date', async () => {
            const Todo = Joi.object({
                id: Joi.number().max(9923372036854775807).positive(),
                content: Joi.date(),
                created_at: Joi.date().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                score: Joi.number().primaryKey()
            })
            ecosystem.add({schema: Todo, tableName: TODO_TABLE_NAME})
            return MigrationManager.smartMigration().catch((e) => {
                expect(e.message).to.eq(`Error: ` + MigrationErrors.columnTypeChangeForbidden('content', TODO_TABLE_NAME).message)
            })
        })



    })

}

main()