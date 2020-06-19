import { Collection } from 'acey-node'
import * as Joid from '@hapi/joi';

let Joi = Joid.extend((joi) => {
    return {
        type: 'string',
        base: Joid.string(),
        flags: {
            unique: { default: false },
            primary_key: { default: false },
            foreign_key: { default: null },
            delete_cascade: { default: false },
            update_cascade: { default: false },
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
                method(table: string, key: string) {
                    return this.$_setFlag('foreign_key', [table, key]);
                },
                args: [ 'table', 'key' ]
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
        }
    }
});

Joi = Joi.extend((joi) => {
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
        },
        rules: {
            unique: {
                method() {
                    return this.$_setFlag('unique', true);
                }
            },
            autoIncrement: {
                method() {
                    return this.$_setFlag('auto_increment', true);
                }
            },
            primaryKey: {
                method() {
                    return this.$_setFlag('primary_key', true);
                }
            },
            foreignKey: {
                method(table: string, key: string) {
                    return this.$_setFlag('foreign_key', [table, key]);
                },
                args: [ 'table', 'key' ]
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
            }
        }
    }
});

Joi = Joi.extend((joi) => {
    return {
        type: 'date',
        base: Joi.date(),
        flags: {
            unique: { default: false },
            primary_key: { default: false },
            foreign_key: { default: null },
            delete_cascade: { default: false },
            update_cascade: { default: false },
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
                method(table: string, key: string) {
                    return this.$_setFlag('foreign_key', [table, key]);
                },
                args: [ 'table', 'key' ]
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
            }
        }
    }
});

export default Joi