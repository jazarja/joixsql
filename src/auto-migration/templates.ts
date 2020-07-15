import _ from 'lodash'
import { IChange, ITemplate, IRenamed, TColumn, IFullColumn } from './types'
import { tableToColumns, getTableAnalyzation } from './parse'

import treatPrimary from './treat-primary'
import treatForeign from './treat-foreign'
import treatUnique from './treat-unique'
import treatNullable from './treat-nullable'

export const renderTemplateAdded = (added: IChange[], columns: TColumn[]): ITemplate => {
    const ret: ITemplate = {up: '', down: '', extraUp: '', extraDown: ''}

    for (let o of added){
        const { index, hasForeignKey, hasUniqueKey, hasPrimaryKey, key } = o.info

        //up
        ret.up += `   ${columns[index]};\n`


        //down
        ret.down = `t.dropColumn('${key}');\n` + ret.down //2
        if (hasForeignKey) ret.down = `t.dropForeign('${key}');\n` + ret.down //1 <- order in string
        if (hasUniqueKey) ret.down = `t.dropUnique('${key}');\n` + ret.down //1
        if (hasPrimaryKey) ret.down = `t.dropPrimary('${key}');\n` + ret.down //1
    }

    return ret
}

export const renderTemplateDeleted = (deleted: IChange[], oldColumns: TColumn[]): ITemplate => {
    const ret: ITemplate = {up: '', down: '', extraUp: '', extraDown: ''}

    for (let o of deleted){
        const { index, hasForeignKey, hasUniqueKey, hasPrimaryKey, key } = o.info

        //up
        ret.up = `t.dropColumn('${key}');\n` + ret.up 
        if (hasForeignKey) ret.up = `t.dropForeign('${key}');\n` + ret.up 
        if (hasUniqueKey) ret.up = `t.dropUnique('${key}');\n` + ret.up 
        if (hasPrimaryKey) ret.up = `t.dropPrimary('${key}');\n` + ret.up 

        //down
        ret.down += `   ${oldColumns[index]};\n`
    }

    return ret
}

export const renderTemplateRenamed = (renamed: IRenamed[]): ITemplate => {
    const ret: ITemplate = {up: '', down: '', extraUp: '', extraDown: ''}

    for (let o of renamed){
        const { before, after } = o

        //down
        ret.down = `t.renameColumn('${after}', '${before}');\n` + ret.down 

        //up
        ret.up = `t.renameColumn('${before}', '${after}');\n` + ret.up 
    }
    return ret
}


export const renderTemplateUpdated = (updated: IChange[], before: IFullColumn, now: IFullColumn, tableName: string): ITemplate => {
    const ret: ITemplate = {up: '', down: '', extraUp: '', extraDown: ''}


    const updateCopy = updated.slice()
    for (let i = 0; i < updateCopy.length; i++){
        const beforeIdx = _.findIndex(before.infos, {key: updateCopy[i].info.key })
        const nowIdx = _.findIndex(now.infos, {key: updateCopy[i].info.key })

        const bef = {column: before.columns[beforeIdx], info: before.infos[beforeIdx]}
        const aft = {column: now.columns[nowIdx], info: now.infos[nowIdx]}

        treatPrimary(ret, bef, aft, tableName) 
        treatForeign(ret, bef, aft)
        treatUnique(ret, bef, aft)
        treatNullable(bef, aft)
        if (_.isEqual(bef.column, aft.column) || (aft.column === 't'))
            updated.splice(i, 1)
        else {
            ret.up += `${aft.column}.alter();\n`
            if (bef.column !== 't')
                ret.down += `${bef.column}.alter();\n`
        }
    }
    return ret
}

export const migrationTemplate = (template: ITemplate, name: string) => {
return `
exports.up = function(knex) {
    return Promise.all([
        knex.schema.table('${name}', function(t) {
            ${template.up}
        }),
        ${template.extraUp}
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.table('${name}', function(t) {
            ${template.down}
        }),
        ${template.extraDown}
    ])
};
`
}