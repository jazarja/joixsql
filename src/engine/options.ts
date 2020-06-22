import knex from 'knex'

interface IOptions {
    onParseError: Function,
    mysqlConfig: knex.ConnectionConfig
}

export default class Options {

    private _options: IOptions
    constructor(options: IOptions){
        this._options = Object.assign({}, {onParseError: () => null}, options)
    }

    set = (options: any) => this._options = Object.assign({}, this._options, options)
    get = () => this._options
    onParseError = (...props: any) => this.get().onParseError(...props)
    mysqlConfig = () => this.get().mysqlConfig
}