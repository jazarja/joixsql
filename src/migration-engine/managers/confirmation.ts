import fs from 'fs'
import { config } from '../../../index'

export interface ICode {
    code: string
    expiration: number
}

export default () => {

    const path = () => `${config.historyDir()}/__critical_confirmation_code.json`

    const generateCriticalCode = () => {
        const d: ICode = {
            expiration: Math.floor((new Date().getTime() / 1000)) + 600, //in 10 minutes
            code: random6Digit()
        }
        try {
            fs.writeFileSync(path(), JSON.stringify(d, null, 4))
            return d
        } catch (e){
            throw new Error(e)
        }
    }

    const deleteFile = () => fs.unlinkSync(path())

    const isFileConfirmationExist = () => fs.existsSync(path())
    
    const getFileCode = (): ICode => {
        if (isFileConfirmationExist())
            return JSON.parse(fs.readFileSync(path(), 'utf-8')) 
        return { code: 'FILE_NOT_EXISTING', expiration: (new Date().getTime() / 1000) - 1}
    }

    const isExpired = () => getFileCode().expiration < (new Date().getTime() / 1000)

    const isCorrectCode = (code: string) => getFileCode().code === code

    const isValid = (code: string) => !isExpired() && isCorrectCode(code)

    const random6Digit = () => {
        const randomInteger = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        let ret = ''
        for (let i = 0; i < 6; i++)
            ret += randomInteger(0, 9)
        return ret
    }

    return {
        generateCriticalCode,
        isValid,
        isExpired,
        isCorrectCode,
        deleteFile
    }
}