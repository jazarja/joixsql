import JoiMySQL from './src/joi-extension'
import { 
    JoiSQLStringSchema,
    JoiSQLNumberSchema,
    JoiSQLDateSchema,
    JoiSQLBooleanSchema,
    JoiSQLRoot
} from './src/joi-types'
import { IAnalyze, IRef, IForeign, IPopulate } from './src/table-engine/types'
import { IChange, IFullColumn, IInfo, IRenamed, ITemplate, TColumn } from './src/auto-migration/types'

import TableMakerEngine from './src/table-engine'
import config from './src/config'
import MigrationManager from './src/auto-migration'

export default {
    JoiMySQL,
    TableMakerEngine,
    MigrationManager,
    config
}

export { 
    JoiMySQL,
    TableMakerEngine,
    MigrationManager,
    config
}

export {
    IChange,
    IFullColumn,
    IInfo,
    IRenamed,
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