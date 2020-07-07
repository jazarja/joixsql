interface IAnalyze {
    primary_key: string | null
    foreign_keys: Array<IForeign>
    populate: Array<IPopulate>
    refs: Array<IRef>
    defaults: any
    groups: any
}

interface IRef {
    origin: string
    dest: string
}

interface IPopulate {
    key: string
    table_reference: string
    key_reference: string
    group_id: void | string
    no_populate: boolean
}

interface IForeign {
    key: string
    table_reference: string
    key_reference: string
    group_id: void | string
    required: boolean
    no_populate: boolean
    update_cascade: boolean
    delete_cascade: boolean
}

export {
    IAnalyze,
    IForeign,
    IRef,
    IPopulate
}