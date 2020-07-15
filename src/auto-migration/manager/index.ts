
import _ from 'lodash'
import schema from './schema'
import migration from './migration'
import confirmation from './confirmation'

import config from '../../config'
import TableMaker from '../../table-engine'

import { getChanges } from '../changes'
import { tableToJSON, getTableAnalyzation, jsonToAnalyzation } from '../parse' 
import { migrationTemplate } from '../templates'

import { IMigration, IChange, IRenamed } from '../types'

const Color = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
  
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
  
    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m"
  }

export class Manager {
    
    schema = () => schema(this)
    migration = () => migration(this)
    confirmation = () => confirmation()

    removeAll = (name: string) => {
        this.schema().removeAll(name)
        this.migration().removeAll(name)
    }

    removeLast = (name: string) => {
        this.schema().removeLast(name)
        this.migration().removeLast(name)
    }

    hasTableChanged = (m: IMigration) => {
        const last = this.schema().lastSavedContent(m.table)
        if (last == null)
            return true
        const tableString = new TableMaker(m.schema, { mysqlConfig: config.mysqlConfig() }).tableString(m.table)
        return !_.isEqual(last, tableToJSON(tableString))
    }

    tableString = (m: IMigration) => new TableMaker(m.schema, { mysqlConfig: config.mysqlConfig() }).tableString(m.table)

    getChanges = (m: IMigration) => {
        if (this.hasTableChanged(m) && this.schema().lastFilename(m.table)){
            const oldTable = jsonToAnalyzation(this.schema().lastSavedContent(m.table))
            const newTable = getTableAnalyzation(this.tableString(m))
            return getChanges(oldTable, newTable)
        }
        return null
    }

    smartMigration = async (migrations: IMigration[]) => {
        const dels: any = {}
        const upds: any = {}
        const adds: any = {}
        const rens: any = {}
        const tablesUpdated: string[] = []

        const fillChanges = (d: any, changes: IChange[], table: string) => {
            if (changes.length > 0)
                d[table] = changes.map((e) => e.info.key)
        }

        const fillRenamed = (d: any, renamed: IRenamed[], table: string) => {
            if (renamed.length > 0)
                d[table] = renamed.map((e) => [e.before, e.after])
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
            console.log(msg)
        }
          
        const printCriticalConfirmationMessage = () => {
            const d = this.confirmation().generateCriticalCode()
            let msg = `${Color.Bright}🛑 WAIT!${Color.Reset} We detected ${Color.Bright}MySQL column(s) deletion${Color.Reset}\n\n`
            for (let key in dels)
                msg += `   - In table ${Color.Underscore}${key}${Color.Reset}, column${dels[key].length > 1 ? 's' : ''}: ${dels[key].map((v: string) => `${Color.FgYellow}${v}${Color.Reset}`).join(', ') }.\n`
            msg += `\nTo confirm the ${Color.FgRed}deletion${Color.Reset} of these column please set the following code through the method ${Color.FgGreen}setCriticalCode${Color.Reset} in your Configuration Manager, and re-run again the program.\n\n`
            msg += `Your code is ${Color.FgGreen}${d.code}${Color.Reset}, it has a validy time of ${Color.Bright}10 minutes${Color.Reset}.\n\n`
            console.log(msg)
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
                console.log('Migration begin 🎬')
                try {
                    await this.migration().migrateAll(migrations.map((m: IMigration) => m.table))
                    console.log(`Migration succeed in ${ ((new Date().getTime() - startTime) / 1000).toFixed(3)} seconds. ✅`)
                } catch (e){
                    console.log('Migration failed ❌')
                    console.log('error:', e)
                }
            } else if (isMigrationNeedsConfirmation()) {
                printCriticalConfirmationMessage()
                process.exit()
            }
        }

        for (let i = 0; i < migrations.length; i++){
            const m = migrations[i]
            const changes = this.getChanges(m)
            if (changes != null){
                fillChanges(dels, changes.deleted, m.table)
                fillChanges(upds, changes.updated, m.table)
                fillChanges(adds, changes.added, m.table)
                fillRenamed(rens, changes.renamed, m.table)
                tablesUpdated.push(m.table)
                await this.generateTemplatesWithoutMigration(m)
            }
        }
        await migrateAll()
    }

    getMigrationTemplates = (m: IMigration) => this.migration().get(m).map((r) => migrationTemplate(r, m.table) )

    generateTemplatesWithoutMigration = async (m: IMigration) => {
        let i = 0;
        for (let template of this.getMigrationTemplates(m)){
            try {
                if (i == 1)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                const filename = await this.migration().create(m.table)
                this.migration().upateMigrationFileContent(filename, template)
            } catch (e){
                throw new Error(e)
            }
            i++
        }
        this.schema().create(m)
    }

}

export default new Manager()