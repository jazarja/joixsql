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
                /* UNIQUE Constraints on MySQL / MariaDB */
                unique: {
                    method() {
                        return this.$_setFlag('unique', true);
                    }
                },
                /* 
                    Specify that we don't want rendering relationship between linked columns through foreign key or populate 
                    This method doesn't have any consequence on the SQL Schema.
                    This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data..
                */
                noPopulate: {
                    method() {
                        return this.$_setFlag('noPopulate', true);
                    }
                },
                /* FOREIGN KEY constraint */
                foreignKey: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('foreign_key', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                /*
                    Populated columns are columns linked with other ones in other tables.
                    It can be a column with a foreign key or just a "populate" indicating the link between two columns
                    without sql consequences.
                    "Populate" extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.
                */
                populate: {
                    method(table: string, key: string, groupID: void | number) {
                        return this.$_setFlag('populate', [table, key, groupID]);
                    },
                    args: [ 'table', 'key', 'groupID' ]
                },
                /* ON DELETE CASCADE clause (only with foreignKey) */
                deleteCascade: {
                    method() {
                        return this.$_setFlag('delete_cascade', true);
                    },
                },
                /* ON UPDATE CASCADE clause (only with foreignKey) */
                updateCascade: {
                    method() {
                        return this.$_setFlag('update_cascade', true);
                    },
                },
                /* 
                    NO effect on MySQL/MariaDB. 
                    Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they
                    are included in a group, to avoid rendering the whole object when no need.
                */
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
            /* UNIQUE Constraints on MySQL / MariaDB */
            unique: {
                method() {
                    return this.$_setFlag('unique', true);
                }
            },
            /* 
                Specify that we don't want rendering relationship between linked columns through foreign key or populate 
                This method doesn't have any consequence on the SQL Schema.
                This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data..
            */
            noPopulate: {
                method() {
                    return this.$_setFlag('noPopulate', true);
                }
            },
            /*  Auto increment feature on MYSQL / MariaDB */
            autoIncrement: {
                method() {
                    this.$_setFlag('primary_key', true);
                    this.$_setFlag('unique', true);
                    return this.$_setFlag('auto_increment', true);
                }
            },
            /* PRIMARY KEY constraint */
            primaryKey: {
                method() {
                    return this.$_setFlag('primary_key', true);
                }
            },
            /* FOREIGN KEY constraint */
            foreignKey: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('foreign_key', [table, key, groupID]);
                },
                args: [ 'table', 'key', 'groupID' ]
            },
            /*
                Populated columns are columns linked with other ones in other tables.
                It can be a column with a foreign key or just a "populate" indicating the link between two columns
                without sql consequences.
                "Populate" extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.
            */
            populate: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('populate', [table, key, groupID]);
                },
                args: [ 'table', 'key', 'groupID' ]
            },
            /* ON DELETE CASCADE clause (only with foreignKey) */
            deleteCascade: {
                method() {
                    return this.$_setFlag('delete_cascade', true);
                },
            },
            /* ON UPDATE CASCADE clause (only with foreignKey) */
            updateCascade: {
                method() {
                    return this.$_setFlag('update_cascade', true);
                },
            },
            /* Float number type: https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html */
            float: {
                method(precision: number, scale: number) {
                    return this.$_setFlag('float', {precision, scale});
                }
            },
            /* Double number type: https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html */
            double: {
                method() {
                    return this.$_setFlag('double', true);
                }
            },
            /* 
                NO effect on MySQL/MariaDB. 
                Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they
                are included in a group, to avoid rendering the whole object when no need.
            */
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
            /* UNIQUE Constraints on MySQL / MariaDB */
            unique: {
                method() {
                    return this.$_setFlag('unique', true);
                }
            },
            /* 
                Specify that we don't want rendering relationship between linked columns through foreign key or populate 
                This method doesn't have any consequence on the SQL Schema.
                This extension has been added to enable feature developement on top of JOIxSQL for formating rendered data..
            */
            noPopulate: {
                method() {
                    return this.$_setFlag('noPopulate', true);
                }
            },
            /* PRIMARY KEY constraint */
            primaryKey: {
                method() {
                    return this.$_setFlag('primary_key', true);
                }
            },
            /* FOREIGN KEY constraint */
            foreignKey: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('foreign_key', [table, key, groupID]);
                },
                args: [ 'table', 'key', 'groupID' ]
            },
            /*
                Populated columns are columns linked with other ones in other tables.
                It can be a column with a foreign key or just a "populate" indicating the link between two columns
                without sql consequences.
                "Populate" extension has been added to enable feature developement on top of JOIxSQL for formating rendered data for example.
            */
            populate: {
                method(table: string, key: string, groupID: void | number) {
                    return this.$_setFlag('populate', [table, key, groupID]);
                },
                args: [ 'table', 'key', 'groupID' ]
            },
            /* ON DELETE CASCADE clause (only with foreignKey) */
            deleteCascade: {
                method() {
                    return this.$_setFlag('delete_cascade', true);
                },
            },
            /* ON UPDATE CASCADE clause (only with foreignKey) */
            updateCascade: {
                method() {
                    return this.$_setFlag('update_cascade', true);
                },
            },
            /* 
                NO effect on MySQL/MariaDB. 
                Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they
                are included in a group, to avoid rendering the whole object when no need.
            */
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
            /* 
                NO effect on MySQL/MariaDB. 
                Feature enabled to allow feature developement on top of JOIxSQL, for classifying columns data, to render them only when they
                are included in a group, to avoid rendering the whole object when no need.
            */
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