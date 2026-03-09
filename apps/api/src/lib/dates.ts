/** Returns today and yesterday as UTC midnight Date objects. */
export function getUTCDays(): { todayUTC: Date; yesterdayUTC: Date } {
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)
  const yesterdayUTC = new Date(todayUTC)
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
  return { todayUTC, yesterdayUTC }
}
