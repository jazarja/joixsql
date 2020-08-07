import _ from 'lodash'
import fs from 'fs'
import schema from './managers/schema'
import migration from './managers/migration'
import confirmation from './managers/confirmation'

import { config } from '../../index'

import { IUpdated } from './template/types'
import { IModel } from '../ecosystem'
import { Color } from '../utils'

export class Manager {
    
    schema = () => schema(this)
    migration = () => migration(this)
    confirmation = () => confirmation()

    removeAllHistory = (tableName: string) => {
        this.schema().removeAll(tableName)
        this.migration().removeAll(tableName)
    }

    removeLastHistory = (tableName: string) => {
        this.schema().removeLast(tableName)
        this.migration().removeLast(tableName)
    }

    smartMigration = async () => {
        const ecosystem = config.ecosystem()
        const migrations = !ecosystem ? [] : ecosystem.list()

        const dels: any = {}
        const upds: any = {}
        const adds: any = {}
        const rens: any = {}
        const affecteds: IModel[] = []
        const migrationFilesPath: string[] = []

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
            let msg = `We detected ${Color.FgWhite}MySQL table(s) changes${Color.Reset} on ${Color.Bright}${tablesChanged.length} table${tablesChanged.length > 1 ? 's' : ''}${Color.Reset}.\n\n`
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
            msg += `Your code is ${Color.FgGreen}${d.code}${Color.Reset}, it has a validy time of ${Color.Bright}10 minutes${Color.Reset}.\n`
            log(msg)
        }

        const isMigrationAllowed = () => {
            if (_.isEmpty(dels) || !config.isCriticalConfirmationEnabled() ||
             (config.criticalCode() != null && this.confirmation().isValid(config.criticalCode() as string)))
                return listTableUpdated().length > 0
            return false
        }

        const isMigrationNeedsConfirmation = () => {
            if (!_.isEmpty(dels) && 
                config.isCriticalConfirmationEnabled()) {
                    if (config.criticalCode() != null)
                        return !this.confirmation().isValid(config.criticalCode() || '')
                    return true
                }
                return false
        }

        const generateTemplate = async (m: IModel) => {
            let i = 0;
            const templates = await this.migration().get(m)
            for (let template of templates){
                try {
                    if (i > 0)
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    const filePath = await this.migration().create(m.tableName)
                    this.migration().updateMigrationFileContent(filePath, template)
                    migrationFilesPath.push(filePath)
                } catch (e){
                    throw new Error(e)
                }
                i++
            }
        }

        const handleMigrationError = (e: any) => {
            config.isRemovingMigrationOnErrorEnabled() && migrationFilesPath.map((fp: string) => fs.unlinkSync(fp))
            console.log(`\nMigration ${Color.FgRed}failed${Color.Reset}.`)
            console.log(`\ni) Migration files removing on error is ${config.isRemovingMigrationOnErrorEnabled() ? Color.FgGreen : Color.FgRed}${config.isRemovingMigrationOnErrorEnabled() ? 'enabled' : 'disabled'}${Color.Reset}.`)
            config.isRemovingMigrationOnErrorEnabled() && console.log(`Information: You need to manually fix the error if it comes from a SQL data conflict with your new schema constraints, before re-running the program.`)
            !config.isRemovingMigrationOnErrorEnabled() && console.log(`Information: You need to manually remove the migration files causing the error before re-running the program.`)
            throw new Error(e)
        }

        const migrateAll = async () => {
            if (isMigrationAllowed()){
                const startTime = new Date().getTime()
                log('\n-------------------------------------------\n')
                printMigrationMessage()
                try {
                    //Generate the the migration files
                    for (let m of affecteds)
                        await generateTemplate(m)
                    //Migrate with each migration files created
                    await this.migration().migrateAll()
                    //Create all the new schemas.
                    for (let m of affecteds)
                        this.schema().create(m)

                    log(`Table${listTableUpdated().length > 1 ? 's' : ''} migration ${Color.FgGreen}succeed${Color.Reset} in ${ ((new Date().getTime() - startTime) / 1000).toFixed(3)} seconds. ✅`)
                    log('\n-------------------------------------------\n')
                } catch (e){
                    handleMigrationError(e)
                }

            } else if (isMigrationNeedsConfirmation()) {
                log('\n-------------------------------------------\n')
                printCriticalConfirmationMessage()
                log('\n-------------------------------------------\n')
                process.exit()
            }
        }

        for (let i = 0; i < migrations.length; i++){
            const m = migrations[i]
            const changes = this.schema().changes(m)
            if (changes != null){
                affecteds.push(m)
                fillChanges(dels, changes.deleted, m.tableName)
                fillChanges(upds, changes.updated, m.tableName)
                fillChanges(adds, changes.added, m.tableName)
                fillRenamed(rens, changes.renamed, m.tableName)
            }
        }
        await migrateAll()
    }
}

export default new Manager()