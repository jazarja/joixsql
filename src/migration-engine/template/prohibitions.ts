import { config } from '../../../index'
import { TObjectStringString } from './types'
import sqlInfo from './info'
import errors from './errors'

const countTotalRows = async (tableName: string) => {
    const count = await config.mysqlConnexion().table(tableName).count()
    const nRows = count[0]['count(*)']
    return nRows as number
}

export const handleUpdateProhibitions = async (updated: any, tableName: string) => {

    const countWhereNull = async (column: string)=> {
        const c: any = await config.mysqlConnexion().table(tableName).whereNull(column).count('* as count')
        return c[0].count as number
    }

    const countDuplicateValues = async (column: string) => {
        const ret = await config.mysqlConnexion().raw(`SELECT COUNT(*) FROM (SELECT ${column}, COUNT(${column}) FROM ${tableName} GROUP BY ${column} HAVING COUNT(${column}) > 1) as X`)
        return ret[0][0]['COUNT(*)'] as number
    }

    const countLessThan0 = async (column: string) => {
        const c: any = await config.mysqlConnexion().table(tableName).where(column, '<', 0).count('* as count')
        return c[0].count as number
    }


    const totalRows = await countTotalRows(tableName)

    for (let key in updated){

        let prevCol = updated[key].old as string
        let nextCol = updated[key].new as string

        if (sqlInfo(prevCol).type() != sqlInfo(nextCol).type() && totalRows > 0){
            throw errors.columnTypeChangeForbidden(key, tableName)
        }

        if (!sqlInfo(prevCol).isNotNullable() && sqlInfo(nextCol).isNotNullable() && !sqlInfo(nextCol).pullDefaultTo()){
            const count = await countWhereNull(key)
            if (count > 0)
                errors.notNullBlocked(key, tableName, count)
        }

        if (!sqlInfo(prevCol).isUnique() && sqlInfo(nextCol).isUnique() && totalRows > 1){
            const nDuplicates = await countDuplicateValues(key)
            if (nDuplicates > 0)
                errors.uniqueBlocked(key, tableName, nDuplicates)
        }

        if (!sqlInfo(prevCol).isDeepUnsigned() && sqlInfo(nextCol).isDeepUnsigned()){
            const count = await countLessThan0(key)
            if (count > 0)
                errors.unsignedBlocked(key, tableName, count)
        }
    }
}

export const handleAddProhibitions = async (added: TObjectStringString, tableName: string) => {

    const totalRows = await countTotalRows(tableName)

    for (const key in added){
        
        const col = added[key]
        if (sqlInfo(col).isNotNullable() && !sqlInfo(col).pullDefaultTo() && totalRows > 0)
            throw errors.notNullAddBlocked(key, tableName, totalRows)
    }
}
