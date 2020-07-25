import fs from 'fs'
import { config } from '../../../index'

export interface IError {
    error: string
    table_name: string
    migration_filename: string
    date: Date
    code: number
}

export default () => {

    const path = (name: string) => {
        const path = `${config.historyDir()}/errors/${name}`
        if (!fs.existsSync(path))
            fs.mkdirSync(path, { recursive: true })
        return path
    }

    const newError = (e: any, tableName: string, migrationFilename: string) => {
        const i: IError = {
            error: e.toString(),
            code: e.errno,
            table_name: tableName,
            migration_filename: migrationFilename,
            date: new Date()
        }
        try {
            fs.writeFileSync(path(migrationFilename), JSON.stringify(i, null, 4))
            return i
        } catch (e){
            throw new Error(e)
        }
    }

    const deleteFile = (fn: string) => fs.unlinkSync(path(fn))

    const getErrorFile = (fn: string): IError => JSON.parse(fs.readFileSync(path(fn), 'utf-8')) 

    return {
        newError,
        getErrorFile,
        deleteFile
    }
}