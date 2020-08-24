import _ from 'lodash'
import { TColumn } from './types'
import sqlInfo from './info'

export default (prevCol: TColumn, nextCol: TColumn) => {
    return {
        defaultValue : () => !_.isEqual(sqlInfo(prevCol).pullDefaultTo(), sqlInfo(nextCol).pullDefaultTo()),
        primaryKeySettings : () =>!_.isEqual(sqlInfo(prevCol).pullPrimary(), sqlInfo(nextCol).pullPrimary()),
        foreignKeySettings: () => !_.isEqual(sqlInfo(prevCol).pullForeignKey(), sqlInfo(nextCol).pullForeignKey()),
        uniqueStatus : () => !_.isEqual(sqlInfo(prevCol).isUnique(), sqlInfo(nextCol).isUnique()),
        nullableStatus : () => !_.isEqual(sqlInfo(prevCol).isNotNullable(), sqlInfo(nextCol).isNotNullable()),
        type : () => !_.isEqual(sqlInfo(prevCol).type(), sqlInfo(nextCol).type()),
        unsignedStatus : () => !_.isEqual(sqlInfo(prevCol).isUnsigned(), sqlInfo(nextCol).isUnsigned()),
        method : () => !_.isEqual(sqlInfo(prevCol).method(), sqlInfo(nextCol).method()),
        stringMax: () => !_.isEqual(sqlInfo(prevCol).stringMax(), sqlInfo(nextCol).stringMax()),
        numberMaxAndMin: () => !_.isEqual(sqlInfo(prevCol).numberMaxAndMin(), sqlInfo(nextCol).numberMaxAndMin()),

    }
}
