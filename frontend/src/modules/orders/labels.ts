const statusLabels: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'Preparando',
  DESPACHADO: 'Despachado',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  DEVUELTO: 'Devuelto',
}

const paymentLabels: Record<string, string> = {
  TARJETA: 'Tarjeta (modo de prueba)',
  CONTRA_ENTREGA: 'Contra entrega',
}

export const orderFlow = ['CONFIRMADO', 'PREPARANDO', 'DESPACHADO', 'EN_RUTA', 'ENTREGADO'] as const

export const nextStatuses: Record<string, string[]> = {
  CONFIRMADO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['DESPACHADO'],
  DESPACHADO: ['EN_RUTA'],
  EN_RUTA: ['ENTREGADO'],
}

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}

export function paymentLabel(method: string | undefined): string {
  if (!method) return 'No indicado'
  return paymentLabels[method] ?? method
}
