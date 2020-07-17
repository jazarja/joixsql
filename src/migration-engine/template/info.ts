import { TColumn } from './types'
import { pullFullMethodFromColumn } from './parse'

const TYPE_METHOD =  ['increments', 'boolean', 'timestamp', 'dateTime', 'float', 'specificType', 'integer', 'enum', 'string', 'text']

export default (column: TColumn) => {

    const pullPrimary = () => {
        const ret: any = {}
        ret.autoIncrement = !!pullFullMethodFromColumn('increments', column)
        ret.primary = !!pullFullMethodFromColumn('primary', column)
        if (!ret.autoIncrement && !ret.primary)
            return undefined
        return ret
    }
    
    const pullForeignKey = () => {
        const ref = pullFullMethodFromColumn('references', column, true)
        const table = pullFullMethodFromColumn('inTable', column, true)
        const onDelete = pullFullMethodFromColumn('onDelete', column)
        const onUpdate = pullFullMethodFromColumn('onUpdate', column)
        
        if (!ref || !table)
            return undefined
        return {
            ref: ref.substring(1, ref.length - 1),
            table: table.substring(1, table.length - 1),
            isDelCascade: !!onDelete,
            isUpdCascade: !!onUpdate
        }
    }

    const key = () => {
        for (const m of TYPE_METHOD){
            const v = pullFullMethodFromColumn(m, column, true)
            if (v && v.indexOf(',') == -1){
                return v.substring(1,v.length -1)
            } else if (v){
                const keyUnformated = v.split(',')[0]
                return keyUnformated.substring(1, keyUnformated.length-1)
            }
        }
        return undefined
    }

    const method = (nameOnly: boolean = true) => {
        for (const m of TYPE_METHOD){
            const v = pullFullMethodFromColumn(m, column)
            if (v)
                return nameOnly ? m : v
        }
        return undefined
    }

    const pullDefaultTo = () => {
        const defVal = pullFullMethodFromColumn('defaultTo', column, true)
        if (!defVal){
            return undefined
        }
        return defVal.substring(1, defVal.length - 1)
    }

    const isUnique = () => !!pullFullMethodFromColumn('unique', column)
    const isNotNullable = () => !!pullFullMethodFromColumn('notNullable', column)

    const isUnsigned = () => !!pullFullMethodFromColumn('unsigned', column)
    const isDeepUnsigned = () => {
        if (isUnsigned())
            return true
        const m = method(false) as string
        return m.toLowerCase().indexOf('unsigned') != -1
    }


    const type = () => {
        const methodName = method(true)
        if (methodName){
            if (methodName === 'increments')
                return 'int unsigned'
            else if (methodName === 'specificType'){
                const value = (pullFullMethodFromColumn('specificType', column, true) as string).split(',')[1].trim()
                return value.substring(1, value.length - 1)
            } else {
                return methodName
            }
        }
    }

    return {
        type,
        isDeepUnsigned,
        isUnsigned,
        isUnique,
        isNotNullable,
        pullDefaultTo,
        method,
        key,
        pullForeignKey,
        pullPrimary
    }

}