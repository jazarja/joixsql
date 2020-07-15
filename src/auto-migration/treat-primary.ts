import _ from 'lodash'
import { ITemplate, IFullColumn, TObjectStringString, IChange, IInfo} from './types'
import { clearMethods, removeMethodFromColumn } from './lib'

export default (ret: ITemplate, before: IChange, now: IChange, tableName: string) => {

    const methods: TObjectStringString = {
        drop: 'dropPrimary',
        set: 'primary',
        autoIncrement: 'increments'
    }

    const dropPrimary = (key: string) => `  t.${methods.drop}('${key}');\n`
    const setPrimary = (key: string) => `   t.${methods.set}('${key}');\n`
    const setIncrements = (table: string, key: string) => `knex.raw(\`ALTER TABLE ${table} CHANGE ${key} ${key} INT(10) UNSIGNED NOT NULL AUTO_INCREMENT\`),\n`

    const { key } = now.info
    if (!before.info.hasPrimaryKey && now.info.hasPrimaryKey){

        //up
        ret.up += setPrimary(key)
        if (now.info.hasAutoIncrement)
            ret.extraUp += setIncrements(tableName, key)

        //down
        ret.down = dropPrimary(key) + ret.down

    } else if (before.info.hasPrimaryKey && !now.info.hasPrimaryKey){

        //up
        ret.up = ret.up + dropPrimary(key)

        //down
        ret.down += setPrimary(key)
        if (before.info.hasAutoIncrement)
            ret.extraDown += setIncrements(tableName, key)

        now.column = 't' //Bypass a non desired behavior due to the increments function that does many thing in one function contrary to other table builder function that are all 1 for 1.

    } else if (before.info.hasPrimaryKey && now.info.hasPrimaryKey){

        if (before.info.hasAutoIncrement && !now.info.hasAutoIncrement){
            //ret.up here is treated in the loop that call this function
            ret.extraDown += setIncrements(tableName, key)
        }

        else if (!before.info.hasAutoIncrement && now.info.hasAutoIncrement){
            ret.extraUp += setIncrements(tableName, key)
            ret.down += `${removeMethodFromColumn(before.column, 'primary')}.alter();\n`
        }
    }

    before.column = clearMethods(before.column, methods)
    now.column = clearMethods(now.column, methods)
}