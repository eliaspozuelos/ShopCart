import type { ReactNode } from 'react'
import { ClipboardCheck, House, Package, PackageCheck, Truck } from 'lucide-react'
import { orderFlow, statusLabel } from '../labels.ts'

const icons: Record<(typeof orderFlow)[number], ReactNode> = {
  CONFIRMADO: <ClipboardCheck />,
  PREPARANDO: <Package />,
  DESPACHADO: <PackageCheck />,
  EN_RUTA: <Truck />,
  ENTREGADO: <House />,
}

export function OrderTracker({ status, compact = false }: { status: string; compact?: boolean }) {
  const flowIndex = orderFlow.findIndex((step) => step === status)
  if (flowIndex < 0) return null

  return (
    <ol className={compact ? 'tracker tracker-compact' : 'tracker'} aria-label="Estado del pedido">
      {orderFlow.map((step, index) => {
        const done = index <= flowIndex
        const current = index === flowIndex
        return (
          <li key={step} className={done ? (current ? 'is-done is-current' : 'is-done') : undefined} aria-current={current ? 'step' : undefined}>
            <span className="tracker-icon">{icons[step]}</span>
            <span className="tracker-label">{statusLabel(step)}</span>
            {index < orderFlow.length - 1 ? <span className="tracker-line" /> : null}
          </li>
        )
      })}
    </ol>
  )
}
