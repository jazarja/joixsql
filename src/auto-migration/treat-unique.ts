import { ITemplate, IChange, TObjectStringString } from './types'
import { clearMethods } from './lib'

export default (ret: ITemplate, before: IChange, now: IChange) => {

    const methods: TObjectStringString = {
        drop: 'dropUnique',
        set: 'unique',
    }

    const drop = (key: string) => `  t.${methods.drop}('${key}');\n`
    const set = (key: string) => `   t.${methods.set}('${key}');\n`

    const { key } = now.info

    const wasUnique = before.info.hasUniqueKey
    const isUnique = now.info.hasUniqueKey

    if (!wasUnique && isUnique) {
        //up
        ret.up += set(key)

        //down
        ret.down = drop(key) + ret.down
    } else if (wasUnique && !isUnique){

        //up
        ret.up = drop(key) + ret.up

        //down
        ret.down += set(key)
    }

    before.column = clearMethods(before.column, methods)
    now.column = clearMethods(now.column, methods)
}