import fs from 'fs'
import config from '../../config'
import { Manager } from '../index'
import { renderFullTemplate } from '../template/template'
import { IModel } from '../../ecosystem'
import { tableToJSON } from '../template/parse'
var beautify = require('js-beautify').js

export default (m: Manager) => {
    
    const create = async (name: string) => await config.mysqlConnexion().migrate.make(name, { directory: path(name) })
    
    const get = (mig: IModel) => {
        const oldTable = m.schema().lastSavedContent(mig.tableName)
        const newTable = tableToJSON(m.schema().toTableString(mig))
        return renderFullTemplate(oldTable, newTable, mig.tableName)
    }

    const getListFiles = (name: string) => {
        return fs.readdirSync(path(name), 'utf8')
                // .filter((e) => e.split('_')[0] === name)
                .reverse()
    }

    const migrateUp = async (table: string) => {
        return await config.mysqlConnexion().migrate.up({
            directory: path(table)
        })        
    }

    const migrateAll = async () => {
        return await config.mysqlConnexion().migrate.latest({
            directory: m.schema().getAllTableName().map((table: string) => path(table))
        })
    }

    const path = (name: string) => {
        const path = `${config.historyDir()}/migrations/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const removeAll = (name: string) => fs.rmdirSync(path(name), { recursive: true })

    const removeLast = (name: string) => {
        const list = getListFiles(name)
        list.length > 0 && fs.unlinkSync(list[0])
    }

    const updateMigrationFileContent = (filePath: string, content: string) => {
        fs.writeFileSync(filePath, beautify(content, { indent_size: 3, space_in_empty_paren: true }))
    }

    return { 
        get,
        migrateUp, migrateAll,
        removeLast, removeAll,
        path, create, getListFiles,
        updateMigrationFileContent 
    }
}