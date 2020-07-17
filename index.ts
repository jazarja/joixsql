import JoiMySQL from './src/joi-extension'
import { 
    JoiSQLStringSchema,
    JoiSQLNumberSchema,
    JoiSQLDateSchema,
    JoiSQLBooleanSchema,
    JoiSQLRoot
} from './src/joi-types'
import { IAnalyze, IRef, IForeign, IPopulate } from './src/table-engine/types'
import { IUpdated, ITemplate, TColumn } from './src/auto-migration/template/types'

import MigrationManager from './src/auto-migration/managers'
import TableMakerEngine from './src/table-engine'
import config from './src/config'

export default {
    JoiMySQL,
    TableMakerEngine,
    config,
    MigrationManager
}

export { 
    JoiMySQL,
    TableMakerEngine,
    config,
    MigrationManager
}

export {
    IUpdated,
    ITemplate,
    TColumn
}

export {
    JoiSQLStringSchema,
    JoiSQLNumberSchema,
    JoiSQLDateSchema,
    JoiSQLBooleanSchema,
    JoiSQLRoot,
    IAnalyze,
    IRef,
    IForeign,
    IPopulate
}