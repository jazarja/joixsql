# Joi SQL ⛓️
> Create your schemas with Joi, generate your tables with Joi-MySQL.

<br />

#### ⚠️ The project only support the strict minimum features about data types and sql options. If you want to improve the library please feel free to pull request!

### Features
- Joi types supported : `Date`, `String`, `Number`, `Boolean`
- MySQL Create table options supported : `Primary Key`, `Foreign Keys`, `AUTO INCREMENT`, `DEFAULT VALUE`, `ON CASCADE`, `UNIQUE`, `NOT NULL`

<br />

## Usage

```
yarn add joi-mysql
```

### Example:
```js

import JoiMySQL, { Engine } from 'joi-mysql'
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
CREATE TABLE IF NOT EXISTS users (
     id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(30) NOT NULL UNIQUE,
     team ENUM('lord','emporor','king','prince','noob') DEFAULT 'noob' NOT NULL,
     created_at DATETIME DEFAULT now(),
     coins FLOAT DEFAULT 0,
     coins_pending FLOAT DEFAULT 0,
     email_confirmed boolean DEFAULT false,
     email VARCHAR(255) BINARY UNIQUE,
     device INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
     access_token VARCHAR(70),
     birth_year SMALLINT UNSIGNED,
     card VARCHAR(32),
     password VARCHAR(30) BINARY,
     repeat_password VARCHAR(30) BINARY,
)
```

<br />

## Joi-MySQL extended

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
    | required() |`NOT NULL` |  |
    | default(value: number) |`DEFAULT` |  |
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
1. `timestamp('javascript')` is not supported (mysql doesn't store Milliseconds), but you can use timestamp('unix').

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
