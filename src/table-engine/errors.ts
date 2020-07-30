import { LIST_SUPPORTED_TYPES } from './mysql/types'


export default {
    noEcosystem: () => new Error(`You need to setup a schema Ecosystem to perform this action.`),
    crossedForeignKeys: (tablesWithFK: string[]) => new Error(`Table${tablesWithFK.length > 1 ? 's' : ''}: ${tablesWithFK.join(', ')} not created because of crossed foreign keys`),
    reservedMySQLTransacKeyWord: (column: string) => new Error(`You can't use ${column} as a table or column name. ${column} is a transact-SQL reserved word. More details here: https://dev.mysql.com/doc/refman/8.0/en/keywords.html`),
    wrongColumnOrTableFormat: (key: string) => new Error(`Table or column ${key} has a wrong format. It should be respecting this regex format: /^[A-Za-Z0-9][A-Za-Z0-9_]*$/ | examples: user_id, user1, user_1, user_ID_1, USER_ID`),
    manyPrimaryKey: (table: string) => new Error(`Your table ${table} contains many primary keys`),
    unsupportedType: (t: string) => new Error(`${t} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`)
}