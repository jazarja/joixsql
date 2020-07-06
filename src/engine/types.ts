interface IAnalyze {
    primary_key: string | null
    foreign_keys: Array<IForeign>
    refs: Array<IRef>
    defaults: any
    groups: any
}

interface IRef {
    origin: string
    dest: string
}

interface IForeign {
    key: string
    table_reference: string
    key_reference: string
    group_id: void | string
    update_cascade: boolean
    delete_cascade: boolean
}

export {
    IAnalyze,
    IForeign,
    IRef
}