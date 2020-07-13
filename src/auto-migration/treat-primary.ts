import _ from 'lodash'
import { ITemplate, IFullColumn, TObjectStringString} from './types'
import { clearMethods } from './lib'

export default (ret: ITemplate, before: IFullColumn, now: IFullColumn) => {

    const methods: TObjectStringString = {
        drop: 'dropPrimary',
        set: 'primary',
        autoIncrement: 'increments'
    }

    const dropPrimary = (key: string) => `  t.${methods.drop}('${key}');\n`
    const setPrimary = (key: string) => `   t.${methods.set}('${key}');\n`
    const setIncrements = (key: string) => `   t.${methods.autoIncrement}('${key}');\n`
    const dropSetPrimary = (key1: string, key2: string) => `${dropPrimary(key1)}    ${setPrimary(key2)}`
    const dropSetIncrement = (key1: string, key2: string) => `${dropPrimary(key1)}    ${setIncrements(key2)}`

    const prevPrimary = _.find(before.infos, o => o.hasPrimaryKey)
    const nowPrimary = _.find(now.infos, o => o.hasPrimaryKey)

    if (!!prevPrimary && !nowPrimary){
        const { key } = prevPrimary

        ret.up = dropPrimary(key) + ret.up

        if (prevPrimary.hasAutoIncrement)
            ret.down += setIncrements(key)
        else 
            ret.down += setPrimary(key)

    } else if (!prevPrimary && !!nowPrimary){
        const { key } = nowPrimary
        
        if (nowPrimary.hasAutoIncrement)
            ret.up += setIncrements(key)
        else 
            ret.up += setPrimary(key)
        
        ret.down = dropPrimary(key) + ret.down

    } else if (!!prevPrimary && !!nowPrimary){

        if (prevPrimary.hasAutoIncrement && !nowPrimary.hasAutoIncrement){

            ret.up += dropSetPrimary(prevPrimary.key, nowPrimary.key)
            ret.down += dropSetIncrement(nowPrimary.key, prevPrimary.key)
        
        } else if (!prevPrimary.hasAutoIncrement && nowPrimary.hasAutoIncrement){
        
            ret.up += dropSetIncrement(prevPrimary.key, nowPrimary.key)
            ret.down += dropSetPrimary(nowPrimary.key, prevPrimary.key)
        
        } else if (prevPrimary.key != nowPrimary.key){

            if (prevPrimary.hasAutoIncrement && nowPrimary.hasAutoIncrement){
                ret.up += dropSetIncrement(prevPrimary.key, nowPrimary.key)
                ret.down += dropSetIncrement(nowPrimary.key, prevPrimary.key)
            } else {
                ret.up += dropSetPrimary(prevPrimary.key, nowPrimary.key)
                ret.down += dropSetPrimary(nowPrimary.key, prevPrimary.key)
            }
        }
    }

    for (let i = 0; i < before.columns.length; i++){
        before.columns[i] = clearMethods(before.columns[i], methods)
    }
    for (let i = 0; i <  now.columns.length; i++){
        now.columns[i] = clearMethods(now.columns[i], methods)
    }
}