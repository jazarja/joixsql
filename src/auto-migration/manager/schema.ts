import fs from 'fs'
import { Manager } from './index'
import config from '../../config'
import Joi from '@hapi/joi'
import { tableToJSON } from '../parse' 
import { IMigration } from '../types'

export default (m: Manager) => {

    const getAllTableName = () => fs.readdirSync(path(''), 'utf8').sort((a: any, b: any) => a-b)

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

    const create = (mig: IMigration) => {
        if (m.hasTableChanged(mig)){
            fs.writeFileSync(
                generateFilename(mig.table), 
                JSON.stringify(
                    tableToJSON(m.tableString(mig)), 
                    null, 
                    4
                )
            )
        }
    }

    const generateFilename = (name: string) => `${path(name)}/${name}_${new Date().getTime().toString()}.json`

    const getListFiles = (name: string) => {
        return fs.readdirSync(path(name), 'utf8')
                .filter((e) => e.split('_')[0] === name)
                .reverse()
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
        getAllTableName,
        lastFilename,
        lastSavedContent
    }
}