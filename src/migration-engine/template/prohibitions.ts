import _ from 'lodash'
import { config } from '../../../index'
import { TObjectStringString } from './types'
import sqlInfo from './info'
import errors from './errors'

const countTotalRows = async (tableName: string) => {
    const count = await config.mysqlConnexion().table(tableName).count()
    const nRows = count[0]['count(*)']
    return nRows as number
}

const fetchBy = async (tableName: string, where: any) => {
    const result = await config.mysqlConnexion().table(tableName).where(where).first()
    if (_.isObject(result)){
        return result
    }
    return null
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

    const countGreaterThanLength = async (column: string, maxLength: number) => {
        const ret = await config.mysqlConnexion().raw(`SELECT COUNT(*) FROM (SELECT ${column} FROM ${tableName} WHERE length(${column}) > ${maxLength}) as X`)
        return ret[0][0]['COUNT(*)'] as number
    }

    const countLessThan0 = async (column: string) => {
        const c: any = await config.mysqlConnexion().table(tableName).where(column, '<', 0).count('* as count')
        return c[0].count as number
    }

    const countGreaterThan = async (column: string, max: number) => {
        const c: any = await config.mysqlConnexion().table(tableName).where(column, '>', 0).count('* as count')
        return c[0].count as number
    }


    const totalRows = await countTotalRows(tableName)

    for (let key in updated){

        let prevCol = updated[key].old as string
        let nextCol = updated[key].new as string

        const foreign = sqlInfo(nextCol).pullForeignKey()
        const defaultTo = sqlInfo(nextCol).pullDefaultTo()
        const stringMax = sqlInfo(nextCol).stringMax()
        const floatSpecs = sqlInfo(nextCol).floatSpecs()
        const primary = sqlInfo(nextCol).pullPrimary()
    

        if (!sqlInfo(prevCol).pullPrimary() && primary){
            const countNull = await countWhereNull(key)
            if (countNull > 0)
                throw errors.primaryNullBlocked(key, tableName, countNull)
            const countDup = await countDuplicateValues(key)
            if (countDup > 0)
                throw errors.primaryDuplicatesBlocked(key, tableName, countDup)
        }

        //HAS CHANGED OF TYPE
        if (sqlInfo(prevCol).type() != sqlInfo(nextCol).type() && totalRows > 0){
            throw errors.columnTypeChangeForbidden(key, tableName)
        }

        //WAS NOT NOT-NULLABLE and IS NOT-NULLABLE NOW | WITHOUT DEFAULT VALUE
        if (!sqlInfo(prevCol).isNotNullable() && sqlInfo(nextCol).isNotNullable() && !defaultTo){
            const count = await countWhereNull(key)
            if (count > 0)
                throw errors.notNullBlocked(key, tableName, count)
        }

        //Was NOT and UNIQUE and is UNIQUE NOW
        if (!sqlInfo(prevCol).isUnique() && sqlInfo(nextCol).isUnique() && totalRows > 1){
            const nDuplicates = await countDuplicateValues(key)
            if (nDuplicates > 0)
                throw errors.uniqueBlocked(key, tableName, nDuplicates)
        }

        /* TO ACTIVATE WHEN TYPE CHANGE WILL BE ALLOWED */
        // if (!sqlInfo(prevCol).isDeepUnsigned() && sqlInfo(nextCol).isDeepUnsigned()){
        //     const count = await countLessThan0(key)
        //     if (count > 0)
        //         throw errors.unsignedBlocked(key, tableName, count)
        // }

        //IF A STRING WITH A DEFINED MAX
        if (stringMax){
            const res = await countGreaterThanLength(key, stringMax)
            if (res > 0){
                throw errors.stringMaxChangeBlocked(key, tableName, res, stringMax)
            }
        }

        //IF A FLOAT
        if (floatSpecs){
            const maxEntire = parseInt(new Array(floatSpecs.precision - floatSpecs.scale).fill('9', 0, floatSpecs.precision - floatSpecs.scale).join(''))
            const maxDecimal = parseFloat('0.' + new Array(floatSpecs.scale).fill('9', 0, floatSpecs.scale).join(''))
            const max = parseFloat((maxEntire + maxDecimal).toFixed(floatSpecs.scale))
            const count = await countGreaterThan(key, max)
            if (count > 0){
                throw errors.floatMaxChangeBlocked(key, tableName, count, max)
            }
        }

        //IF A FOREIGN KEY WITH A DEFAULT VALUE
        if (foreign && !!defaultTo){
            const res = await fetchBy(foreign.table, {[foreign.ref]: defaultTo})
            if (res == null){
                throw errors.foreignKeyDefaultValueDoesNotExist(key, tableName, foreign.table, defaultTo)
            }
        }
    }
}

export const handleAddProhibitions = async (added: TObjectStringString, tableName: string) => {

    const totalRows = await countTotalRows(tableName)

    for (const key in added){

        const col = added[key]
        const foreign = sqlInfo(col).pullForeignKey()
        const defaultTo = sqlInfo(col).pullDefaultTo()
        
        //IF NOT NULLABLE WITHOUT DEFAULT VALUE IN A NON-EMPTY TABLE
        if (sqlInfo(col).isNotNullable() && !defaultTo && totalRows > 0)
            throw errors.notNullAddBlocked(key, tableName, totalRows)
        
        //IF FOREIGN WITH A DEFAULT VALUE
        if (foreign && !!defaultTo){
            const res = await fetchBy(foreign.table, {[foreign.ref]: defaultTo})
            if (res == null){
                throw errors.foreignKeyDefaultValueDoesNotExist(key, tableName, foreign.table, defaultTo)
            }
        }
    }
}
