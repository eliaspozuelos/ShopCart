import { Lock, LogOut, MapPin, Package, User } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, Spinner } from '../../../shared/components/ui.tsx'
import { useAuth } from '../../auth/use-auth.ts'
import { createAddress, getProfile, updateAddress, updateProfile } from '../account.api.ts'
import { PlaceFields } from '../../../shared/components/PlaceFields.tsx'
import type { Address, AddressInput } from '../account.types.ts'

const emptyAddress: AddressInput = {
  alias: '',
  line1: '',
  line2: null,
  municipality: '',
  department: 'Guatemala',
  phone: '',
}

export function AccountPage() {
  const auth = useAuth()
  const { section } = useParams()
  if (auth.user && auth.user.role !== 'Cliente') return <Navigate to="/admin/perfil" replace />
  if (section === 'perfil') return <ProfileSection />
  if (section === 'direcciones') return <AddressesSection />
  if (section === 'clave') return <PasswordSection />
  if (section) return <Navigate to="/cuenta" replace />
  return <AccountHome />
}

function AccountHome() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const firstName = (auth.user?.name ?? 'ShopCart').split(' ')[0]

  async function leave() {
    setPending(true)
    await auth.logout()
    navigate('/')
  }

  return (
    <div className="page account-page">
      <p className="breadcrumb"><Link to="/">Inicio</Link><span>/</span>Mi cuenta</p>
      <h1 className="account-hello">Hola {firstName}</h1>
      <p className="account-kicker">Mi cuenta</p>
      <div className="account-grid">
        <AccountCard
          to="/pedidos"
          title="Mis pedidos"
          text={auth.user?.role === 'Cliente' ? 'Información y seguimiento de tus compras.' : 'Consulta y avanza los pedidos de la tienda.'}
          icon={<Package />}
        />
        <AccountCard to="/cuenta/perfil" title="Información personal" text="Nombre y correo de tu cuenta." icon={<User />} />
        <AccountCard to="/cuenta/direcciones" title="Mis direcciones" text="Direcciones de entrega registradas." icon={<MapPin />} />
        <AccountCard to="/cuenta/clave" title="Cambiar contraseña" text="Actualiza la clave de acceso." icon={<Lock />} />
        <button className="account-card account-card-wide" type="button" disabled={pending} onClick={() => void leave()}>
          <span>
            <strong>Salir</strong>
            <span>Cierra la sesión de esta tienda.</span>
          </span>
          <LogOut />
        </button>
      </div>
    </div>
  )
}

function AccountCard({ to, title, text, icon }: { to: string; title: string; text: string; icon: ReactNode }) {
  return (
    <Link className="account-card" to={to}>
      <span>
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      {icon}
    </Link>
  )
}

function ProfileSection() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    void getProfile()
      .then((profile) => {
        if (!active) return
        setName(profile.name)
        setEmail(profile.email)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const profile = await updateProfile({ name, email })
      setName(profile.name)
      setEmail(profile.email)
      toast.success('Perfil actualizado.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AccountSection title="Información personal" subtitle="Estos datos identifican tu cuenta.">
      {loading ? <Spinner /> : (
        <form className="panel account-form" onSubmit={(event) => void saveProfile(event)}>
          <FormError message={error} />
          <OutlinedField label="Nombre" required value={name} onChange={setName} />
          <OutlinedField label="Correo" type="email" required value={email} onChange={setEmail} />
          <button className="btn" type="submit" disabled={pending}>Actualizar perfil</button>
        </form>
      )}
    </AccountSection>
  )
}

function AddressesSection() {
  const toast = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [address, setAddress] = useState<AddressInput>(emptyAddress)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function load() {
    const profile = await getProfile()
    setAddresses(profile.addresses)
  }

  useEffect(() => {
    let active = true
    void getProfile()
      .then((profile) => {
        if (active) setAddresses(profile.addresses)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function saveAddress(event: FormEvent) {
    event.preventDefault()
    const input: AddressInput = { ...address, line2: address.line2?.trim() ? address.line2.trim() : null }
    setPending(true)
    setError(null)
    try {
      if (editingId) await updateAddress(editingId, input)
      else await createAddress(input)
      await load()
      setAddress(emptyAddress)
      setEditingId(null)
      toast.success(editingId ? 'Dirección actualizada.' : 'Dirección agregada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AccountSection title="Mis direcciones" subtitle="Se usan al pagar un pedido.">
      {loading ? <Spinner /> : (
        <section className="panel">
          <FormError message={error} />
          <div className="address-list">
            {addresses.map((item) => (
              <article key={item.id}>
                <strong>{item.alias}</strong>
                <p>{item.line1}</p>
                {item.line2 ? <p>{item.line2}</p> : null}
                <p>{item.municipality}, {item.department}</p>
                <p>{item.phone}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditingId(item.id)
                    setAddress({
                      alias: item.alias,
                      line1: item.line1,
                      line2: item.line2,
                      municipality: item.municipality,
                      department: item.department,
                      phone: item.phone,
                    })
                  }}
                >
                  Editar
                </button>
              </article>
            ))}
            {addresses.length === 0 ? <p className="muted address-empty">Aún no tienes direcciones de entrega.</p> : null}
          </div>
          <form className="address-form" onSubmit={(event) => void saveAddress(event)}>
            <h3>{editingId ? 'Editar dirección' : 'Nueva dirección'}</h3>
            <div className="address-fields">
              <OutlinedField label="Alias" required value={address.alias} onChange={(value) => setAddress({ ...address, alias: value })} />
              <OutlinedField label="Teléfono" type="tel" required value={address.phone} onChange={(value) => setAddress({ ...address, phone: value })} />
              <div className="wide">
                <OutlinedField label="Dirección" required value={address.line1} onChange={(value) => setAddress({ ...address, line1: value })} />
              </div>
              <div className="wide">
                <OutlinedField label="Referencia" value={address.line2 ?? ''} onChange={(value) => setAddress({ ...address, line2: value })} />
              </div>
              <PlaceFields
                department={address.department}
                municipality={address.municipality}
                onChange={(value) => setAddress({ ...address, ...value })}
              />
            </div>
            <div className="inline-actions">
              <button className="btn" type="submit" disabled={pending}>{editingId ? 'Actualizar' : 'Agregar dirección'}</button>
              {editingId ? (
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setAddress(emptyAddress) }}>
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}
    </AccountSection>
  )
}

function PasswordSection() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await auth.changePassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada. Ingresa de nuevo.')
      navigate('/ingresar')
    } catch (caught) {
      setError(errorMessage(caught))
      setPending(false)
    }
  }

  return (
    <AccountSection title="Cambiar contraseña" subtitle="La nueva clave debe tener al menos 8 caracteres.">
      <form className="panel account-form" onSubmit={(event) => void savePassword(event)}>
        <FormError message={error} />
        <OutlinedField label="Contraseña actual" type="password" required value={currentPassword} onChange={setCurrentPassword} />
        <OutlinedField label="Nueva contraseña" type="password" required minLength={8} value={newPassword} onChange={setNewPassword} />
        <button className="btn" type="submit" disabled={pending}>Cambiar contraseña</button>
      </form>
    </AccountSection>
  )
}

function AccountSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page account-page">
      <p className="breadcrumb"><Link to="/cuenta">Mi cuenta</Link><span>/</span>{title}</p>
      <h1 className="account-hello">{title}</h1>
      <p className="muted">{subtitle}</p>
      {children}
    </div>
  )
}

