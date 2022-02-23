# Joi x SQL

Joixsql automatizes table creation and migration on MySQL and MariaDB based on **[Joi](https://joi.dev/api)** objects.

Simple Example:
```ts
import { Joi, TableEngine, config, Ecosystem, MigrationManager, config } from 'joixsql'

/* Create a user schema */
const User = Joi.object({
    id: Joi.number().autoIncrement().primaryKey(),
    username: Joi.string().min(3).max(20).lowercase().required().unique(),
    created_at: Joi.date().required().default('now'),
    access_token: Joi.string().uuid().required().unique(),
})

/* Connect the schema with a table name */
const userTable = {schema: User, tableName: 'users'}

/* Instance a new ecosystem of Tables */
const ecosystem = new Ecosystem()

const users = ecosystem.add(userTable)

/* Do every available tests to check the model is receivable by MySQL/MariaDB */
ecosystem.verify(userModel).all()

//We set the package configuration before running the table builder and the migration detector.
config.set({
    historyDir: './history'
    mysqlConfig: {
        host: 'localhost',
        user: 'fanta',
        password: 'passwd',
        database: 'db_name'
    },
    ecosystem: ecosystem 
})

/* Will build all the tables present in the ecosystem that have not been created yet. */
await TableEngine.buildAllFromEcosystem()

/*
Will migrate all the tables present in the ecosystem for the already existing tables
that differ from their previous state recorded in the history
*/
await MigrationManager.smartMigration()


```