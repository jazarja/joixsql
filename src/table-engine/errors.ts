import { LIST_SUPPORTED_TYPES } from './mysql/types'


export default {
    noEcosystem: () => new Error(`You need to setup a schema Ecosystem to perform this action.`),
    crossedForeignKeys: (tablesWithFK: string[]) => new Error(`Table${tablesWithFK.length > 1 ? 's' : ''}: ${tablesWithFK.join(', ')} not created because of crossed foreign keys`),
    reservedMySQLTransacKeyWord: (column: string) => new Error(`You can't use ${column} as a table or column name. ${column} is a transact-SQL reserved word. More details here: https://dev.mysql.com/doc/refman/8.0/en/keywords.html`),
    wrongColumnOrTableFormat: (key: string) => new Error(`Table or column ${key} has a wrong format. It should be respecting this regex format: /^[A-Za-Z0-9][A-Za-Z0-9_]*$/ | examples: user_id, user1, user_1, user_ID_1, USER_ID`),
    manyPrimaryKey: (table: string) => new Error(`Your table ${table} contains many primary keys`),
    unsupportedType: (t: string) => new Error(`${t} is not supported, here is the list of supported types ${LIST_SUPPORTED_TYPES.join(', ')}.`),
    elementTypeUnsupported: (column: string) => new Error(`Column: ${column} - Only string, number, boolean and Date type are accepted as default value.`),
    enumHasWrongValue: (column: string) => new Error(`Column: ${column} - Enum's default value can't be different than the values.`),
    enumHasWrongType: (column: string) => new Error(`Column: ${column} - Enum's values should have the same type than the column one.`),
    defaultValueHasWrongType: (column: string) => new Error(`Column: ${column} - Default value type can't be different than the column one.`),
    noMaxSetOnString: (column: string) => new Error(`Column: ${column} - string kind not treated, please set a max value for this field.`),
    stringDefaultValueOversized: (column: string) => new Error(`Column: ${column} - Default value length is greater than the maximum length allowed for this string.`),
    internalErrorWithDefaultValueAsNumber: (column: string) => new Error(`Column: ${column} - Internal error with default value maximum size allowed checking.`),
    defaultValueIsGreaterThanMaxType: (column: string, type: string) => new Error(`Column: ${column} - The default value is greater than the maximum value allowed by the column type: ${type}`),
    defaultValueIsLessThanMinType: (column: string, type: string) => new Error(`Column: ${column} - The default value is less than the minimum value allowed by the column type: ${type}`),
    primaryKeyIsForeign: (column: string) => new Error(`Column: ${column} - Your schema can't contain a value that is a primary key and a foreign key`),
    primaryKeyIsUnique: (column: string) => new Error(`Column: ${column} - Your schema can't contain a value that is a primary key and a unique key`),
    textDefaultValueForbidden: (column: string) => new Error(`Column: ${column} - A TEXT type can't have a default value, you need to set a column size`),
    timestampIsUnsupported: (column: string) => new Error(`Column: ${column} - Timestamp type is not supported.`),
    uniqueStringShouldHaveAMaxLengthSet: (column: string) => new Error(`Column: ${column} - The maximum length of a string with a UNIQUE constraint should be defined. The maximum size is 65535`),
    typeNotAcceptedForDefaultValue: (type: any) => new Error(`${type} is not accepted as default value`),
    forbiddenDefaultValue: (value: any, column: string) => new Error(`${value} is not accepted as default value for the column ${column}`),
}