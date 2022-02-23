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


## Extensions :

### Strings

#### email and other types

String types like email() automatically set the column's right data type:
- email, domain, hostname, ipVersion: 255 chars max.
- dataUri, uri, uriCustomScheme, uriRelativeOnly: 90,000 chars max.
- guid: 70 chars max.
- creditCard, ip, isoDate, isoDuration: 32 chars max.

```ts
Joi.object({
    email: Joi.string().email(),
    credit_card: Joi.string().creditCard()
    ...
})
```

#### min() / max()

min(), and max() will determine the sql data type. https://www.mysqltutorial.org/mysql-text/

```ts
Joi.object({
    username: Joi.string().min(3).max(20)
})
```

#### Nothing

If no max() nor string type is set, the SQL type will be by default TEXT (max 65,535 chars)

```ts
Joi.object({
    username: Joi.string()
})
```

#### Unique (only on strings below 256 chars)

unique() set a SQL Unique constraint

```ts
Joi.object({
    email: Joi.string().email().unique()
})
```

#### Groups

groups() has NO effect on MySQL/MariaDB. 
Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they are included in a group, to avoid rendering the whole object when no need.

```ts
Joi.object({
    username: Joi.string().email().groups(['full', 'preview'])
})
```

#### Allow (Enum)

allow() set the column as a MySQL/Maria ENUM

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince")
})
```

#### Default 

default() will do a DEFAULT constraint on MySQL/Maria

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince").default("Prince")
})
```

#### Foreign Key 

foreignKey() indicates that **'title'** is the FOREIGN KEY of the column **'id'** in the table **'groups'**

```ts
Joi.object({
    title: Joi.string().foreignKey('groups', 'id')
})
```

#### Cascades (only with foreign key)

SQL Cascades.

```ts
Joi.object({
    title: Joi.string().foreignKey('groups', 'id').deleteCascade().updateCascade()
})
```

#### Populate

populate() indicates the link between two columns from different tables without sql consequences.
<br />
This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.

```ts
Joi.object({
    title: Joi.string().populate('groups', 'id')
})
```

#### Required

required() set the column as NOT NULL SQL constraint

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince").required()
})
```