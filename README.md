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

#### strings: email and other types

String types like email() automatically set the column's right data type:
- email, domain, hostname, ipVersion: **255 chars** max.
- dataUri, uri, uriCustomScheme, uriRelativeOnly: **90,000 chars** max.
- guid: **70 chars** max.
- creditCard, ip, isoDate, isoDuration: **32 chars** max.

```ts
Joi.object({
    email: Joi.string().email(),
    credit_card: Joi.string().creditCard()
    ...
})
```

#### strings: min() / max()

min(), and max() will determine the sql data type. https://www.mysqltutorial.org/mysql-text/

```ts
Joi.object({
    username: Joi.string().min(3).max(20)
})
```

#### strings: Nothing

If no max() nor string type is set, the SQL type will be by default TEXT (max 65,535 chars)

```ts
Joi.object({
    username: Joi.string()
})
```

#### strings: Unique (only on strings below 256 chars)

unique() set a SQL Unique constraint

```ts
Joi.object({
    email: Joi.string().email().unique()
})
```

#### strings: Groups

groups() has NO effect on MySQL/MariaDB. 
Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they are included in a group, to avoid rendering the whole object when no need.

```ts
Joi.object({
    username: Joi.string().email().groups(['full', 'preview'])
})
```

#### strings: Allow (Enum)

allow() set the column as a MySQL/Maria ENUM

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince")
})
```

#### strings: Default 

default() will do a DEFAULT constraint on MySQL/Maria

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince").default("Prince")
})
```

#### strings: Foreign Key 

foreignKey() indicates that **'title'** is the FOREIGN KEY of the column **'id'** in the table **'groups'**

```ts
Joi.object({
    title: Joi.string().foreignKey('groups', 'id')
})
```

#### strings: Cascades (only with foreign key)

```ts
Joi.object({
    title: Joi.string().foreignKey('groups', 'id').deleteCascade().updateCascade()
})
```

#### strings: Populate

populate() indicates the link between two columns from different tables without sql consequences.
<br />
This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.

```ts
Joi.object({
    title: Joi.string().populate('groups', 'id')
})
```

#### strings: Required

required() set the column as NOT NULL SQL constraint

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince").required()
})
```

<br />
<br />

### Numbers

#### numbers: Primary key
```ts
Joi.object({
    id: Joi.number().primaryKey()
})
```

#### numbers: Auto increment

Increment each new row on MYSQL / MariaDB

```ts
Joi.object({
    id: Joi.number().primaryKey().autoIncrement()
})
```

#### numbers: Float

Float number type: https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html

```ts
Joi.object({
    //max 999,999,999.99; min -999,999,999.99
    amount: Joi.number().float(11, 2)
    //max 99.999; min -99.999
    amount_2: Joi.number().float(5, 3)
})
```

#### numbers: Double

Double number type: min -1.7976931348623157E+308, max 1.7976931348623157E+308

```ts
Joi.object({
    stars_count: Joi.number().double()
})
```

#### numbers: Allow (Enum)

allow() set the column as a MySQL/Maria ENUM

```ts
Joi.object({
    class: Joi.number().allow(1, 2, 3)
})
```

#### numbers: port

Numbers types like portSet() automatically set the column's right data type:
- portSet: int unsigned | min: 0, max: 4,294,967,295.

```ts
Joi.object({
    port: Joi.number().port(),
})
```

#### numbers: min() / max()

min(), and max() will determine the sql data type (https://github.com/elzeardjs/joixsql/blob/master/src/table-engine/mysql/types.ts)

```ts
Joi.object({
    //Here: Unsigned int
    player_id: Joi.number().min(0).max(2_000_000_000)
})
```

#### numbers: positive

positive() is equivalent to min(>=0). It will set the number as unsigned (if integers)

```ts
Joi.object({
    //Here: Unsigned int
    player_id: Joi.number().positive().max(2_000_000_000)
})
```