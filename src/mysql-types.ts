export const LIST_SUPPORTED_TYPES: any = ['string', 'number', 'boolean', 'date']
export const DEFAULT_SQL_TYPES: any = [
    {
        key: 'string',
        type: 'TEXT'
    },
    {
        key: 'number',
        type: 'INT'
    },
    {
        key: 'boolean',
        type: 'BOOLEAN'
    },
    {
        key: 'date',
        type: 'TIMESTAMP'
    }
]

export const MYSQL_STRING_TYPES: any = [
    {
        type: 'TINYTEXT',
        min: 1,
        max: 255
    },
    {
        type: 'TEXT',
        min: 1,
        max: 65535
    },
    {
        type: 'MEDIUMTEXT',
        min: 1,
        max: 16777215
    },
    {
        type: 'LONGTEXT',
        min: 1,
        max: 4294967295
    }
]

export const MYSQL_NUMBER_TYPES: any = [
    {
        type: 'TINYINT',
        min: -128,
        max: 127
    },
    {
        type: 'SMALLINT',
        min: -32768,
        max: 32767
    },
    {
        type: 'MEDIUMINT',
        min: -8388608,
        max: 8388607
    },
    {
        type: 'INT',
        min: -2147483648,
        max: 2147483647
    },
    {
        type: 'BIGINT',
        min: -9223372036854775808,
        max: 9223372036854775807
    },
    {
        type: 'BIGINT',
        min: -9223372036854775808,
        max: 9223372036854775807
    }
]