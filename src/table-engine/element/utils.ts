export const toValidMySQLDateString = (d: Date): string => {
    const month = d.getMonth() + 1
    const dateDetail = {year: d.getFullYear().toString(), month: month < 10 ? '0' + month.toString() : month.toString(), day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() } 
    return `${dateDetail.year}-${dateDetail.month}-${dateDetail.day} ${dateDetail.hour}:${dateDetail.minute}:${dateDetail.second}`
}