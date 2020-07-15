import fs from 'fs'
import { Manager } from './'
import config from '../../config'
import { IMigration, ITemplate } from '../types'
import { getTableAnalyzation, jsonToAnalyzation } from '../parse' 
import { 
    renderTemplateAdded,
    renderTemplateDeleted,
    renderTemplateUpdated,
    renderTemplateRenamed,
} from '../templates'

export default (m: Manager) => {

    const path = (name: string) => {
        const path = `${config.historyDir()}/migrations/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const migrate = async (table: string) => {
        return await config.mysqlConnexion().migrate.latest({
            directory: path(table)
        })        
    } 

    const migrateAll = async (tables: string[]) => {
        return await config.mysqlConnexion().migrate.latest({
            directory: tables.map((table) => path(table))
        })
    }

    const get = (mig: IMigration): ITemplate[] => {
        const changes = m.getChanges(mig)
        if (!changes)
            return [];
            
        const { added, deleted, renamed, updated } = changes
        const ret = []
        const oldTable = jsonToAnalyzation(m.schema().lastSavedContent(mig.table))
        const newTable = getTableAnalyzation(m.tableString(mig))        

        deleted.length > 0 && ret.push(renderTemplateDeleted(deleted, oldTable.columns))
        const renamedTemplate = renderTemplateRenamed(renamed)
        const addedTemplate = renderTemplateAdded(added, newTable.columns)
        const updatedTemplate = renderTemplateUpdated(updated, oldTable, newTable, mig.table)

        const r: ITemplate = {
            up: renamedTemplate.up + addedTemplate.up + updatedTemplate.up,
            down: renamedTemplate.down + addedTemplate.down + updatedTemplate.down,
            extraUp: updatedTemplate.extraUp,
            extraDown: updatedTemplate.extraDown
        }
        ret.push(r)
        return ret
    }


    const removeAll = (name: string) => fs.rmdirSync(path(name), { recursive: true })

    const removeLast = (name: string) => {
        const list = getListFiles(name)
        list.length > 0 && fs.unlinkSync(list[0])
    }

    const getListFiles = (name: string) => {
        return fs.readdirSync(path(name), 'utf8')
                .filter((e) => e.split('_')[0] === name)
                .reverse()
    }

    const create = async (name: string) => await config.mysqlConnexion().migrate.make(name, { directory: path(name) })
    
    const upateMigrationFileContent = (filePath: string, content: string) => {
        fs.writeFileSync(filePath, content)
    }

    return { 
        get,
        migrate, migrateAll,
        removeLast, removeAll,
        path, create, getListFiles,
        upateMigrationFileContent 
    }
}