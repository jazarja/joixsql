import { ITemplate, IChange, TObjectStringString, IInfo } from './types'
import { clearMethods, pullMethodValueFromColumn } from './lib'

export default (ret: ITemplate, before: IChange, now: IChange) => {

    const methods: TObjectStringString = {
        drop: 'dropForeign',
        set: 'foreign',
        inTable: 'inTable',
        references: 'references',
        onDelete: `onDelete`,
        onUpdate: `onUpdate`
    }

    const drop = (key: string) => `  t.${methods.drop}('${key}');\n`
    const set = (key: string) => `   t.${methods.set}('${key}')`
    const setInTable = (table: string) => `.${methods.inTable}(${table})`
    const setReferences = (key: string) => `.${methods.references}(${key})`
    const setOnDeleteCascade = () => `.${methods.onDelete}('CASCADE')`
    const setOnUpdateCascade = () => `.${methods.onUpdate}('CASCADE')`
    
    const setFullForeign = (key: string, table: string, ref: string, info: IInfo) => set(key) + setInTable(table) + setReferences(ref) + setCascadeIfRequired(info) + ';\n'

    const setCascadeIfRequired = (info: IInfo) => {
        const { isOnDeleteCascade, isOnUpateCascade } = info
        let ret = ''
        if (isOnDeleteCascade)
            ret += setOnDeleteCascade()
        if (isOnUpateCascade)
            ret += setOnUpdateCascade()
        return ret
    }

    const { key } = now.info

    const wasForeign = before.info.hasForeignKey
    const isForeign = now.info.hasForeignKey

    if (!wasForeign && isForeign) {
        const { info, column } = now
        const table = pullMethodValueFromColumn(methods.inTable, column) as string
        const ref =  pullMethodValueFromColumn(methods.references, column) as string

        //up
        ret.up += setFullForeign(key, table, ref, info)

        //down
        ret.down = drop(key) + ret.down
    }

    if (wasForeign && !isForeign) {
        const { info, column } = before
        const table = pullMethodValueFromColumn(methods.inTable, column) as string
        const ref =  pullMethodValueFromColumn(methods.references, column) as string

        //up
        ret.up = drop(key) + ret.up
        //down
        ret.down += setFullForeign(key, table, ref, info)
    }

    if (wasForeign && isForeign){

        //table string
        const oldTable = pullMethodValueFromColumn(methods.inTable, before.column) as string
        const newTable = pullMethodValueFromColumn(methods.inTable, now.column) as string

        //reference string
        const oldRef = pullMethodValueFromColumn(methods.references, before.column) as string
        const newRef = pullMethodValueFromColumn(methods.references, now.column) as string

        //condition changed
        const isTableChanged = oldTable != newTable
        const isRefChanged = oldRef != newRef
        const onDeleteOrUpdateChanged = (before.info.isOnUpateCascade != now.info.isOnUpateCascade) || (before.info.isOnDeleteCascade != now.info.isOnDeleteCascade)

        if (isTableChanged || isRefChanged || onDeleteOrUpdateChanged){

            //up
            ret.up += drop(key) + setFullForeign(key, newTable, newRef, now.info)

            //down
            ret.down += drop(key) + setFullForeign(key, oldTable, oldRef, before.info);

        }
    }

    before.column = clearMethods(before.column, methods)
    now.column = clearMethods(now.column, methods)
}