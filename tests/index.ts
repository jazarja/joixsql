import { config } from '../index'
import 'mocha';
import knex from 'knex';

const TABLE_ENGINE_ERRORS_ENABLED = true
const GENERATE_DEFAULT_VALUE_ERRORS_ENABLED = true
const NUMBER_DEFAULT_VALUE_ENABLED = true
const STRING_DEFAULT_VALUE_ENABLED = true
const DATE_DEFAULT_VALUE_ENABLED = true
const MYSQL_CONNECTED_ENABLED = true
const ECOSYSTEM_ENABLED = true
const BASIC_AUTO_MIGRATION_ENABLED = true
const HARD_MIGRATION_ENABLED = true


const knexConfig = {
    client: 'mysql',
    connection: {
        "host": "localhost",
        "user": "root",
        "password": "testroot",
        "database": "test",
        // "ssl": {
        //   "rejectUnauthorized": "true",
        //   "secureProtocol": "TLSv1_2_method"
        // }
    }
}

const knexInstance = knex(knexConfig);


config.set({
    knex: knexInstance,
    historyDir: './history'
})

const main = async () => {
    describe('Table-Engine errors.', () => TABLE_ENGINE_ERRORS_ENABLED && require('./table-engine-errors'))
    describe(`Table-Engine GENERAL defaut value errors.`, () => GENERATE_DEFAULT_VALUE_ERRORS_ENABLED && require('./general-default-value-errors'))
    describe(`Table-Engine NUMBER defaut value errors.`, () => NUMBER_DEFAULT_VALUE_ENABLED && require('./number-default-value-errors'))
    describe(`Table-Engine STRING defaut value errors.`, () => STRING_DEFAULT_VALUE_ENABLED && require('./string-default-value-errors'))
    describe(`Table-Engine DATE defaut value errors.`, () => DATE_DEFAULT_VALUE_ENABLED && require('./date-default-value-errors'))
    describe('Connected tests with MySQL server', () => MYSQL_CONNECTED_ENABLED && require('./mysql-connected'))
    describe('Ecosystem methods', () => ECOSYSTEM_ENABLED && require('./ecosystem'))
    describe(`Soft connected tests on auto-migration`, () => BASIC_AUTO_MIGRATION_ENABLED && require('./auto-migration'))
    describe(`Hard connected tests on auto-migration`, () => HARD_MIGRATION_ENABLED && require('./advanced-migration'))
}

main()
