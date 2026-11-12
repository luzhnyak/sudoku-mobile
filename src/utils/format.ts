export function localDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const pair = (value: number) => String(value).padStart(2, '0');
  const time = `${pair(minutes)}:${pair(seconds % 60)}`;
  return hours ? `${hours}:${time}` : time;
}

export function formatDays(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  const teens = lastTwoDigits >= 11 && lastTwoDigits <= 14;
  let unit = 'днів';
  if (!teens && lastDigit === 1) unit = 'день';
  if (!teens && lastDigit >= 2 && lastDigit <= 4) unit = 'дні';
  return `${days} ${unit}`;
}
