<p align="center" font-style="italic" >
  <a>
    <img alt="acey" src="https://siasky.net/LADIrJJw-LSGC_dYiPBMwklV65NE-w9rqY-bKWHJiXmH_g" width="100%">
  </a>
</p>

<br />

### What if you could automatize your MySQL/MariaDB table creation and migration based on your **[Joi](https://joi.dev/api)** schemas ?

*Well, now you can.*

<br />

<br />

<br />


## Get Started:

<p align="right" font-style="italic">
  <a target="_blank" href="https://github.com/elzeardjs/joixsql/tree/master/example">Run the example</a>
</p>


```ts
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
```

<br />
<br />


## Extensions :

### General:

#### general: unique

unique() set a SQL Unique constraint

```ts
Joi.object({
    email: Joi.string().email().unique()
})
```

#### general: group

group() has NO effect on MySQL/MariaDB. 
Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they are included in a group, to avoid rendering the whole object when no need.

```ts
Joi.object({
    email: Joi.string().email().group(['full', 'preview'])
})
```

#### general: Default 

default() will do a DEFAULT constraint on MySQL/Maria

```ts
Joi.object({
    count: Joi.number().max(150).min(0).default(0)
})
```

#### general: Foreign Key 

foreignKey() indicates that **'title'** is the FOREIGN KEY of the column **'id'** in the table **'categories'**

```ts
Joi.object({
    title: Joi.string().foreignKey('categories', 'id')
})
```


#### general: Cascades (only with foreign key)

```ts
Joi.object({
    title: Joi.string().foreignKey('categories', 'id').deleteCascade().updateCascade()
})
```

#### general: Populate

populate() indicates the link between two columns from different tables without sql consequences.
<br />
This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.

```ts
Joi.object({
    title: Joi.string().populate('categories', 'id')
})
```

#### general: Required

required() set the column as NOT NULL SQL constraint

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince").required()
})
```

<br />
<br />

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

#### strings: Allow (Enum)

allow() set the column as a MySQL/Maria ENUM

```ts
Joi.object({
    title: Joi.string().allow("Lord", "King", "Prince")
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
