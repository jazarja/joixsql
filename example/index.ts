import { Joi, TableEngine, config, Ecosystem, MigrationManager } from 'joixsql'

/* Create a todo schema */
const Todo = Joi.object({
    id: Joi.number().autoIncrement().primaryKey(),
    content: Joi.string().min(1).max(400).default(''),
    created_at: Joi.date().default(() => new Date()),
})

/* Connect the schema with a table name */
const todoTable = {schema: Todo, tableName: 'todos'}

/* Instance a new ecosystem of Tables */
const ecosystem = new Ecosystem()
ecosystem.add(todoTable)

/* Do every available tests to check the model is receivable by MySQL/MariaDB */
ecosystem.verify(todoTable).all()

//We set the package configuration before running the table builder and the migration detector.
config.set({
    historyDir: './history',
    mysqlConfig: {
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'database'
    },
    ecosystem: ecosystem 
})

const main = async () => {

    /* Will build all the tables present in the ecosystem that have not been created yet. */
    await TableEngine.buildAllFromEcosystem()

    /*
    Will migrate all the tables present in the ecosystem for the already existing tables
    that differ from their previous state recorded in the history
    */
    await MigrationManager.smartMigration()
}

main()

