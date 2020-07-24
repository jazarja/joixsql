import _ from 'lodash'
import fs from 'fs'
import { Manager } from '../index'
import config from '../../config'
import { tableToJSON, compare } from '../template/parse' 
import { IModel } from '../../ecosystem'
import { TableEngine } from '../../../index'

export default (m: Manager) => {

    const changes = (mig: IModel) => {
        if (hasChanged(mig) && lastFilename(mig.tableName)){
            const oldTable = lastSavedContent(mig.tableName)
            const newTable = tableToJSON(toTableString(mig))

            return compare(oldTable, newTable)
        }
        return null
    }

    const create = (mig: IModel) => {
        if (hasChanged(mig)){
            fs.writeFileSync(
                generateFilename(mig.tableName), 
                JSON.stringify(
                    tableToJSON(toTableString(mig)), 
                    null, 
                    4
                )
            )
        }
    }

    const getAllTableName = () => fs.readdirSync(path(''), 'utf8').sort((a: any, b: any) => a-b)

    const generateFilename = (name: string) => `${path(name)}/${name}_-_${new Date().getTime().toString()}.json`

    const getListFiles = (name: string) => {
        return fs.readdirSync(path(name), 'utf8')
                .filter((e) => e.split('_-_')[0] === name)
                .reverse()
    }

    const hasChanged = (mig: IModel) => {
        const last = lastSavedContent(mig.tableName)
        if (last == null)
            return true
        const tableString = TableEngine.buildTableString(mig.schema, mig.tableName)
        return !_.isEqual(last, tableToJSON(tableString))
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


    const path = (name: string) => {
        const path = `${config.historyDir()}/schema/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const removeAll = (name: string) => fs.rmdirSync(path(name), { recursive: true })

    const removeLast = (name: string) => {
        const list = getListFiles(name)
        list.length > 0 && fs.unlinkSync(list[0])
    }

    const toTableString = (mig: IModel) => TableEngine.buildTableString(mig.schema, mig.tableName)

    return {
        changes,
        toTableString,
        hasChanged,
        removeAll,
        removeLast,
        create,
        generateFilename,
        getListFiles,
        getAllTableName,
        lastFilename,
        lastSavedContent
    }
}