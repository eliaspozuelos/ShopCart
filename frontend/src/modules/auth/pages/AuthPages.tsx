import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { ApiError, errorMessage, type UserRole } from '../../../shared/api/client.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, Spinner } from '../../../shared/components/ui.tsx'
import { useToast } from '../../../shared/components/use-toast.ts'
import { useAuth } from '../use-auth.ts'

const STAFF_DENIED_MESSAGE = 'Tu cuenta no tiene acceso de personal. Te llevamos a la tienda.'

let staffDenialAt = 0

function notifyStaffDenied(toast: { error: (message: string) => void }) {
  const now = Date.now()
  if (now - staffDenialAt < 1500) return
  staffDenialAt = now
  toast.error(STAFF_DENIED_MESSAGE)
}

export function LoginPage() {
  return <LoginForm door="tienda" />
}

export function StaffLoginPage() {
  return <LoginForm door="empresa" />
}

function LoginForm({ door }: { door: 'tienda' | 'empresa' }) {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = readFrom(location.state)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [waitUntil, setWaitUntil] = useState<number | null>(null)
  const company = door === 'empresa'
  const denied = company && auth.user?.role === 'Cliente'

  useEffect(() => {
    if (!denied) return
    notifyStaffDenied(toast)
    navigate('/', { replace: true })
  }, [denied, navigate, toast])

  if (auth.status === 'loading' || denied) return <div className="page-center"><Spinner /></div>
  if (auth.user) return <Navigate to={landing(auth.user.role, from, door)} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await auth.login(email, password)
    } catch (caught) {
      noteAuthFailure(caught, setError, setWaitUntil)
      setPending(false)
    }
  }

  const form = (
    <form className="auth-card" onSubmit={(event) => void submit(event)}>
      <h1>{company ? 'ACCESO DE PERSONAL' : 'INGRESAR'}</h1>
      <p className="muted">
        {company
          ? 'Operadores y administradores entran al panel de la empresa.'
          : 'Usa tu cuenta de ShopCart para pagar y consultar pedidos.'}
      </p>
      <FormError message={waitUntil ? null : error} />
      {waitUntil ? <AuthWaitClock until={waitUntil} onDone={() => setWaitUntil(null)} /> : null}
      <OutlinedField label="Correo" type="email" autoComplete="email" required value={email} onChange={setEmail} />
      <OutlinedField label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={setPassword} />
      <button className="btn" type="submit" disabled={pending || waitUntil !== null}>{pending ? 'Ingresando...' : 'Ingresar'}</button>
      {company ? (
        <p className="muted">¿Eres cliente? <Link to="/ingresar">Ingresar a la tienda</Link></p>
      ) : (
        <p className="muted">¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
      )}
    </form>
  )

  if (company) return form
  return <div className="page narrow">{form}</div>
}

export function RegisterPage() {
  const auth = useAuth()
  const location = useLocation()
  const from = readFrom(location.state)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [waitUntil, setWaitUntil] = useState<number | null>(null)

  if (auth.status === 'loading') return <div className="page narrow"><div className="page-center"><Spinner /></div></div>
  if (auth.user) return <Navigate to={landing(auth.user.role, from, 'tienda')} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setPending(true)
    try {
      await auth.register({ name, email, password })
    } catch (caught) {
      noteAuthFailure(caught, setError, setWaitUntil)
      setPending(false)
    }
  }

  return (
    <div className="page narrow">
      <form className="auth-card signup" onSubmit={(event) => void submit(event)}>
        <h1>CREA TU CUENTA</h1>
        <FormError message={waitUntil ? null : error} />
        {waitUntil ? <AuthWaitClock until={waitUntil} onDone={() => setWaitUntil(null)} /> : null}
        <OutlinedField label="Nombre" autoComplete="name" required value={name} onChange={setName} />
        <OutlinedField label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={setEmail} />
        <OutlinedField label="Contraseña" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={setPassword} />
        <OutlinedField label="Confirmar contraseña" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={setConfirmation} />
        <button className="btn" type="submit" disabled={pending || waitUntil !== null}>{pending ? 'Creando...' : 'Crear cuenta'}</button>
        <p className="muted signup-login">¿Ya tienes cuenta? <Link to="/ingresar">Ingresar</Link></p>
      </form>
    </div>
  )
}

function noteAuthFailure(
  caught: unknown,
  setError: (message: string | null) => void,
  setWaitUntil: (until: number | null) => void,
) {
  const retryAfterSeconds = caught instanceof ApiError && caught.code === 'AUTH_RATE_LIMIT'
    ? caught.retryAfterSeconds ?? 60
    : null
  if (retryAfterSeconds == null) {
    setWaitUntil(null)
    setError(errorMessage(caught))
    return
  }
  setError(null)
  setWaitUntil(Date.now() + retryAfterSeconds * 1000)
}

function AuthWaitClock({ until, onDone }: { until: number; onDone: () => void }) {
  const [left, setLeft] = useState(() => secondsLeft(until))
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = secondsLeft(until)
      setLeft(next)
      if (next > 0) return
      window.clearInterval(timer)
      onDoneRef.current()
    }, 250)
    return () => window.clearInterval(timer)
  }, [until])

  const clock = formatClock(left)
  return (
    <p className="auth-wait" role="timer" aria-live="polite">
      <span className="auth-wait-clock"><Clock size={16} aria-hidden="true" />{clock}</span>
      Podrás intentar de nuevo cuando el reloj llegue a cero.
    </p>
  )
}

function secondsLeft(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function landing(role: UserRole, from: string, door: 'tienda' | 'empresa'): string {
  const staffHome = role === 'Administrador' ? '/admin' : role === 'Operador' ? '/admin/inventario' : null
  if (staffHome) return from.startsWith('/admin') ? from : staffHome
  if (door === 'empresa' || from.startsWith('/admin')) return '/'
  return from
}

function readFrom(state: unknown): string {
  if (typeof state === 'object' && state && 'from' in state && typeof state.from === 'string') {
    return state.from
  }
  return '/'
}
