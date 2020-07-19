import fs from 'fs'
import _ from 'lodash'
import knex, {MySqlConnectionConfig} from 'knex'
import Ecosystem from './ecosystem'

let connexion: any = null

interface IConfig {
    mysqlConfig: MySqlConnectionConfig
    historyDir: string
    production: boolean
    criticalCode: string | null
    enableCriticalConfirmation: boolean
    enableLog: boolean,
    ecosystem: Ecosystem | null
}

export class Config {

    private _config: IConfig = {
        mysqlConfig: {},
        historyDir: '',
        production: false,
        criticalCode: null,
        enableLog: true,
        enableCriticalConfirmation: true,
        ecosystem: null
    }

    private _makeConnexion = (config: MySqlConnectionConfig) => connexion = knex({ client: 'mysql', connection: config })

    config = () => this._config
    isProd = () => this.config().production
    mysqlConfig = (): MySqlConnectionConfig => this.config().mysqlConfig
    criticalCode = () => this.config().criticalCode
    migrationDir = () => this.historyDir() + '/migrations'
    ecosystem = () => this.config().ecosystem

    isCriticalConfirmationEnabled = () => this.config().enableCriticalConfirmation
    isLogEnabled = () => this.config().enableLog
    hasEcosystem = () => this.ecosystem() != null

    historyDir = () => {
        if (this.config().historyDir !== ''){
            if (!fs.existsSync(this.config().historyDir))
                fs.mkdirSync(this.config().historyDir)
            return this.config().historyDir
        } else 
            throw new Error("You need to specify a history path directory before using automatic migration.")
    }

    migrationConfig = () => {
        if (!this.historyDir())
            throw new Error("You need to specify a history path directory before using automatic migration.")

        return {
            directory: this.migrationDir(),
            extension: 'js',
            sortDirsSeparately: false
        }
    }

    mysqlConnexion = (): knex<any, unknown[]> => {
        if (connexion === null)
            throw new Error("You need to set a MySQL configuration first.")
        return connexion  as knex<any, unknown[]>
    }

    setEcoystem = (ecosystem: Ecosystem) => this.set({ ecosystem })
    removeEcosystem = () => this.set({ecosystem: null})

    enableCriticalConfirmation = () => this.set({enableCriticalConfirmation: true})
    disableCriticalConfirmation = () => this.set({enableCriticalConfirmation: false}) 

    enableLog = () => this.set({enableLog: true})
    disableLog = () => this.set({enableLog: false})

    setCriticalCode = (code: string) => this.set({criticalCode: code})
    set = ( config: any ) => {
        if (!_.isEqual(config.mysqlConfig, this.mysqlConfig()) && !!config.mysqlConfig)
            this._makeConnexion(config.mysqlConfig)
        this._config = Object.assign({}, this.config(), config)
    }

}

export default new Config() 