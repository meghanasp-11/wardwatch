// Ward-local HH:MM label for chart axes. Set WARD_TZ (IANA name), default Asia/Kolkata.
export function formatTime(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: process.env.WARD_TZ || 'Asia/Kolkata',
  }).format(new Date(iso));
}
