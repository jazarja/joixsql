import fs from 'fs'
import _ from 'lodash'
import knex, {MySqlConnectionConfig} from 'knex'

let connexion: any = null

interface IConfig {
    mysqlConfig: MySqlConnectionConfig
    historyDir: string
    production: boolean
    criticalCode: string | null
    enableCriticalConfirmation: boolean
}

export class Config {

    private _config: IConfig = {
        mysqlConfig: {},
        historyDir: '',
        production: false,
        criticalCode: null,
        enableCriticalConfirmation: true
    }

    private _makeConnexion = (config: MySqlConnectionConfig) => connexion = knex({ client: 'mysql', connection: config })

    config = () => this._config
    isProd = () => this.config().production
    mysqlConfig = (): MySqlConnectionConfig => this.config().mysqlConfig
    criticalCode = () => this.config().criticalCode
    migrationDir = () => this.historyDir() + '/migrations'

    isCriticalConfirmationEnabled = () => this.config().enableCriticalConfirmation

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

    enableCriticalConfirmation = () => this._config = Object.assign({}, this.config(), {enableCriticalConfirmation: true})
    disableCriticalConfirmation = () => this._config = Object.assign({}, this.config(), {enableCriticalConfirmation: false})

    setCriticalCode = (code: string) => {
        this._config = Object.assign({}, this.config(), {criticalCode: code})
    }

    set = ( config: any ) => {
        if (!_.isEqual(config.mysqlConfig, this.mysqlConfig()) && !!config.mysqlConfig)
            this._makeConnexion(config.mysqlConfig)
        this._config = Object.assign({}, this.config(), config)
    }

}

export default new Config() 