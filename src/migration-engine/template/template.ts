import _ from 'lodash'
import { TObjectStringString } from './types'
import actions from './actions'
import sqlInfo from './info'
import hasChanged from './changes'
import { compare, replaceLast, cumulateWithMethod } from './parse'

export const renderFullTemplate = (oldTable: TObjectStringString, newTable: TObjectStringString, tableName: string) => {
    const ret: string[] = []
    const templateUp = renderTemplates(oldTable, newTable, tableName)
    const templateDown = renderTemplates(newTable, oldTable, tableName)

    const emptyTemplate = `return Promise.all([])`

    for (let i = 0; i < Math.max(templateUp.length, templateDown.length); i++){
        ret.push(`
            exports.up = function(knex) {
                ${templateUp[i] ? templateUp[i] : emptyTemplate}
            };

            exports.down = function(knex) {
                ${templateDown[i] ? templateDown[i] : emptyTemplate}
            };
        `)
    }
    return ret
}

const renderTemplates = (oldTable: TObjectStringString, newTable: TObjectStringString, tableName: string) => {
    const ret: string[] = []
    const { added, updated, renamed, deleted} = compare(oldTable, newTable)

    let actions = [
        ...getDeletedExecutionList(deleted), 
        ...getRenamedExecutionList(renamed), 
        ...getUpdatedExecutedList(updated, tableName), 
        ...getAddedExecutionList(added, tableName),
    ]

    const tableActions = actions.filter((v: string) => v.trim().startsWith('t.'))
    const rawActions = actions.filter((v: string) => !v.trim().startsWith('t.'))

    if (tableActions.length > 0){
        ret.push(`
            return knex.schema.table('${tableName}', function(t) {
                ${replaceLast(tableActions.join(''), '\n', '')}
            })
        `)
    }

    if (rawActions.length > 0){
        ret.push(`
            return Promise.all([
                ${replaceLast(rawActions.join(''), ',\n', '')}
            ])
        `)
    }
    return ret
}


export const getAddedExecutionList = (added: TObjectStringString, tableName: string) => {
    let executionList: string[] = []
    for (let key in added){
        executionList.push(actions.column().create(added[key]))
        !!sqlInfo(added[key]).pullPrimary() && executionList.push(actions.primary().positionAndIncrementsRaw(tableName, added[key]))
    }
    return executionList
}

export const getDeletedExecutionList = (deleted: TObjectStringString) => {
    let executionList: string[] = []
    for (let key in deleted){
        const col = deleted[key]

        if (actions.primary().is(col))
            executionList.push(actions.primary().drop(key, actions.primary().isAutoIncrement(col), col))
        if (actions.foreign().is(col))
            executionList.push(actions.foreign().drop(key))
        if (actions.unique().is(col))
            executionList.push(actions.unique().drop(key))
        executionList.push(actions.column().drop(key))
    }
    return executionList
}

export const getRenamedExecutionList = (renamed: any[]) => {
    let executionList: string[] = []
    for (let o of renamed)
        executionList.push(actions.column().rename(o.old, o.new))
    return executionList
}


export const getUpdatedExecutedList = (updated: any, tableName: string) => {
    let executionList: string[] = []

    for (let key in updated){
 
        let prevCol = updated[key].old as string
        let nextCol = updated[key].new as string

        const prevPrimary = sqlInfo(prevCol).pullPrimary()
        const nextPrimary = sqlInfo(nextCol).pullPrimary()

        const prevForeign = sqlInfo(prevCol).pullForeignKey()
        const nextForeign = sqlInfo(nextCol).pullForeignKey()

        const isPrevUnique = actions.unique().is(prevCol)
        const isNextUnique = actions.unique().is(nextCol)

        const changed = hasChanged(prevCol, nextCol)
        const hasSQLColumnFormatChanged = changed.method() || changed.nullableStatus() || changed.type() || changed.unsignedStatus() || changed.defaultValue()

        /*      PRIMARY KEY     */

        if (changed.primaryKeySettings()){

            if (prevPrimary && nextPrimary){
                
                if (prevPrimary.autoIncrement && !nextPrimary.autoIncrement){

                    !hasSQLColumnFormatChanged && executionList.push(actions.primary().dropAutoIncrement(key, nextCol))

                } else if (!prevPrimary.autoIncrement && nextPrimary.autoIncrement){
               
                    executionList.push(actions.primary().positionAndIncrementsRaw(tableName, nextCol))
                }

            } else if (!prevPrimary && nextPrimary){

                executionList.push(actions.primary().set(key, false))
                executionList.push(actions.primary().positionAndIncrementsRaw(tableName, nextCol))

            } else if (prevPrimary && !nextPrimary){

                executionList.unshift(actions.primary().drop(key, !hasSQLColumnFormatChanged && prevPrimary.autoIncrement, nextCol))            

            }
            
            prevCol = actions.primary().clear(prevCol)
            nextCol = actions.primary().clear(nextCol)
        }


        /*      FOREIGN KEY     */
        if (changed.foreignKeySettings()){
            if (prevForeign && nextForeign){
                executionList.unshift(actions.foreign().drop(key))
                executionList.push(actions.foreign().set(key, tableName, nextForeign?.ref as string, nextCol))
            
            } else if (!prevForeign && nextForeign)
                executionList.push(actions.foreign().set(key, tableName, nextForeign?.ref as string, nextCol))
              else if (prevForeign && !nextForeign)
                executionList.unshift(actions.foreign().drop(key))

            prevCol = actions.foreign().clear(prevCol)
            nextCol = actions.foreign().clear(nextCol)
        }


        /*      UNIQUE KEY      */
        if (changed.uniqueStatus()) {
            if (isPrevUnique && !isNextUnique)
                executionList.unshift(actions.unique().drop(key))
            else
                executionList.push(actions.unique().set(key))

            prevCol = actions.unique().clear(prevCol)
            nextCol = actions.unique().clear(nextCol)
        }
        
        const composer = () => {
            if (hasSQLColumnFormatChanged){
                let ret = `t.`
                const method = sqlInfo(nextCol).method(false)
                if (!method)
                    return null
                ret += method

                if (changed.defaultValue()){
                    const defVal = sqlInfo(nextCol).pullDefaultTo()
                    if (defVal != undefined)
                        ret = actions.defaultValue().set(ret, defVal, !sqlInfo(nextCol).isDate())
                    else if (defVal == undefined && actions.defaultValue().is(prevCol)){
                        executionList.push(actions.defaultValue().drop(tableName, nextCol))
                    }
                }

                if (changed.nullableStatus()){
                    if (actions.notNullable().is(prevCol) && !actions.notNullable().is(nextCol))
                        ret = actions.notNullable().drop(ret)
                    else 
                        ret = actions.notNullable().set(ret)
                }

                if (changed.unsignedStatus()){
                    if (!sqlInfo(prevCol).isUnsigned() && sqlInfo(nextCol).isUnsigned())
                        ret = actions.any().unsigned(ret)
                }
                return actions.column().alter(ret) + ';\n'
            }
            return null            
        }

        const line = composer()
        line && executionList.push(line)
    }
    return executionList
}