import _ from 'lodash'
import { TColumn } from './types'
import { pullFullMethodFromColumn } from './parse'
import { 
    MYSQL_STRING_TYPES,
    MYSQL_NUMBER_TYPES
} from '../../table-engine/mysql/types'

const TYPE_METHOD =  ['increments', 'boolean', 'dateTime', 'float', 'specificType', 'integer', 'enum', 'string', 'text']

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
        if (!defVal)
            return undefined
        if (defVal[0] === '\'' && defVal[defVal.length - 1] === '\''){
            return defVal.substring(1, defVal.length - 1)
        }
        return defVal
    }

    const isUnique = () => !!pullFullMethodFromColumn('unique', column)
    const isNotNullable = () => !!pullFullMethodFromColumn('notNullable', column)
    const isDate = () => isDateTimeType()
    const isDateTimeType = () => type() === 'dateTime'

    const isFloatType = () => type() === 'float'
    const isDoubleType = () => type() === 'double'

    const isIntType = () => type()?.indexOf('int') != -1
    const isBigIntType = () => type()?.indexOf('bigint') != -1

    const isStringType = () => type() === 'string'
    const isTextType = () => type() === 'text'
    const isDeepStringType = () => isStringType() || isTextType()

    const isBool = () => type() === 'boolean'


    const isNumber = () => isDoubleType() || isFloatType() || isIntType()

    const isUnsigned = () => !!pullFullMethodFromColumn('unsigned', column) 

    const isDeepUnsigned = () => {
        if (isUnsigned())
            return true
        return type()?.indexOf('unsigned') != -1
    }

    const isAutoIncrements = () => {
        const m = method(false) as string
        return m.toLowerCase().indexOf('increments') != -1
    }

    const numberMaxAndMin = () => {
        const floatSpcs = floatSpecs()
        if (floatSpcs){
            const maxEntire = parseInt(new Array(floatSpcs.precision - floatSpcs.scale).fill('9', 0, floatSpcs.precision - floatSpcs.scale).join(''))
            const maxDecimal = parseFloat('0.' + new Array(floatSpcs.scale).fill('9', 0, floatSpcs.scale).join(''))
            const max = parseFloat((maxEntire + maxDecimal).toFixed(floatSpcs.scale))
            return {
                max, 
                min: max*-1
            }
        }
        if (isDoubleType()){
            return {
                max: 1.7976931348623157E+308,
                min: -1.7976931348623157E+308
            }
        }
        if (isIntType()){
            const unsigned = isDeepUnsigned()
            const m = _.find(MYSQL_NUMBER_TYPES, {type: isBigIntType() ? 'bigint' : 'int'})
            return {
                max: !unsigned ? m.max : (m.max * 2) + 1 ,
                min: !unsigned ? m.min : 0
            }
        }
        return null
    }


    const stringMax = () => {
        if (isStringType()){
            const m = method(false)
            if (m){
                const splited = m.split(',')
                if (splited.length == 2)
                    return parseInt(splited[1].slice(0, splited[1].length - 1))
            }
        }
        return null
    }

    const textMax = () => {
        if (isTextType()){
            const m = method(false)
            if (m){
                const splited = m.split(',')
                if (splited.length == 2){
                    const e = _.find(MYSQL_STRING_TYPES, {type: splited[1].toLowerCase().trim() })
                    if (e)
                        return e.max
                }
            }
        }
        return null
    }

    const floatSpecs = () => {
        if (isFloatType()){
            const m = method(false)
            if (m){
                const splited = m.split(',')
                if (splited.length == 3)
                    return {precision: parseInt(splited[1]), scale: parseInt(splited[2].slice(0, splited[2].length - 1))}
            }
        }
        return null
    }

    const type = () => {
        const methodName = method(true)
        if (methodName){
            if (methodName === 'increments')
                return 'int unsigned'
            else if (methodName === 'enum'){
                return 'string'
            }
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
        isDeepStringType,
        numberMaxAndMin,
        textMax,
        isAutoIncrements,
        isDeepUnsigned,
        isUnsigned,
        isNumber,
        isDate,
        isBool,
        isUnique,
        isNotNullable,
        pullDefaultTo,
        method,
        key,
        stringMax,
        floatSpecs,
        pullForeignKey,
        pullPrimary
    }
}