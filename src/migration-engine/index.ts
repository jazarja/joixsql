import _ from 'lodash'
import schema from './managers/schema'
import migration from './managers/migration'
import confirmation from './managers/confirmation'
import errors from './managers/errors'

import { config } from '../../index'

import { IUpdated } from './template/types'
import { IModel } from '../ecosystem'
import { Color } from './managers/utils'

export class Manager {
    
    schema = () => schema(this)
    migration = () => migration(this)
    errors = () => errors()
    confirmation = () => confirmation()

    removeAllHistory = (tableName: string) => {
        this.schema().removeAll(tableName)
        this.migration().removeAll(tableName)
    }

    removeLastHistory = (tableName: string) => {
        this.schema().removeLast(tableName)
        this.migration().removeLast(tableName)
    }

    smartMigration = async (migrations: IModel[]) => {
        const dels: any = {}
        const upds: any = {}
        const adds: any = {}
        const rens: any = {}

        const log = (...msg: any) => config.isLogEnabled() && console.log(...msg)

        const fillChanges = (d: any, changes: any, table: string) => {
            if (_.size(changes) > 0)
                d[table] = Object.keys(changes)
        }

        const fillRenamed = (d: any, renamed: IUpdated[], table: string) => {
            if (renamed.length > 0)
                d[table] = renamed.map((e) => [e.old, e.new])
        }

        const listTableUpdated = () => _.uniq(Object.keys(dels).concat(Object.keys(upds)).concat(Object.keys(adds)).concat(Object.keys(rens)))

        const printMigrationMessage = () => {
            const tablesChanged = listTableUpdated()
            let msg = `Changes detected on ${Color.FgGreen}${tablesChanged.length} table${tablesChanged.length > 1 ? 's' : ''}${Color.Reset}.\n\n`
            for (let table of tablesChanged){
                msg += `-  ${Color.Underscore}${table}${Color.Reset}:\n\n`
                if (!!adds[table]) msg += `   | ${Color.FgGreen}add${Color.Reset}: ${adds[table].map((v: string) => `${Color.Dim}${v}${Color.Reset}`).join(', ')}\n`
                if (!!upds[table]) msg += `   | ${Color.FgBlue}update${Color.Reset}: ${upds[table].map((v: string) => `${Color.Dim}${v}${Color.Reset}`).join(', ')}\n`
                if (!!dels[table]) msg += `   | ${Color.FgRed}delete${Color.Reset}: ${dels[table].map((v: string) => `${Color.Dim}${v}${Color.Reset}`).join(', ')}\n`
                if (!!rens[table]) msg += `   | ${Color.FgCyan}rename${Color.Reset}: ${rens[table].map((e: any) => e.map((v: string) => `${Color.Dim}${v}${Color.Reset}`).join(' -> ')).join(' ; ')}\n`
                msg += '\n'        
            }
            log(msg)
        }
          
        const printCriticalConfirmationMessage = () => {
            const d = this.confirmation().generateCriticalCode()
            let msg = `${Color.Bright}🛑 WAIT!${Color.Reset} We detected ${Color.Bright}MySQL column(s) deletion${Color.Reset}\n\n`
            for (let key in dels)
                msg += `   - In table ${Color.Underscore}${key}${Color.Reset}, column${dels[key].length > 1 ? 's' : ''}: ${dels[key].map((v: string) => `${Color.FgYellow}${v}${Color.Reset}`).join(', ') }.\n`
            msg += `\nTo confirm the ${Color.FgRed}deletion${Color.Reset} of these column please set the following code through the method ${Color.FgGreen}setCriticalCode${Color.Reset} in your Configuration Manager, and re-run again the program.\n\n`
            msg += `Your code is ${Color.FgGreen}${d.code}${Color.Reset}, it has a validy time of ${Color.Bright}10 minutes${Color.Reset}.\n\n`
            log(msg)
        }

        const isMigrationAllowed = () => {
            if (_.isEmpty(dels) || !config.isCriticalConfirmationEnabled() ||
             (config.criticalCode() != null && this.confirmation().isValid(config.criticalCode() as string)))
                return listTableUpdated().length > 0
            return false
        }

        const isMigrationNeedsConfirmation = () => {
            if (listTableUpdated().length > 0 && 
                !_.isEmpty(dels) && 
                config.isCriticalConfirmationEnabled()) {
                    if (config.criticalCode() != null){
                        return !this.confirmation().isValid(config.criticalCode() as string)
                    } 
                    return true
                }
                return false
        }

        const migrateAll = async () => {
            if (isMigrationAllowed()){
                const startTime = new Date().getTime()
                printMigrationMessage()
                log('Migration begin 🎬')
                try {
                    await this.migration().migrateAll()
                    for (let m of migrations)
                        this.schema().create(m)
                    log(`Migration succeed in ${ ((new Date().getTime() - startTime) / 1000).toFixed(3)} seconds. ✅`)

                } catch (e){
                    for (let m of migrations)
                        this.migration().removeLast(m.tableName)
                    log('Migration failed ❌')
                    log('error:', e)
                    if (!config.isLogEnabled()){
                        throw new Error(e)
                    }
                }
            } else if (isMigrationNeedsConfirmation()) {
                printCriticalConfirmationMessage()
                process.exit()
            }
        }

        for (let i = 0; i < migrations.length; i++){
            const m = migrations[i]
            const changes = this.schema().changes(m)
            if (changes != null){
                fillChanges(dels, changes.deleted, m.tableName)
                fillChanges(upds, changes.updated, m.tableName)
                fillChanges(adds, changes.added, m.tableName)
                fillRenamed(rens, changes.renamed, m.tableName)
                await this.generateTemplateWithoutMigration(m)
            }
        }
        await migrateAll()
    }

    generateTemplateWithoutMigration = async (m: IModel) => {
        let i = 0;
        for (let template of this.migration().get(m)){
            try {
                if (i > 0)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                const filename = await this.migration().create(m.tableName)
                this.migration().updateMigrationFileContent(filename, template)
            } catch (e){
                throw new Error(e)
            }
            i++
        }
    }

}

export default new Manager()