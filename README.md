# Joi x SQL

Joixsql automatizes table creation and migration on MySQL and MariaDB based on **[Joi](https://joi.dev/api)** objects.

Overall functioning:
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
<br />
<br />


## Object options:
<br />
### Numbers

```ts
Joi.object({
    /* min(), and max() will determine the sql data type. */
    username: Joi.string().min(3).max(20),
    /* unique() set a SQL Unique constraint */
    username_2: Joi.string().unique()
    /* If no max() is set, the SQL type will be by default TEXT (max 65,535 chars) */
    username_3: Joi.string()
    /* 
        string type like email() automatically set the column max value at the right data type. 
        email, domain, hostname, ipVersion: 255 chars max,
        dataUri, uri, uriCustomScheme, uriRelativeOnly: 90,000 chars max,
        guid: 70 chars max,
        creditCard, ip, isoDate, isoDuration: 32 chars max,
    */
    email: Joi.string().email(),
    /*
        groups() has NO effect on MySQL/MariaDB. 
        Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they
        are included in a group, to avoid rendering the whole object when no need.
    */
    email_2: Joi.string().email().groups(['full', 'preview']),
    /* allow() set the column as a MySQL/Maria ENUM */
    group_id: Joi.string().allow("Lord", "King", "Prince"],
    /* default() will do a DEFAULT constraint on MySQL/Maria */
    group_id_2: Joi.string().allow("Lord", "King", "Prince"].default("Prince") ,
    /* foreignKey() indicates that group_id_3 is the FOREIGN KEY of the column 'id' in the table 'groups' */ 
    group_id_3: Joi.string().foreignKey('groups', 'id')
    /* SQL Cascades */ 
    group_id_4: Joi.string().foreignKey('groups', 'id').deleteCascade().updateCascade(),
    /*
        populate() indicates the link between two columns from different tables without sql consequences.
        (This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.)
    */
    group_id_5: Joi.string().populate('groups', 'id'),
    /* required() set the column as NOT NULL SQL constraint */
    group_id_6: Joi.string().allow("Lord", "King", "Prince"].required(),

})
```


