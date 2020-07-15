import { IInfo, IFullColumn, TColumn, TObjectStringString } from './types'
import { methodsToArray } from './lib'

export const tableToJSON = (table: string) => {
    const columns = tableToColumns(table)
    const infos = columnsToInformations(columns)

    let ret: any = {}
    for (let i = 0; i < columns.length; i++)
        ret[infos[i].key] = columns[i]
    return ret
}

export const tableToColumns = (table: string): TColumn[] => {
    let fnContent = table.substring(table.lastIndexOf('{') + 1, table.lastIndexOf('}'))
    fnContent = fnContent.replace(/(?:\r\n|\r|\n)/g, '');
    const array = fnContent.split(';')
    for (let i = 0; i < array.length; i++)
        array[i] = array[i].trim()
    return array.filter((e) => !!e)
}

export const jsonToColumns = (json: TObjectStringString): TColumn[] => methodsToArray(json)

export const columnsToInformations = (arrayColumn: TColumn[]): IInfo[] => {
    const ret: IInfo[] = []

    let i = 0;
    for (const column of arrayColumn){
        const info = {
            index: i,
            column,
            date: column.indexOf('t.dateTime(') != -1,
            timestamp: column.indexOf('t.timestamp(') != -1,
            string: column.indexOf('t.string(') != -1,
            text: column.indexOf('t.text(') != -1,
            boolean: column.indexOf('t.boolean(') != -1,
            number: column.indexOf('t.specificType(') != -1 || column.indexOf('t.float(') != -1 || column.indexOf('t.integer(') != -1,
            key: column.substring(column.indexOf(`'`) + 1, column.indexOf(`'`, column.indexOf(`'`) + 1)),
            accurate_type: '',
            hasDefault: column.indexOf('defaultTo(') != -1,
            isUnsigned: column.indexOf('unsigned') != -1 || column.indexOf('UNSIGNED') != -1,
            isNotNull: column.indexOf('notNullable()') != -1,
            isOnDeleteCascade: column.indexOf(`.onDelete('CASCADE')`) != -1,
            isOnUpateCascade: column.indexOf(`.onUpdate('CASCADE')`) != -1,
            hasPrimaryKey: column.indexOf('primary(') != -1 || column.indexOf('increments(') != -1,
            hasAutoIncrement: column.indexOf('increments(') != -1,
            hasUniqueKey: column.indexOf('unique()') != -1,
            hasForeignKey: (column.indexOf('references(') != -1 && column.indexOf('inTable(') != -1) || column.indexOf('foreign(') != -1
        }
        ret.push(Object.assign({}, info, {type: 
            info.date ? 'date' : 
            info.timestamp ? 'timestamp' : 
            info.string ? 'string' : 
            info.boolean ? 'boolean' : 
            info.number ?  'number' : ''
        }, {
            accurate_type: 
                column.indexOf(`'DOUBLE`) != -1 ? `double` :
                column.indexOf('t.float(') != -1 ? `float` :
                column.indexOf(`'varchar'`) != -1 ? `varchar` :
                column.indexOf(`'mediumtext'`) != -1 ? `mediumtext` :
                column.indexOf(`'longtext'`) != -1 ? `longtext` :
                column.indexOf(`'tinyint'`) != -1 ? `tinyint` :
                column.indexOf(`'mediumint'`) != -1 ? `mediumint` :
                column.indexOf(`'bigint'`) != -1 ? `bigint` :
                column.indexOf(`'int'`) != -1 ? `int` : '',
        }))
        i++
    }
    return ret
}

export const jsonToAnalyzation = (json: TObjectStringString): IFullColumn => {
    const columns = jsonToColumns(json)
    const infos = columnsToInformations(columns)

    return { columns, infos }
}

export const getTableAnalyzation = (tableStr: string): IFullColumn => {
    const columns = tableToColumns(tableStr)
    const infos = columnsToInformations(columns)

    return { columns, infos }
}
