import fs from 'fs'
import _ from 'lodash'
import knex, {MySqlConnectionConfig} from 'knex'
import Ecosystem from './ecosystem'

let connexion: any = null

export interface IConfig {
    //MySQL configuration object
    mysqlConfig?: MySqlConnectionConfig
    //Directory path where the migrations and schemas history are stored
    historyDir?: string
    //Critical code given by JoixSQL used in critical migrations like column removal.
    criticalCode?: string | null
    //whether critical code confirmation is enabled in critical migrations.
    enableCriticalConfirmation?: boolean
    //whether history of migrations should be removed on migration error.
    enableMigrationRemovingOnError?: boolean
    //wether logs are enabled
    enableLog?: boolean,
    //Set the Ecosytem class
    ecosystem?: Ecosystem | null
}

export default class Config {

    private _config: IConfig = {
        mysqlConfig: {},
        historyDir: '',
        criticalCode: null,
        enableLog: true,
        enableCriticalConfirmation: true,
        enableMigrationRemovingOnError: true,
        ecosystem: null
    }

    //Build the connexion with knex to the MySQL database
    private _makeConnexion = (config: MySqlConnectionConfig) => {
        if (!config.charset){
            config.charset = 'utf8mb4'
        }
        connexion = knex({ client: 'mysql', connection: config })
    }

    //Returns the config
    config = () => this._config
    //Returns the MySQL config
    mysqlConfig = (): MySqlConnectionConfig | null => this.config().mysqlConfig || null
    //Returns the critical code
    criticalCode = () => this.config().criticalCode
    //Returns the migrations history directory
    migrationDir = () => this.historyDir() + '/migrations'
    //Returns the ecosystem
    ecosystem = () => this.config().ecosystem

    //Return true if the critical code confirmation is enabled.
    isCriticalConfirmationEnabled = () => this.config().enableCriticalConfirmation
    isLogEnabled = () => this.config().enableLog
    //Return true if the ecosystem has been set
    hasEcosystem = () => this.ecosystem() != null

    //Returns the schemas and migrations history directory
    historyDir = () => {
        if (this.config().historyDir !== ''){
            if (!fs.existsSync(this.config().historyDir || ''))
                fs.mkdirSync(this.config().historyDir as string)
            return this.config().historyDir
        } else 
            throw new Error("You need to specify a history path directory before using ecosystem related methods.")
    }

    //Returns the migration configuration
    migrationConfig = () => {
        this.historyDir()
        return {
            directory: this.migrationDir(),
            extension: 'js',
            sortDirsSeparately: false
        }
    }

    //Returs the MySQL connexion through Knex
    mysqlConnexion = (): knex<any, unknown[]> => {
        if (connexion === null)
            throw new Error("You need to set a MySQL configuration first.")
        return connexion  as knex<any, unknown[]>
    }

    setEcosystem = (ecosystem: Ecosystem) => this.set({ ecosystem })
    removeEcosystem = () => this.set({ecosystem: null})

    enableCriticalConfirmation = () => this.set({enableCriticalConfirmation: true})
    disableCriticalConfirmation = () => this.set({enableCriticalConfirmation: false}) 

    enableLog = () => this.set({enableLog: true})
    disableLog = () => this.set({enableLog: false})
    setHistoryDir = (historyDir: string) => this.set({historyDir})

    isRemovingMigrationOnErrorEnabled = () => this.config().enableMigrationRemovingOnError
    enableMigrationRemovingOnError = () => this.set({ enableMigrationRemovingOnError: true  })    
    disableMigrationRemovingOnError = () => this.set({ enableMigrationRemovingOnError: false  })    

    setCriticalCode = (code: string) => this.set({criticalCode: code})
    
    set = (config: IConfig) => {
        if (!_.isEqual(config.mysqlConfig, this.mysqlConfig()) && !!config.mysqlConfig)
            this._makeConnexion(config.mysqlConfig)
        this._config = Object.assign({}, this.config(), config)
    }
}