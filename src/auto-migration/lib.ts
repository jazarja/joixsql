import { TObjectStringString, TColumn } from './types'

export const methodsToArray = (obj: TObjectStringString ) => Object.keys(obj).map(key => obj[key])

export const pullMethodValueFromColumn = (method: string, column: TColumn) => {
    const idxOfContent = `${method}(`
    const idxStart = column.indexOf(idxOfContent)
    if (idxStart == -1)
        return undefined
    const idxEnd = column.indexOf(')', idxStart) 
    return column.substring(idxStart + idxOfContent.length, idxEnd)
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