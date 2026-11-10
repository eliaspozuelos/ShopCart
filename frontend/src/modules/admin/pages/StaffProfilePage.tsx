import { MapPin, Phone } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Spinner } from '../../../shared/components/ui.tsx'
import { useToast } from '../../../shared/components/use-toast.ts'
import { getProfile, updateAddress } from '../../account/account.api.ts'
import { PlaceFields } from '../../../shared/components/PlaceFields.tsx'
import type { Address, AddressInput } from '../../account/account.types.ts'
import { useAuth } from '../../auth/use-auth.ts'

export function StaffProfilePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(auth.user?.name ?? '')
  const [email, setEmail] = useState(auth.user?.email ?? '')
  const [contact, setContact] = useState<Address | null>(null)
  const [line1, setLine1] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [department, setDepartment] = useState('Guatemala')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressPending, setAddressPending] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    void getProfile()
      .then((profile) => {
        if (!active) return
        setName(profile.name)
        setEmail(profile.email)
        const current = profile.addresses[0] ?? null
        setContact(current)
        if (current) {
          setLine1(current.line1)
          setMunicipality(current.municipality)
          setDepartment(current.department)
          setPhone(current.phone)
        }
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

  function showContact(current: Address) {
    setLine1(current.line1)
    setMunicipality(current.municipality)
    setDepartment(current.department)
    setPhone(current.phone)
  }

  function cancelEdit() {
    if (contact) showContact(contact)
    setAddressError(null)
    setEditing(false)
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault()
    if (!contact) return
    const input: AddressInput = {
      alias: contact.alias,
      line1,
      line2: contact.line2,
      municipality,
      department,
      phone,
    }
    setAddressPending(true)
    setAddressError(null)
    try {
      const saved = await updateAddress(contact.id, input)
      setContact(saved)
      showContact(saved)
      setEditing(false)
      toast.success('Dirección actualizada.')
    } catch (caught) {
      setAddressError(errorMessage(caught))
    } finally {
      setAddressPending(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setPasswordError(null)
    try {
      await auth.changePassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada. Ingresa de nuevo.')
      navigate('/empresa')
    } catch (caught) {
      setPasswordError(errorMessage(caught))
      setPending(false)
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Mi perfil" subtitle="Datos de tu cuenta de personal." />
      <FormError message={error} />
      <section className="panel profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initials(name)}</span>
        <div>
          <p className="profile-role">{auth.user?.role}</p>
          <h2>{name}</h2>
          <p>{email}</p>
        </div>
      </section>
      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="profile-card-head">
            <h2>Dirección y teléfono</h2>
            {contact && !editing ? (
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(true)}>Actualizar</button>
            ) : null}
          </div>
          {contact && !editing ? (
            <dl className="profile-contact">
              <div>
                <dt><MapPin /> Dirección</dt>
                <dd>
                  {contact.line1.trim()}
                  <span>{contact.municipality.trim()}, {contact.department.trim()}</span>
                </dd>
              </div>
              <div>
                <dt><Phone /> Teléfono</dt>
                <dd>{contact.phone.trim()}</dd>
              </div>
            </dl>
          ) : null}
          {!contact ? <p className="muted">No hay datos.</p> : null}
          {contact && editing ? (
            <form className="stack" onSubmit={(event) => void saveAddress(event)}>
              <FormError message={addressError} />
              <OutlinedField label="Dirección" required value={line1} onChange={setLine1} />
              <PlaceFields
                department={department}
                municipality={municipality}
                onChange={(value) => {
                  setDepartment(value.department)
                  setMunicipality(value.municipality)
                }}
              />
              <OutlinedField label="Teléfono" required type="tel" value={phone} onChange={setPhone} />
              <div className="inline-actions">
                <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Cancelar</button>
                <button className="btn" type="submit" disabled={addressPending}>Actualizar información</button>
              </div>
            </form>
          ) : null}
        </section>
        <form className="panel profile-card stack" onSubmit={(event) => void savePassword(event)}>
          <div className="profile-card-head">
            <h2>Cambiar contraseña</h2>
          </div>
          <p className="muted">Al guardarla tendrás que ingresar de nuevo.</p>
          <FormError message={passwordError} />
          <OutlinedField label="Contraseña actual" type="password" required value={currentPassword} onChange={setCurrentPassword} />
          <OutlinedField label="Nueva contraseña" type="password" required minLength={8} value={newPassword} onChange={setNewPassword} />
          <button className="btn" type="submit" disabled={pending}>Cambiar contraseña</button>
        </form>
      </div>
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const chosen = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return chosen.map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '?'
}
