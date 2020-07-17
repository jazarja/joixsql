import _ from 'lodash'
import { TColumn, TObjectStringString, IUpdated, TObjectUpdated } from './types'
import SQLInfo from './info'

export const compare = (oldTable: TObjectStringString, newTable: TObjectStringString) => {
    const deleted: TObjectStringString = {}
    const added: TObjectStringString = {}
    const updated: TObjectUpdated = {}

    for (let key in oldTable){
        if (!newTable[key])
            deleted[key] = oldTable[key]
        else if (newTable[key] && oldTable[key] != newTable[key])
            updated[key] = {old: oldTable[key], new: newTable[key]}
    }
    for (let key in newTable){
        if (!oldTable[key])
            added[key] = newTable[key]
    }

    return {
        renamed: getRenamedFields(deleted, added),
        added,
        updated,
        deleted,
    }
}

const getRenamedFields = (deleted: TObjectStringString, added: TObjectStringString): IUpdated[] => {
    let replace: IUpdated[] = []

    const deletedCopy = _.clone(deleted)
    const addedCopy = _.clone(added)

    for (let keyD in deletedCopy){
        const rplcr = '_NO_VALUE'
        const colD = deletedCopy[keyD].replace(`'${keyD}'`, rplcr)
        for (let keyA in addedCopy){
            const colA = addedCopy[keyA].replace(`'${keyA}'`, rplcr)
            if (colA === colD){
                replace.push({old: keyD, new: keyA})
                delete deleted[keyD]
                delete added[keyA]
            }
        }
    }
    return replace
}

export const tableToJSON = (table: string) => {
    const columns = tableToColumns(table)

    let ret: TObjectStringString = {}
    for (let i = 0; i < columns.length; i++){
       const key = SQLInfo(columns[i]).key()
        if (!key)
            throw new Error(`error from tableToJSON: column key not detected on column line ${i}.`)
        ret[key] = columns[i]
    }
    return ret
}

const tableToColumns = (table: string): TColumn[] => {
    let fnContent = table.substring(table.lastIndexOf('{') + 1, table.lastIndexOf('}'))
    fnContent = fnContent.replace(/(?:\r\n|\r|\n)/g, '');
    const array = fnContent.split(';')
    for (let i = 0; i < array.length; i++)
        array[i] = array[i].trim()
    return array.filter((e) => !!e)
}

export const methodsToArray = (obj: TObjectStringString ) => Object.keys(obj).map(key => obj[key])

export const pullFullMethodFromColumn = (method: string, column: TColumn, valueOnly: boolean = false) => {
    const idxOfContent = `${method}(`
    const idxStart = column.indexOf(idxOfContent)
    if (idxStart == -1)
        return undefined
    const idxEnd = column.indexOf(')', idxStart) 
    return column.substring(idxStart + (valueOnly ? idxOfContent.length : 0), idxEnd + (valueOnly ? 0 : 1))
}

export const removeMethodFromColumn = (column: TColumn, method: string) => {
    let isCuttingTilEnd = true
    const idxPrimary = column.indexOf(`${method}(`)
    if (idxPrimary == -1)
        return column
    let idxEndPrimary = column.indexOf(')', idxPrimary) 
    const lengthColumn = column.length
    if (lengthColumn > idxEndPrimary + 1){
        isCuttingTilEnd = false
        idxEndPrimary = column.indexOf('.', idxPrimary)
    }

    const prefix = column.substring(0, idxPrimary - 1)
    const suffix = column.substring(idxEndPrimary + (isCuttingTilEnd ? 1 : 0), lengthColumn)
    return prefix + suffix
}

export const clearMethods = (column: TColumn, methods: TObjectStringString ) => {
    for (let v of methodsToArray(methods))
        column = removeMethodFromColumn(column, v)
    return column
}

export const replaceLast = (str: string, what: string, replacement: string) => {
    var pcs = str.split(what);
    var lastPc = pcs.pop();
    return pcs.join(what) + replacement + lastPc;
};