import fs from 'fs'
import { config } from '../../../index'
import { Manager } from '../index'
import { renderFullTemplate } from '../template/template'
import { IModel } from '../../ecosystem'
import { tableToJSON } from '../template/parse'
var beautify = require('js-beautify').js

export default (m: Manager) => {
    
    const doesExist = (name: string) => fs.existsSync(path(name))
    const createPath = (name: string) => fs.mkdirSync(path(name), { recursive: true })
    
    const create = async (name: string) => {
        if (!doesExist(name))
            createPath(name)
        return await config.mysqlConnexion().migrate.make(name, { directory: path(name) })
    }
    
    const get = (mig: IModel) => {
        const oldTable = m.schema().lastSavedContent(mig.tableName)
        const newTable = tableToJSON(m.schema().toTableString(mig))
        return renderFullTemplate(oldTable, newTable, mig.tableName)
    }

    const getListFiles = (name: string) => {
        if (!doesExist(name))
            return []
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

    const path = (name: string) => `${config.historyDir()}/migrations/${name}`

    const removeAll = (name: string) => {
        if (!doesExist(name))
            return
        fs.rmdirSync(path(name), { recursive: true })
    }

    const removeLast = (name: string) => {
        const list = getListFiles(name)
        list.length > 0 && fs.unlinkSync(list[0])
    }

    const updateMigrationFileContent = (filePath: string, content: string) => {
        fs.writeFileSync(filePath, beautify(content, { indent_size: 3, space_in_empty_parent: true }))
    }

    return { 
        get,
        migrateUp, migrateAll,
        removeLast, removeAll,
        path, create, getListFiles,
        updateMigrationFileContent 
    }
}