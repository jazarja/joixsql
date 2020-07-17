import Element from '.'
import Is from './is'
import _ from 'lodash'

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