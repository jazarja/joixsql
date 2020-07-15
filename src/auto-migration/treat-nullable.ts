import { IChange, TObjectStringString } from './types'

export default (before: IChange, now: IChange) => {

    const methods: TObjectStringString = {
        set: 'nullable'
    }

    const set = () => `.${methods.set}()`

    const wasNotNullable = before.info.isNotNull
    const isNotNullable = now.info.isNotNull

    if (wasNotNullable && !isNotNullable) {
        const arr = now.column.split('')
        arr.splice(now.column.indexOf(')') + 1, 0, ...set().split(''))
        now.column = arr.join('')
    }
}