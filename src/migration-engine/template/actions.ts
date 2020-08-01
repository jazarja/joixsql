import { TColumn, TObjectStringString } from './types'
import { clearMethods, cumulateWithMethod } from './parse'
import sqlInfo from './info'


/*      primary and increment   */    
const primary = () => {
    
    const methods: TObjectStringString = {
        drop: 'dropPrimary',
        set: 'primary',
        autoIncrement: 'increments'
    }

    const dropAutoIncrement = (key: string, col: string) => {
        const method = sqlInfo(col).method(false) as string
        let ret = ``
        if (method.startsWith(methods.autoIncrement)){
            ret = any().integer('t', key)
            ret = any().unsigned(ret)           
        } else {
            ret = `t.${method}`
            if (sqlInfo(col).isUnsigned())
                ret = any().unsigned(ret)
        }
        return column().alter(ret) + ';\n'
    }
    const setPrimaryWithIncrement = (key: string) => `t.${methods.autoIncrement}('${key}');\n`
    const setPrimary = (key: string) => `t.${methods.set}('${key}');\n`

    return {
        is: (col: string) => !!sqlInfo(col).pullPrimary(),
        isAutoIncrement: (col: string) => {
            const p = sqlInfo(col).pullPrimary()
            return p && p.autoIncrement
        },
        clear: (col: TColumn) => clearMethods(col, methods),

        //setters
        set: (key: string, autoIncrement: boolean) => autoIncrement ? setPrimaryWithIncrement(key) : setPrimary(key),
        add:  (col: TColumn) => cumulateWithMethod(col, `.${methods.set}()`),
        positionAndIncrementsRaw: (tableName: string, column: string) => {
            return `knex.raw(\`ALTER TABLE ${tableName} CHANGE ${sqlInfo(column).key()} ${sqlInfo(column).key()} INT(10) ${sqlInfo(column).isDeepUnsigned() ? 'UNSIGNED' : ''} NOT NULL ${sqlInfo(column).isAutoIncrements() ? 'AUTO_INCREMENT' : ''} FIRST\`),\n`
        },
        //droppers
        drop: (key: string, autoIncrement: boolean, column: string) => `${autoIncrement ? dropAutoIncrement(key, column) : ''}t.${methods.drop}('${key}');\n`,
        dropAutoIncrement
    }
}

const column = () => {
    return {
        create: (col: TColumn) =>  `${col};\n`,
        alter: (col: TColumn) => cumulateWithMethod(col, `.alter()`),
        drop: (key: TColumn) => `t.dropColumn('${key}');\n`,
        rename: (from: TColumn, to: TColumn) => `t.renameColumn('${from}', '${to}');\n`
    }
}

const foreign = () => {

    const methods: TObjectStringString = {
        drop: 'dropForeign',
        set: 'foreign',
        inTable: 'inTable',
        references: 'references',
        onDelete: `onDelete`,
        onUpdate: `onUpdate`
    }
    const set = (key: string) => `t.${methods.set}('${key}')`
    const setInTable = (tableName: string) => `.${methods.inTable}(${tableName})`
    const setReferences = (key: string) => `.${methods.references}(${key})`
    const setOnDeleteCascade = () => `.${methods.onDelete}('CASCADE')`
    const setOnUpdateCascade = () => `.${methods.onUpdate}('CASCADE')`

    const setCascadeIfRequired = (f: any) => {
        if (!f)
            return
        return  `${f.isDelCascade ? setOnDeleteCascade() : ''}${f.isUpdCascade ? setOnUpdateCascade() : ''}`
    }

    return {
        is: (col: TColumn) => {
            const f = sqlInfo(col).pullForeignKey()
            return f && f.ref
        },
        clear: (col: TColumn) => clearMethods(col, methods),
        drop: (key: string) => `t.${methods.drop}('${key}');\n`,
        set: (col: TColumn) => {
            const key = sqlInfo(col).key()
            const f = sqlInfo(col).pullForeignKey()
            if (!f || !key)
                throw new Error('internal error.')
            return set(key) + setReferences(`'${f.ref}'`) + setInTable(`'${f.table}'`) + setCascadeIfRequired(f) + ';\n'
        }
    }
}

const defaultValue = () => {
    const methods: TObjectStringString = {
        set: 'defaultTo'
    }

    return {
        clear: (col: TColumn) => clearMethods(col, methods),
        is: (col: TColumn) => {
            const f = sqlInfo(col).pullDefaultTo()
            return f != undefined
        },
        set: (col: TColumn, value: string, isStringValue: boolean = false) => {
            const v = isStringValue ? `'${value}'` : value
            return cumulateWithMethod(col, `.${methods.set}(${v})`)
        },
        drop: (tableName: string, column: string) => `knex.raw(\`ALTER TABLE ${tableName} ALTER COLUMN ${sqlInfo(column).key()} DROP DEFAULT\`),\n`
    }
}

const any = () => {
    const methods: TObjectStringString = {
        unsigned: 'unsigned',
        integer: 'integer',
    }
    
    return {
        clear: (col: TColumn) => clearMethods(col, methods),
        unsigned: (column: string) => cumulateWithMethod(column, `.${methods.unsigned}()`),
        integer: (column: string, key: string) => column + `.${methods.integer}('${key}')`,
    }
}

const unique = () => {
    const methods: TObjectStringString = {
        drop: 'dropUnique',
        set: 'unique',
    }

    return {
        clear: (col: TColumn) => clearMethods(col, methods),
        is: (col: TColumn) => sqlInfo(col).isUnique(),
        drop: (key: string) => `t.${methods.drop}('${key}');\n`,
        set: (key: string) => `t.${methods.set}('${key}');\n`
    }
}

const notNullable =  () => {    
    const methods: TObjectStringString = {
        drop: 'nullable',
        set: 'notNullable',
    }
    
    return {
        clear: (col: TColumn) => clearMethods(col, methods),
        is: (col: TColumn) => sqlInfo(col).isNotNullable(),
        set: (col: TColumn) => cumulateWithMethod(col, `.${methods.set}()`),
        drop: (col: TColumn) => cumulateWithMethod(col, `.${methods.drop}()`)
    }
}



export default {
    primary,
    foreign,
    unique,
    defaultValue,
    any,
    notNullable,
    column
}   