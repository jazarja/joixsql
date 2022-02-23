import { Root } from 'joi'
import { JoiSQLRoot } from './types'

export const JoiMySQL = (Joi: Root): JoiSQLRoot => {

    let Joixmsql: JoiSQLRoot = Joi.extend({
        type: 'string',
            base: Joi.string(),
            flags: {
                unique: { default: false },
                foreign_key: { default: null },
                populate: { default: null },
                noPopulate: {default: false},
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
                noPopulate: {
                    method() {
                        return this.$_setFlag('noPopulate', true);
                    }
                },
                foreignKey: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('foreign_key', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                populate: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('populate', [table, key, groupID]);
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
    }, {
        type: 'number',
        base: Joi.number(),
        flags: {
            unique: { default: false },
            auto_increment: { default: false },
            primary_key: { default: false },
            float: { default: false },
            double: { default: false },
            foreign_key: { default: null },
            populate: { default: null },
            noPopulate: {default: false},
            delete_cascade: { default: false },
            update_cascade: { default: false },
            group: { default: null },
            float_precision: {default: null},
        },
        rules: {
            unique: {
                method() {
                    return this.$_setFlag('unique', true);
                }
            },
            noPopulate: {
                method() {
                    return this.$_setFlag('noPopulate', true);
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
            populate: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('populate', [table, key, groupID]);
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
                method(precision: number, scale: number) {
                    return this.$_setFlag('float', {precision, scale});
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
    }, 
    {
        type: 'date',
        base: Joi.date(),
        flags: {
            unique: { default: false },
            primary_key: { default: false },
            foreign_key: { default: null },
            populate: { default: null },
            noPopulate: {default: false},
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
            noPopulate: {
                method() {
                    return this.$_setFlag('noPopulate', true);
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
            populate: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('populate', [table, key, groupID]);
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
    }, 
    {
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
    })
    return Joixmsql
}

export default JoiMySQL(require('joi'))