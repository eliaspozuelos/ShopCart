export function money(value: number | string | null | undefined, symbol = 'Q'): string {
  const amount = Number(value ?? 0)
  const safe = Number.isFinite(amount) ? amount : 0
  return `${symbol} ${safe.toFixed(2)}`
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
