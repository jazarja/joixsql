# Joi To SQL ⛓️
> Create your schemas with Joi, generate your tables with Joi To SQL.

<br />

#### ⚠️ The project only support the strict minimum features about data types and sql options (ON MYSQL). If you want to improve the library please feel free to pull request!
The library architecture and its implemetation have been built in such a way that is easy to iterate it and adding more features support or more databases support.

The SQL builder is made with [Knex](https://knexjs.org/).

### Features
- Joi types supported : `Date`, `String`, `Number`, `Boolean`
- MySQL Create table options supported : `Primary Key`, `Foreign Keys`, `AUTO INCREMENT`, `DEFAULT VALUE`, `ON DELETE CASCADE`, `ON UPDATE CASCADE`, `UNIQUE`, `NOT NULL`

<br />

## Usage

```
yarn add joi-to-sql
```

### Example:
```js

import JoiMySQL, { Engine } from 'joi-to-sql'
const Joi = JoiMySQL(require('@hapi/joi'))

const schema = Joi.object({
    id: Joi.number().required().primaryKey().autoIncrement(),
    username: Joi.string().alphanum().min(3).max(30).required().unique().insensitive(),
    team: Joi.string().required().valid('lord', 'emporor', 'king', 'prince', 'noob').default('noob').insensitive()
    created_at: Joi.date().default('now')
    coins: Joi.number().precision(2).default(0),
    coins_pending: Joi.number().float().default(0),
    email_confirmed: Joi.boolean().default(false),
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).unique(),
    device: Joi.number().required().foreignKey('devices', 'id').deleteCascade()
    access_token: Joi.string().guid({version: ['uuidv4']})
    birth_year: Joi.number().min(1900).max(2013),
    card: Joi.string().creditCard(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]$')).min(3).max(30),
    repeat_password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]$')).min(3).max(30),
})

const engine = new Engine(schema, { table: 'users'})
console.log(engine.generateTable())
```

Output: 
```
create table `users` (`id` int unsigned not null auto_increment primary key, `username` varchar(30) not null, `team` enum('lord', 'emporor', 'king', 'prince', 'noob') not null default 'noob', `created_at` datetime default now(), `coins` float(2, 2) default '0', `coins_pending` float(8, 2) default '0', `email_confirmed` boolean default '0', `email` varchar(255), `device` int not null, `access_token` varchar(70), `birth_year` smallint unsigned, `card` varchar(32), `password` varchar(30), `repeat_password` varchar(30));
alter table `users` add unique `user_username_unique`(`username`);
alter table `users` add unique `user_email_unique`(`email`);
alter table `users` add constraint `user_device_foreign` foreign key (`device`) references `devices` (`id`) on delete CASCADE
```

<br />

## Joi To Sql extended

- ### String (default type: `TEXT`):

    | Name | MySQL Option | Description |
    | -- | -- | -- |
    | unique() |`UNIQUE` | Only if the string length is clearly or implicitely defined (by using string types like email, creditCard, etc.. from Joi) |
    | primaryKey() |`PRIMARY KEY` | |
    | required() |`NOT NULL` |  |
    | default(value: string) |`DEFAULT` |  |
    | foreignKey(reference_table: string, reference_row: string) |`FOREIGN KEY` | |
    | deleteCascade(reference_table: string, reference_row: string) |`ON DELETE CASCADE` | works only if foreignKey is set |
    | updateCascade(reference_table: string, reference_row: string) |`ON UPDATE CASCADE` | works only if foreignKey is set |


#### More:
1. `min` and `max` are the best way to set the data type of your string in MySQL because length is not detected in your regex if you use pattern.
2. Specific Joi string types like `email`, `uuid`, etc... are correctly supported, no need to set a specific size for them.


<br />

- ### Number (default type: `INT`):


    | Name | MySQL Option | Description |
    | -- | -- | -- |
    | float() |`FLOAT` | Specify if the number is a float |
    | double() |`DOUBLE` | Specify if the number is a double |
    | unique() |`UNIQUE` |  |
    | primaryKey() |`PRIMARY KEY` |  |
    | autoIncrement() |`UNSIGNED INT PRIMARY KEY AUTO INCREMENTS` |  |
    | required() |`NOT NULL` |  |
    | default(value: number) |`DEFAULT ${value}` |  |
    | foreignKey(reference_table: string, reference_row: string) |`FOREIGN KEY` |  |
    | deleteCascade(reference_table: string, reference_row: string) |`ON DELETE CASCADE` | works only if foreignKey is set |
    | updateCascade(reference_table: string, reference_row: string) |`ON UPDATE CASCADE` | works only if foreignKey is set |

#### More:
1. `min`, `max`, `less` and `greater` are the best way to set the data type of your number in MySQL.


<br />

- ### Date (default type: `DATETIME`):

    | Name | MySQL Option | Description |
    | -- | -- | -- |
    | unique() |`UNIQUE` | |
    | primaryKey() |`PRIMARY KEY` | |
    | required() |`NOT NULL` |  |
    | default(value: 'now' / number / string) |`DEFAULT` |  |
    | foreignKey(reference_table: string, reference_row: string) |`FOREIGN KEY` | |
    | deleteCascade(reference_table: string, reference_row: string) |`ON DELETE CASCADE` | works only if foreignKey is set |
    | updateCascade(reference_table: string, reference_row: string) |`ON UPDATE CASCADE` | works only if foreignKey is set |

#### More:
1. `timestamp('javascript')` is not supported (mysql doesn't store Milliseconds natively), but you can use timestamp('unix').

<br />

- ### Bool (default type: `BOOLEAN`):

    | Name | MySQL Option | Description |
    | -- | -- | -- |
    | required() |`NOT NULL` |  |
    | default(value: boolean) |`DEFAULT` |  |

<br />

<br />

______
### Ideas of unsupported features that could become supported : 
- Joi refs
- Length in regex (with pattern) is not detected
- CHECK Options on sql create table
