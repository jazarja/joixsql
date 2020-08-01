import errors from '../errors'

export const toValidMySQLDateString = (d: Date): string => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours() 
    const minutes = d.getMinutes()
    const seconds = d.getSeconds()    

    const dateDetail = {
        year: d.getFullYear().toString(), 
        month: month < 10 ? '0' + month.toString() : month.toString(), 
        day: day < 10 ? '0' + day.toString() : day.toString(), 
        hour: hours < 10 ? '0' + hours.toString() : hours.toString(), 
        minute: minutes < 10 ? '0' + minutes.toString() : minutes.toString(), 
        second: seconds < 10 ? '0' + seconds.toString() : seconds.toString(), 
    }
    
    return `${dateDetail.year}-${dateDetail.month}-${dateDetail.day} ${dateDetail.hour}:${dateDetail.minute}:${dateDetail.second}`
}

export const isValidDefaultValueFunction = (value: any) => {
    const forbiddenNativeClass = [
        Array,
        Date,
        Object,
        Number,
        String,
        Symbol
    ]
    const isFunction = (value: any) => value && (Object.prototype.toString.call(value) === "[object Function]" || "function" === typeof value || value instanceof Function);
    for (let i = 0; i < forbiddenNativeClass.length; i++){
        if (value instanceof forbiddenNativeClass[i] && !isFunction(value))
            return errors.typeNotAcceptedForDefaultValue(forbiddenNativeClass[i].name)
    }
    if (!isFunction(value))
        return errors.typeNotAcceptedForDefaultValue(value)
}