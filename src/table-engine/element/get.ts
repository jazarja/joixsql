import Element from '.'
import Is from './is'
import _ from 'lodash'
import { DEFAULT_SQL_TYPES, MYSQL_NUMBER_TYPES } from '../mysql/types'

export interface IFloatPrecision {
    precision: number
    scale: number
}

export default class Get {

    private _is: Is
    private _element: Element
    
    constructor(element: Element){
        this._element = element
        this._is = new Is(element)
    }

    public is = () => this._is
    public element = () => this._element
    public flags = () => this.element().flags()
    public rules = () => this.element().rules()
    public type = () => this.element().type()
    public allow = () => this.element().allow()

    defaultValue = (): any => this.is().defaultValue() ? this.flags().default : undefined
    foreignKey = (): Array<any[3]> => this.is().foreignKey() ? this.flags().foreign_key : undefined
    populate = (): Array<any[3]> => this.is().populate() ? this.flags().populate : undefined
    group = (): string[] => this.is().group() ? this.flags().group : undefined

    floatPrecision = (): IFloatPrecision | undefined => this.is().float() ? this.flags().float : undefined

    max = () => this.is().maxSet() ? _.find(this.rules(), {name: 'max'}).args.limit : undefined
    greater = () => this.is().greaterSet() ? _.find(this.rules(), {name: 'greater'}).args?.limit : undefined
    min = () => this.is().minSet() ? _.find(this.rules(), {name: 'min'}).args?.limit : undefined
    less = () => this.is().lessSet() ? _.find(this.rules(), {name: 'less'}).args?.limit : undefined
    precision = () => this.is().precisionSet() ? _.find(this.rules(), {name: 'precision'}).args?.limit : undefined
    ref = () => this.is().ref() ? Object.assign({}, ...this.allow()).ref.path[0] : undefined

    numberValueAndType = () => {
        if (this.type() !== 'number'){
            return null
        }
        if (this.is().float()){
            const isUnsigned = this.is().strictlyPositive()
            const floatPrecision = this.element().get().floatPrecision() as IFloatPrecision
            const max = parseInt(([] as string[]).fill('9', 0, floatPrecision.precision - floatPrecision.scale).join(''))
            return {
                type: `FLOAT`,
                maximum: max,
                minimum: isUnsigned ? 0 : max * -1
            }
        }
        if (this.is().double()){
            const isUnsigned = this.is().strictlyPositive()
            return {
                type: `DOUBLE${isUnsigned ? ` unsigned`: ''}`,
                minimum: isUnsigned ? 0 : -1.7976931348623157E+308,
                maximum: 1.7976931348623157E+308
            }
        }
        if (this.is().portSet()){
            return {
                type: 'int unsigned',
                minimum: 0,
                maximum: 4294967295
            }
        }

        let minimum: any, maximum: any;
        let type = _.find(DEFAULT_SQL_TYPES, {key: 'number'}).type

        minimum = this.greater() || minimum
        maximum = this.less() || maximum
        maximum = this.max() || maximum
        minimum = this.min() || minimum

        if (minimum == undefined)
            minimum = this.is().strictlyPositive() ? 0 : _.find(MYSQL_NUMBER_TYPES, {type: 'int'}).min
        if (maximum == undefined)
            maximum = _.find(MYSQL_NUMBER_TYPES, {type: 'int'}).max

        const isUnsigned = minimum >= 0 
        const isMinBiggest = (Math.max(Math.abs(minimum), Math.abs(maximum)) * -1 === minimum)
        const e = _.find(MYSQL_NUMBER_TYPES, (o) => isMinBiggest ? minimum >= o.min : maximum <= o.max)
        if (!e){
            type = `DOUBLE${isUnsigned ? ` unsigned`: ''}`
            minimum = isUnsigned ? 0 : -1.7976931348623157E+308
            maximum = 1.7976931348623157E+308
        }
        else {
            type = `${e.type}${isUnsigned ? ` unsigned` : ''}`
            minimum = isUnsigned ? 0 : e.min
            maximum = isUnsigned ? (e.max * 2) : e.max 
        }

        return { type, minimum, maximum }

    }

    stringLengthByType = () => {
        if (this.type() !== 'string'){
            return -1
        }
        if (_.find(this.rules(), o => o.name === 'dataUri' || o.name === 'uri' || o.name === 'uriCustomScheme' || o.name === "uriRelativeOnly"))
            return 90000
        if (_.find(this.rules(), o => o.name === 'email' || o.name === 'domain' || o.name === 'hostname' || o.name === 'ipVersion'))
            return 255
        if (_.find(this.rules(), {name: 'guid'}))
            return 70
        if (_.find(this.rules(), o => o.name === 'creditCard' || o.name === 'ip' || o.name === 'isoDate' || o.name === 'isoDuration'))
            return 32
        return -1
    }
}