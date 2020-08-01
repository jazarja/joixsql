import { Joi, TableEngine, MigrationManager, Ecosystem, config } from '../index'
import { expect } from 'chai';

const main = async () => {

    const ecosystem = new Ecosystem()
    const genTableName = (name: string) => `migration_test_${name}`

    const removeTable = async (table: string) => {
        config.disableCriticalConfirmation()
        config.disableLog()
        config.disableMigrationRemovingOnError()
        config.removeEcosystem()
        config.setEcosystem(ecosystem)

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

    const migrateSchema = async (schema: any, tableName: string) => {
        try {
            ecosystem.delete(tableName)
            ecosystem.add({schema, tableName})
            await MigrationManager.smartMigration()
        } finally {
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }

    const USER_TABLE_NAME = genTableName('users')
    const DEVICE_TABLE_NAME = genTableName('devices')


    describe("[USER] Primary key migration robustness", async () => {

        it('Clean all', async () => {
            await removeTable(USER_TABLE_NAME)
            await removeTable(DEVICE_TABLE_NAME)
            await removeTable('knex_migrations_lock')
            await removeTable('knex_migrations')
        })


        it('Create table and history schema [USER]', async () => {

            const User = Joi.object({
                id: Joi.number().primaryKey(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })

            await createTable(User, USER_TABLE_NAME)
        })

        it('Primary -> Auto Increment', async () => {

            const User = Joi.object({
                id: Joi.number().autoIncrement(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique(),

                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                first_connexion: Joi.date().default('now'),
                is_bool: Joi.bool().default(true),
                aFloat: Joi.number().float(20, 4).positive().required().default(10),
                aDouble: Joi.number().double().positive().default(10000),
            })

            await migrateSchema(User, USER_TABLE_NAME)
        })

        it('Default values change', async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required(),
                access_token: Joi.string().uuid().required().unique(),

                last_connexion: Joi.date().required().default(() => new Date()),
                count_connexion: Joi.number().positive().default(1),
                is_bool: Joi.bool().default(true),
                aFloat: Joi.number().float(20, 4).positive().required(),
                aDouble: Joi.number().double().positive().default(10000),
            })

            await migrateSchema(User, USER_TABLE_NAME)
        })

        it('Auto Increment -> No Primary', async () => {
            const User = Joi.object({
                id: Joi.number(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Remove 'id' Column`, async () => {
            const User = Joi.object({
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Create 'table_id' - AutoIncrement`, async () => {
            const User = Joi.object({
                table_id: Joi.number().autoIncrement(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Remove 'table_id' column`, async () => {
            const User = Joi.object({
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`new column 'id' - Primary Key `, async () => {
            const User = Joi.object({
                id: Joi.number().primaryKey(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`drop 'id' - Primary Key AND new column 'id2' - Primary Key `, async () => {
            const User = Joi.object({
                id: Joi.number(),
                id2: Joi.number().primaryKey(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Swap Primary key from 'id' -> 'id2'`, async () => {
            const User = Joi.object({
                id: Joi.number().primaryKey(),
                id2: Joi.number(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Swap Primary key from 'id' -> 'id2' + add Auto Increment`, async () => {
            const User = Joi.object({
                id: Joi.number(),
                id2: Joi.number().autoIncrement(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Swap Auto Increment Primary key from 'id2' -> 'id'`, async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement(),
                id2: Joi.number(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Remove 'id' and 'id2'`, async () => {
            const User = Joi.object({
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Re-add 'id' and 'id2'`, async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement(),
                id2: Joi.number(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })

        it(`Remove 'id' and 'id2' and 'username' + remove unique key 'access_token'`, async () => {
            const User = Joi.object({
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required()
            })
    
            await migrateSchema(User, USER_TABLE_NAME)
        })
        
        it(`Re-init USER`, async () => {
            const User = Joi.object({
                id: Joi.number().autoIncrement(),
                username: Joi.string().min(3).max(20).lowercase().required().unique(),
                created_at: Joi.date().required().default('now'),
                access_token: Joi.string().uuid().required().unique()
            })

            await migrateSchema(User, USER_TABLE_NAME)
        })
    })

    describe("[USER] and [DEVICE] - Foreign key", async () => {

    
        it('Create table and history schema [DEVICE]', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1).required(),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id').deleteCascade()
            })

            await createTable(Device, DEVICE_TABLE_NAME)
        })

        it('Remove delete cascade', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1).required(),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Remove foreign', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1).required(),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().positive()
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Re-add foreign', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1).required(),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id')
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Add 2nd foreign', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username')
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Remove default Value', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().required(),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username')
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Add a boolean value', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                is_bool: Joi.bool().default(true),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username')
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Add a unique value', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                is_bool: Joi.bool().default(true),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username'),
                username2: Joi.string().min(3).max(20).lowercase().required().unique()
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Update username details + drop unique value', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                is_bool: Joi.bool().default(true),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username'),
                username2: Joi.string().min(5).max(25).lowercase()
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Add double and float', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required().default('now'),
                count_connexion: Joi.number().positive().default(1),
                is_bool: Joi.bool().default(true),
                created_at: Joi.date().required().default('now'),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username'),
                username2: Joi.string().min(5).max(25).lowercase(),

                aFloat: Joi.number().float(20, 4).positive().default(0),
                aDouble: Joi.number().double().positive().default(10000),
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })

        it('Drop default values', async () => {
            const Device = Joi.object({
                id: Joi.number().autoIncrement(),
                last_connexion: Joi.date().required(),
                count_connexion: Joi.number().positive(),
                is_bool: Joi.bool().default(false),
                created_at: Joi.date().required().default(() => new Date()),
                user: Joi.number().foreignKey(USER_TABLE_NAME, 'id'),
                username: Joi.string().foreignKey(USER_TABLE_NAME, 'username'),
                username2: Joi.string().min(5).max(25).lowercase(),

                aFloat: Joi.number().float(20, 4).positive().default(0),
                aDouble: Joi.number().double().positive().default(10000),
            })

            await migrateSchema(Device, DEVICE_TABLE_NAME)
        })
    })

    
}

main()
