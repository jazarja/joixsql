import Joi, {JoiMySQL as JoiMySQLExtension} from './src/table-engine/joi/extension'
import { 
    JoiSQLStringSchema,
    JoiSQLNumberSchema,
    JoiSQLDateSchema,
    JoiSQLBooleanSchema,
    JoiSQLRoot
} from './src/table-engine/joi/types'
import { IAnalyze, IRef, IForeign, IPopulate } from './src/table-engine/types'
import { IUpdated, ITemplate, TColumn } from './src/migration-engine/template/types'

import MigrationManager from './src/migration-engine'
import TableEngine from './src/table-engine'
import Ecosystem, { ISchema, IVerify } from './src/ecosystem'
import Config, { IConfig} from './src/config'

const config = new Config()

export default {
    JoiMySQLExtension,
    Joi,
    TableEngine,
    config,
    MigrationManager,
    Ecosystem,
    Config
}

export { 
    JoiMySQLExtension,
    Joi,
    TableEngine,
    config,
    MigrationManager,
    Ecosystem,
    Config
}


export {
    IUpdated,
    ITemplate,
    TColumn,
    JoiSQLStringSchema,
    JoiSQLNumberSchema,
    JoiSQLDateSchema,
    JoiSQLBooleanSchema,
    JoiSQLRoot,
    IAnalyze,
    IRef,
    IForeign,
    IPopulate,
    ISchema, 
    IVerify,
    IConfig
}