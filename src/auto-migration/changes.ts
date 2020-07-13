import _ from 'lodash'
import { IChange, IRenamed, TColumn, IFullColumn } from './types'

export const getChanges = (fullOld: IFullColumn, fullNew: IFullColumn) => {
    const same: IChange[] = []
    const updated: IChange[] = []
    const deleted: IChange[] = []
    const added: IChange[] = []

    for (let i = 0; i < fullNew.columns.length; i++){
        if (fullOld.columns.indexOf(fullNew.columns[i]) != -1){
            same.push({column: fullNew.columns[i], info: fullNew.infos[i]})
            continue
        }

        const oldIdx = _.findIndex(fullOld.infos, {key: fullNew.infos[i].key})
        if (oldIdx != -1 && !_.isEqual(fullOld.columns[oldIdx], fullNew.columns[i]))
            updated.push({column: fullNew.columns[i], info: fullNew.infos[i]})
        if (oldIdx == -1)
            added.push({column: fullNew.columns[i], info: fullNew.infos[i]})
    }

    for (let i = 0; i < fullOld.infos.length; i++){
        if (!_.find(fullNew.infos, {key: fullOld.infos[i].key}))
            deleted.push({column: fullOld.columns[i], info: fullOld.infos[i]})
    }

    return { 
        same, updated, deleted, added,
        renamed: getRenamed(added, deleted)
    }
}

const getRenamed = (added: IChange[], deleted: IChange[]) => {
    const renamed: IRenamed[] = []

    const getColumnRightPart = (column: TColumn) => column.substring(column.indexOf(`'`, column.indexOf(`'`) + 1), column.length)

    const addedCopy = added.slice()
    for (let o of addedCopy){
        const { column } = o

        const identicRightPartInAdds = _.filter(addedCopy, (e) => _.isEqual(getColumnRightPart(e.column), getColumnRightPart(column)))
        const identicRightPartInADeletes = _.filter(deleted, (e) => _.isEqual(getColumnRightPart(e.column), getColumnRightPart(column)))

        if (identicRightPartInAdds.length === identicRightPartInADeletes.length){
            for (let i = 0; i < identicRightPartInAdds.length; i++){
                const oldKey = identicRightPartInADeletes[i].info.key
                const newKey = identicRightPartInAdds[i].info.key
                renamed.push({before: oldKey, after: newKey})
                _.remove(added, (e) => e.info.key === newKey)
                _.remove(deleted, (e) => e.info.key === oldKey)
            }
        }
    }
    return renamed
}