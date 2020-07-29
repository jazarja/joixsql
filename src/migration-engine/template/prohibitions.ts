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

    const countLessThan0 = async (column: string) => {
        const c: any = await config.mysqlConnexion().table(tableName).where(column, '<', 0).count('* as count')
        return c[0].count as number
    }


    const totalRows = await countTotalRows()

    for (let key in updated){
        let prevCol = updated[key].old as string
        let nextCol = updated[key].new as string

        if (sqlInfo(prevCol).type() != sqlInfo(nextCol).type() && totalRows > 0){
            throw new Error(`Type change is not allowed in a non-empty table. column: ${key}, table: ${tableName}`)
        }

        if (!sqlInfo(prevCol).isNotNullable() && sqlInfo(nextCol).isNotNullable() && !sqlInfo(nextCol).pullDefaultTo()){
            const count = await countWhereNull(key)
            if (count > 0)
                throw new Error(`You can't update the column '${key}' to a not nullable one (\`required()\`)because it contains '${count}' rows with a NULL value. Please remove manually these NULL rows first, or set a default value. (\`defaultTo()\`)`)
        }

        if (!sqlInfo(prevCol).isUnique() && sqlInfo(nextCol).isUnique() && totalRows > 1){
            const nDuplicates = await countDuplicateValues(key)
            if (nDuplicates > 0){
                throw new Error(`There are '${nDuplicates}' different combinations of duplication in the column '${key}' of the '${tableName}' table. Before adding a UNIQUE index (\`unique()\`) to this column, you need to remove manually all data duplication present in it.`)
            }
        }

        if (!sqlInfo(prevCol).isDeepUnsigned() && sqlInfo(nextCol).isDeepUnsigned()){
            const count = await countLessThan0(key)
            if (count > 0){
                throw new Error(`There are '${count}' values below 0 in the column '${key}' of the '${tableName}' table. Please remove or update this rows before adding a unsigned type. (\`positive()\`)`)
            }
        }
    }
}

export const handleAddProhibitions = async (added: TObjectStringString, tableName: string) => {

    const countTotalRows = async () => {
        const count = await config.mysqlConnexion().table(tableName).count()
        const nRows = count[0]['count(*)']
        return nRows
    }

    const totalRows = await countTotalRows()
    for (const key in added){
        const col = added[key]
        if (sqlInfo(col).isNotNullable() && !sqlInfo(col).pullDefaultTo() && totalRows > 0){
            throw new Error(`You defined the column '${key}' of the table '${tableName}' as NOT NULLABLE (\`required()\`) but has no DEFAULT VALUE (\`defaultTo\`) or existing value in the ${totalRows} present rows.`)
        }
    }
}
