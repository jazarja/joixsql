import fs from 'fs'
import { config } from '../../../index'
import { Manager } from '../index'
import { renderFullTemplate } from '../template/template'
import { IModel } from '../../ecosystem'
import { tableToJSON } from '../template/parse'
import { sortTableToCreate } from '../../table-engine/index'

var beautify = require('js-beautify').js

export default (m: Manager) => {
    
    const doesExist = (name: string) => fs.existsSync(path(name))
    const createPath = (name: string) => fs.mkdirSync(path(name), { recursive: true })
    
    const create = async (name: string) => {
        if (!doesExist(name))
            createPath(name)
        return await config.connection().migrate.make(name, { directory: path(name) })
    }
    
    const get = async (mig: IModel) => {
        const oldTable = m.schema().lastSavedContent(mig.tableName)
        const newTable = tableToJSON(m.schema().toTableString(mig))
        return await renderFullTemplate(oldTable, newTable, mig.tableName)
    }

    const getListFiles = (name: string) => {
        if (!doesExist(name))
            return []
        return fs.readdirSync(path(name), 'utf8')
                // .filter((e) => e.split('_')[0] === name)
                .reverse()
    }

    const getListMigrationPaths = () => sortTableToCreate().filter((table: string) => doesExist(table)).map((table: string) => path(table))

    //Migrate every last history migration files
    const migrateAll = async () => {
        return await config.connection().migrate.latest({
            directory: getListMigrationPaths(),
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
        migrateAll,
        removeLast, removeAll,
        path, create, getListFiles,
        updateMigrationFileContent,
        getListMigrationPaths
    }
}