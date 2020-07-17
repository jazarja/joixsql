import { TColumn, TObjectStringString } from './types'
import { clearMethods } from './parse'
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
        let ret = `t`
        if (method.startsWith(methods.autoIncrement)){
            ret = any().integer(ret, key)
            ret = any().unsigned(ret)           
        } else {
            ret += `t.${method}`
            if (sqlInfo(col).isUnsigned())
                ret = any().unsigned(ret)
        }
        ret = column().alter(ret)
        return ret
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
        add:  (prefix: string) => prefix + `.${methods.set}()`,
        setIncrement: (tableName: string, column: string) => `knex.raw(\`ALTER TABLE ${tableName} CHANGE ${sqlInfo(column).key()} ${sqlInfo(column).key()} INT(11) UNSIGNED NOT NULL AUTO_INCREMENT\`),\n`,
        
        //droppers
        drop: (key: string, autoIncrement: boolean, column: string) => `${autoIncrement ? dropAutoIncrement(key, column) : ''}t.${methods.drop}('${key}');\n`,
        dropAutoIncrement
    }
}

const column = () => {
    return {
        create: (col: TColumn) =>  `${col};\n`,
        alter: (col: TColumn) => `${col}.alter();\n`,
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

    const setCascadeIfRequired = (col: TColumn) => {
        const f = sqlInfo(col).pullForeignKey()
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
        set: (key: string, tableName: string, ref: string, col: TColumn) => set(key) + setReferences(`'${ref}'`) + setInTable(`'${tableName}'`) + setCascadeIfRequired(col) + ';\n'
    }
}

const any = () => {
    const methods: TObjectStringString = {
        unsigned: 'unsigned',
        defaultTo: 'defaultTo',
        integer: 'integer'
    }

    return {
        clear: (col: TColumn) => clearMethods(col, methods),
        unsigned: (prefix: string) => prefix + `.${methods.unsigned}()`,
        integer: (prefix: string, key: string) => prefix + `.${methods.integer}('${key}')`,
        defaultTo: (prefix: string, value: string) => prefix + `.${methods.defaultTo}('${value}')`,
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
        set: (prefix: string) => prefix + `.${methods.set}()`,
        drop: (prefix: string) => prefix + `.${methods.drop}()`
    }
}



export default {
    primary,
    foreign,
    unique,
    any,
    notNullable,
    column
}   