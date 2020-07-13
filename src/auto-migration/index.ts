import _ from 'lodash'
import fs from 'fs'
import Joi from '@hapi/joi'
import TableMaker from '../table-engine'

import { getChanges } from './changes'
import { tableToJSON, getTableAnalyzation, jsonToAnalyzation } from './parse' 
import { 
    renderTemplateAdded,
    renderTemplateDeleted,
    renderTemplateUpdated,
    renderTemplateRenamed,
    migrationTemplate
} from './templates'
import config from '../config'
import { ITemplate } from '../auto-migration/types'

const history = (m: Manager) => {

    const path = (name: string) => {
        const path = `${config.historyDir()}/schema/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const removeAll = (name: string) => getListFiles(name).forEach((e) => fs.unlinkSync(e))

    const removeLast = (name: string) => {
        const list = getListFiles(name)
        list.length > 0 && fs.unlinkSync(list[0])
    }

    const create = (schema: Joi.Schema, name: string) => {
        if (m.hasTableChanged(schema, name)){
            fs.writeFileSync(
                generateFilename(name), 
                JSON.stringify(
                    tableToJSON(m.tableString(schema, name)), 
                    null, 
                    4
                )
            )
        }
    }

    const generateFilename = (name: string) => `${path(name)}/${name}-${new Date().getTime().toString()}.json`

    const getListFiles = (name: string) => {
        return fs.readdirSync(path(name), 'utf8')
                .filter((e) => e.split('-')[0] === name)
                .sort((a: any, b: any) => b-a)
    }

    const lastFilename = (name: string) => {
        const list = getListFiles(name)
        return list.length == 0 ? null : list[0]
    }

    const lastSavedContent = (name: string) => {
        const fileName = lastFilename(name)
        if (!fileName)
            return null
        const pathName = `${path(name)}/${fileName}`
        const result = fs.readFileSync(pathName, {encoding:'utf8'})
        return JSON.parse(result)
    } 

    return {
        removeAll,
        removeLast,
        create,
        generateFilename,
        getListFiles,
        lastFilename,
        lastSavedContent
    }
}

const migration = (m: Manager) => {
    const path = (name: string) => {
        const path = `${config.historyDir()}/migrations/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const create = async (name: string) => await config.mysqlConnexion().migrate.make(name, { directory: path(name) })
    
    const upateMigrationFileContent = (filePath: string, content: string) => {
        fs.writeFileSync(filePath, content)
    }

    return { path, create, upateMigrationFileContent }
}

export class Manager {
    
    history = () => history(this)
    migration = () => migration(this)

    hasTableChanged = (schema: Joi.Schema, name: string) => {
        const last = this.history().lastSavedContent(name)
        if (last == null)
            return true
        const tableString = new TableMaker(schema, { mysqlConfig: config.mysqlConfig() }).tableString(name)
        return !_.isEqual(last, tableToJSON(tableString))
    }

    tableString = (schema: Joi.Schema, name: string) => new TableMaker(schema, { mysqlConfig: config.mysqlConfig() }).tableString(name)

    getChanges = (schema: Joi.Schema, name: string) => {
        if (this.hasTableChanged(schema, name) && this.history().lastFilename(name)){
            const oldTable = jsonToAnalyzation(this.history().lastSavedContent(name))
            const newTable = getTableAnalyzation(this.tableString(schema, name))
            return getChanges(oldTable, newTable)
        }
        return null
    }

    getMigrations = (schema: Joi.Schema, name: string) => {
        const changes = this.getChanges(schema, name)
        if (!changes)
            return [];
        
        const { added, deleted, renamed, updated } = changes
        const ret = []
        const oldTable = jsonToAnalyzation(this.history().lastSavedContent(name))
        const newTable = getTableAnalyzation(this.tableString(schema, name))        

        deleted.length > 0 && ret.push(renderTemplateDeleted(deleted, oldTable.columns))
        const renamedTemplate = renderTemplateRenamed(renamed)
        const addedTemplate = renderTemplateAdded(added, newTable.columns)
        const updatedTemplate = renderTemplateUpdated(updated, oldTable, newTable)

        const r = {
            up: renamedTemplate.up + addedTemplate.up + updatedTemplate.up,
            down: renamedTemplate.down + addedTemplate.down + updatedTemplate.down,
        }
        ret.push(r)
        return ret
    }

    getMigrationTemplates = (schema: Joi.Schema, name: string) => this.getMigrations(schema, name).map((r) => migrationTemplate(r, name) )

    smartMigration = async (schema: Joi.Schema, name: string) => {
        let i = 0;
        for (let template of this.getMigrationTemplates(schema, name)){
            try {
                if (i == 1){
                    await timeout(1000)
                }
                const filename = await this.migration().create(name)
                this.migration().upateMigrationFileContent(filename, template)
            } catch (e){
                throw new Error(e)
            }
            i++
        }
        this.history().create(schema, name)

    }
}

const timeout = (delayms: number) => {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, delayms);
    });
}

export default new Manager()