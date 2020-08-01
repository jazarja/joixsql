export const LIST_SUPPORTED_TYPES: any = ['string', 'number', 'boolean', 'date']
export const DEFAULT_SQL_TYPES: any = [
    {
        key: 'string',
        type: 'text'
    },
    {
        key: 'number',
        type: 'int'
    },
    {
        key: 'boolean',
        type: 'boolean'
    },
    {
        key: 'date',
        type: 'timestamp'
    }
]

export const MYSQL_STRING_TYPES: any = [
    {
        type: 'varchar',
        min: 1,
        max: 65535
    },
    {
        type: 'mediumtext',
        min: 1,
        max: 16777215
    },
    {
        type: 'longtext',
        min: 1,
        max: 4294967295
    }
]

export const MYSQL_NUMBER_TYPES: any = [
    {
        type: 'tinyint',
        min: -128,
        max: 127
    },
    {
        type: 'smallint',
        min: -32768,
        max: 32767
    },
    {
        type: 'mediumint',
        min: -8388608,
        max: 8388607
    },
    {
        type: 'int',
        min: -2147483648,
        max: 2147483647
    },
    {
        type: 'bigint',
        min: -9223372036854775808,
        max: 9223372036854775807
    },
]