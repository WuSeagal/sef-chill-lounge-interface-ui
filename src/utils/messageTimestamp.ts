function pad(n: number): string {
    return String(n).padStart(2, '0')
}

function isSameCalendarDayDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

/** 兩個 createdDate（ISO 字串）是否落在同一個日曆日，供跨日分隔線分組判斷用。 */
export function isSameCalendarDay(createdDateA: string, createdDateB: string): boolean {
    return isSameCalendarDayDate(new Date(createdDateA), new Date(createdDateB))
}

function formatFullDate(d: Date): string {
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

function formatTime(d: Date): string {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 每則訊息時間戳：今天/昨天用相對詞、更早用完整日期，皆 + HH:mm。 */
export function formatMessageTimestamp(createdDate: string, now: Date = new Date()): string {
    const d = new Date(createdDate)
    const time = formatTime(d)

    if (isSameCalendarDayDate(d, now)) {
        return `今天 ${time}`
    }

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    if (isSameCalendarDayDate(d, yesterday)) {
        return `昨天 ${time}`
    }

    return `${formatFullDate(d)} ${time}`
}

/** 跨日分隔線：固定顯示完整日期 YYYY/MM/DD，不使用相對詞。 */
export function formatDateDivider(createdDate: string): string {
    return formatFullDate(new Date(createdDate))
}
