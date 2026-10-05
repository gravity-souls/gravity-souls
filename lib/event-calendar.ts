type CalendarEvent = { id: string; title: string; date: Date; updatedAt: Date; location: string | null }

function text(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}
function utc(date: Date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') }
// Calendar content lines are folded by UTF-8 bytes, without splitting a code point.
function fold(line: string) {
  const encoder = new TextEncoder()
  let result = '', bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) { result += '\r\n '; bytes = 1 }
    result += char; bytes += size
  }
  return result
}
export function eventCalendar(event: CalendarEvent) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gravity Souls//Activities//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${text(event.id)}@gravity-souls`, `DTSTAMP:${utc(event.updatedAt)}`,
    `DTSTART:${utc(event.date)}`, `SUMMARY:${text(event.title)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${text(event.title)}`,
    'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(fold).join('\r\n')
}
