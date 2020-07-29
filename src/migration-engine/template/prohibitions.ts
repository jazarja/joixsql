import { config } from '../../..'
import { TObjectStringString } from './types'
import sqlInfo from './info'

export const handleUpdateProhibitions = async (updated: any, tableName: string) => {

    const countTotalRows = async () => {
        const count = await config.mysqlConnexion().table(tableName).count()
        return count[0]['count(*)'] as number
    }

    const countWhereNull = async (column: string)=> {
        const c: any = await config.mysqlConnexion().table(tableName).whereNull(column).count('* as count')
        return c[0].count as number
    }

    const countDuplicateValues = async (column: string) => {
        const ret = await config.mysqlConnexion().raw(`SELECT COUNT(*) FROM (SELECT ${column}, COUNT(${column}) FROM ${tableName} GROUP BY ${column} HAVING COUNT(${column}) > 1) as X`)
        return ret[0][0]['COUNT(*)'] as number
    }

    const totalRows = await countTotalRows()

    for (let key in updated){
        let prevCol = updated[key].old as string
        let nextCol = updated[key].new as string

        if (!sqlInfo(prevCol).isNotNullable() && sqlInfo(nextCol).isNotNullable()){
            const count = await countWhereNull(key)
            if (count > 0)
                throw new Error(`You can't update the column '${key}' to a not nullable one because it contains '${count}' rows with a NULL value. Please remove manually these NULL rows first.`)
        }

        if (!sqlInfo(prevCol).isUnique() && sqlInfo(nextCol).isUnique() && totalRows > 1){
            const nDuplicates = await countDuplicateValues(key)
            if (nDuplicates > 0){
                throw new Error(`There are '${nDuplicates}' different combinations of duplication in the column '${key}' of the '${tableName}' table. Before adding a UNIQUE index to this column, you need to remove manually all data duplication present in it.`)
            }
        }
    }
}

const handleAddProhibitions = async (added: TObjectStringString, tableName: string) => {

    const countTotalRows = async () => {
        const count = await config.mysqlConnexion().table(tableName).count()
        const nRows = count[0]['count(*)']
        return nRows
    }

    const totalRows = await countTotalRows()
    for (const key in added){
        const col = added[key]
        if (sqlInfo(col).isNotNullable() && !sqlInfo(col).pullDefaultTo() && totalRows > 0){
            throw new Error(`You defined the column '${key}' of the table '${tableName}' as NOT NULLABLE but has no DEFAULT VALUE or existing value in the '${totalRows}' present rows.`)
        }
    }
}
