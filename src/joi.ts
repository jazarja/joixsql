import { Root } from '@hapi/joi'
import { JoiSQLRoot } from './joi-types'

export const JoiMySQL = (Joi: Root): JoiSQLRoot => {

    let JoiMySQL: JoiSQLRoot = Joi.extend((joi) => {
        return {
            type: 'string',
            base: Joi.string(),
            flags: {
                unique: { default: false },
                foreign_key: { default: null },
                delete_cascade: { default: false },
                update_cascade: { default: false },
                group: { default: null },
            },
            rules: {
                unique: {
                    method() {
                        return this.$_setFlag('unique', true);
                    }
                },
                foreignKey: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('foreign_key', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                deleteCascade: {
                    method() {
                        return this.$_setFlag('delete_cascade', true);
                    },
                },
                updateCascade: {
                    method() {
                        return this.$_setFlag('update_cascade', true);
                    },
                },
                group: {
                    method(ids: string[]) {
                        return this.$_setFlag('group', ids);
                    },
                    args: [ 'ids' ]
                }
            }
        }
    });
    
    JoiMySQL = JoiMySQL.extend((joi: Root) => {
        return {
            type: 'number',
            base: Joi.number(),
            flags: {
                unique: { default: false },
                auto_increment: { default: false },
                primary_key: { default: false },
                float: { default: false },
                double: { default: false },
                foreign_key: { default: null },
                delete_cascade: { default: false },
                update_cascade: { default: false },
                group: { default: null },
            },
            rules: {
                unique: {
                    method() {
                        return this.$_setFlag('unique', true);
                    }
                },
                autoIncrement: {
                    method() {
                        this.$_setFlag('primary_key', true);
                        this.$_setFlag('unique', true);
                        return this.$_setFlag('auto_increment', true);
                    }
                },
                primaryKey: {
                    method() {
                        return this.$_setFlag('primary_key', true);
                    }
                },
                foreignKey: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('foreign_key', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                deleteCascade: {
                    method() {
                        return this.$_setFlag('delete_cascade', true);
                    },
                },
                updateCascade: {
                    method() {
                        return this.$_setFlag('update_cascade', true);
                    },
                },
                float: {
                    method() {
                        return this.$_setFlag('float', true);
                    }
                },
                double: {
                    method() {
                        return this.$_setFlag('double', true);
                    }
                },
                group: {
                    method(ids: string[]) {
                        return this.$_setFlag('group', ids);
                    },
                    args: [ 'ids' ]
                }
            }
        }
    });
    
    JoiMySQL = JoiMySQL.extend((joi: Root) => {
        return {
            type: 'date',
            base: Joi.date(),
            flags: {
                unique: { default: false },
                primary_key: { default: false },
                foreign_key: { default: null },
                delete_cascade: { default: false },
                update_cascade: { default: false },
                group: { default: null },
            },
            rules: {
                unique: {
                    method() {
                        return this.$_setFlag('unique', true);
                    }
                },
                primaryKey: {
                    method() {
                        return this.$_setFlag('primary_key', true);
                    }
                },
                foreignKey: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('foreign_key', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                deleteCascade: {
                    method() {
                        return this.$_setFlag('delete_cascade', true);
                    },
                },
                updateCascade: {
                    method() {
                        return this.$_setFlag('update_cascade', true);
                    },
                },
                group: {
                    method(ids: string[]) {
                        return this.$_setFlag('group', ids);
                    },
                    args: [ 'ids' ]
                }
            }
        }
    });

    JoiMySQL = JoiMySQL.extend((joi: Root) => {
        return {
            type: 'boolean',
            base: Joi.boolean(),
            flags: {
                group: { default: null },
            },
            rules: {
                group: {
                    method(ids: string[]) {
                        return this.$_setFlag('group', ids);
                    },
                    args: [ 'ids' ]
                }
            }
        }
    });


    return JoiMySQL
}

export default JoiMySQL