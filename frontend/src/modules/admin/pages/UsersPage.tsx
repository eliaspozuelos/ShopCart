import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { MapPin, Pencil, Power, PowerOff, UserPlus, Users } from 'lucide-react'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate } from '../../../shared/lib/money.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField, OutlinedSelect } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import { PlaceFields } from '../../../shared/components/PlaceFields.tsx'
import { useAuth } from '../../auth/use-auth.ts'
import {
  createStaffUser,
  getAdminUser,
  listUsers,
  setUserActive,
  updateUser,
  type AdminUser,
  type AdminUserDetail,
} from '../admin.api.ts'
import type { PageInfo, } from '../../catalog/catalog.types.ts'

type StaffRole = 'Operador' | 'Administrador'

interface UserForm {
  name: string
  email: string
  password: string
  role: StaffRole
  line1: string
  municipality: string
  department: string
  phone: string
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Operador',
  line1: '',
  municipality: '',
  department: 'Guatemala',
  phone: '',
}

const roles = ['Cliente', 'Operador', 'Administrador'] as const

export function UsersPage() {
  const auth = useAuth()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [role, setRole] = useState('')
  const [appliedRole, setAppliedRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [openUserId, setOpenUserId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  async function load(next: { page?: number; search?: string; role?: string } = {}) {
    const nextPage = next.page ?? page
    const nextSearch = next.search ?? appliedSearch
    const nextRole = next.role ?? appliedRole
    const result = await listUsers({
      page: nextPage,
      search: nextSearch || undefined,
      role: nextRole || undefined,
    })
    setUsers(result.users)
    setPagination(result.pagination)
    setPage(result.pagination.page)
    setAppliedSearch(nextSearch)
    setAppliedRole(nextRole)
  }

  useEffect(() => {
    let active = true
    void listUsers()
      .then((result) => {
        if (!active) return
        setUsers(result.users)
        setPagination(result.pagination)
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

  function patchForm(patch: Partial<UserForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function beginEdit(user: AdminUser) {
    setEditingId(user.id)
    setEditingRole(user.role)
    setError(null)
    setForm({ ...emptyForm, name: user.name, email: user.email })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingRole(null)
    setForm(emptyForm)
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name) {
      setError('Indica el nombre.')
      return
    }
    if (!email.includes('@')) {
      setError('Indica un correo válido.')
      return
    }
    setPending(true)
    setError(null)
    try {
      if (editingId) {
        const current = users.find((user) => user.id === editingId)
        if (current && current.name === name && current.email.toLowerCase() === email) {
          cancelEdit()
          return
        }
        await updateUser(editingId, { name, email })
        setEditingId(null)
        setEditingRole(null)
        setForm(emptyForm)
        await load()
        toast.success('Usuario actualizado.')
      } else {
        if (form.password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres.')
          return
        }
        if (!form.phone.trim() || !form.line1.trim() || !form.municipality.trim()) {
          setError('Indica el teléfono, la dirección y el municipio.')
          return
        }
        await createStaffUser({ ...form, name, email })
        setForm(emptyForm)
        setSearch(email)
        setRole('')
        await load({ page: 1, search: email, role: '' })
        toast.success('Usuario creado.')
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function findUsers(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setEditingId(null)
    setOpenUserId(null)
    try {
      await load({ page: 1, search, role })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function changePage(nextPage: number) {
    setError(null)
    setEditingId(null)
    setOpenUserId(null)
    try {
      await load({ page: nextPage })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function toggle(user: AdminUser) {
    try {
      await setUserActive(user.id, !user.active)
      await load()
      toast.success(user.active ? 'Usuario desactivado.' : 'Usuario activado.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  async function showContact(user: AdminUser) {
    if (openUserId === user.id) {
      setOpenUserId(null)
      setDetail(null)
      setDetailError(null)
      return
    }
    setOpenUserId(user.id)
    setDetail(null)
    setDetailError(null)
    try {
      setDetail(await getAdminUser(user.id))
    } catch (caught) {
      setDetailError(errorMessage(caught))
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Usuarios" subtitle="Clientes, operadores y administradores. Cada pedido conserva a su usuario." />
      <FormError message={error} />
      <form ref={formRef} className="panel user-form" onSubmit={(event) => void save(event)}>
        <div className="section-head">
          <h2>{editingId ? <Pencil /> : <UserPlus />} {editingId ? `Editar ${form.name || 'usuario'}` : 'Nuevo operador o administrador'}</h2>
        </div>
        {editingRole ? <p className="coupon-summary"><strong>{editingRole}</strong><span>El rol no se cambia desde aquí.</span></p> : null}
        <OutlinedField label="Nombre" required maxLength={100} value={form.name} onChange={(value) => patchForm({ name: value })} />
        <OutlinedField label="Correo" required type="email" maxLength={256} value={form.email} onChange={(value) => patchForm({ email: value })} />
        {editingId ? null : (
          <>
            <OutlinedField label="Contraseña" required minLength={8} type="password" value={form.password} onChange={(value) => patchForm({ password: value })} />
            <OutlinedField label="Teléfono" required type="tel" maxLength={20} value={form.phone} onChange={(value) => patchForm({ phone: value })} />
            <OutlinedField label="Dirección" required maxLength={200} value={form.line1} onChange={(value) => patchForm({ line1: value })} />
            <PlaceFields
              department={form.department}
              municipality={form.municipality}
              onChange={(value) => patchForm(value)}
            />
            <OutlinedSelect label="Rol" required value={form.role} onChange={(value) => patchForm({ role: value as StaffRole })}>
              <option value="Operador">Operador</option>
              <option value="Administrador">Administrador</option>
            </OutlinedSelect>
          </>
        )}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={pending}>{editingId ? 'Guardar usuario' : 'Crear usuario'}</button>
          {editingId ? <button className="btn btn-ghost" type="button" disabled={pending} onClick={cancelEdit}>Cancelar</button> : null}
        </div>
        <p className="catalog-note">
          El registro de la tienda crea clientes. Aquí se crea el personal, con teléfono y dirección de contacto.
          Después solo se pueden cambiar el nombre y el correo. Para quitar el acceso se desactiva la cuenta: no se borra.
        </p>
      </form>
      <section className="panel">
        <div className="section-head">
          <h2><Users /> Usuarios</h2>
          {pagination ? <p className="muted">{userCount(pagination.total)}</p> : null}
        </div>
        <form className="inline-actions catalog-toolbar" onSubmit={(event) => void findUsers(event)}>
          <OutlinedField label="Buscar por nombre o correo" maxLength={100} value={search} onChange={setSearch} />
          <OutlinedSelect label="Rol" value={role} onChange={setRole}>
            <option value="">Todos</option>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </OutlinedSelect>
          <button className="btn btn-ghost" type="submit">Buscar</button>
        </form>
        {users.length === 0 ? <p className="muted">{appliedSearch || appliedRole ? 'No hay usuarios con ese filtro.' : 'Todavía no hay usuarios.'}</p> : (
          <div className="table-scroll">
            <table className="data-table user-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Desde</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const mine = user.id === auth.user?.id
                  return (
                    <Fragment key={user.id}>
                      <tr className={editingId === user.id || openUserId === user.id ? 'is-open' : ''}>
                        <td>{user.name}{mine ? <span className="order-status">Tú</span> : null}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td><span className={user.active ? 'order-status is-done' : 'order-status is-bad'}>{user.active ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="catalog-action" aria-label={`Ver contacto de ${user.name}`} onClick={() => void showContact(user)}>
                              <MapPin />
                            </button>
                            <button type="button" className="catalog-action" aria-label={`Editar ${user.name}`} onClick={() => beginEdit(user)}>
                              <Pencil />
                            </button>
                            {mine ? null : (
                              <button
                                type="button"
                                className="catalog-action"
                                aria-label={user.active ? `Desactivar ${user.name}` : `Activar ${user.name}`}
                                disabled={pending}
                                onClick={() => void toggle(user)}
                              >
                                {user.active ? <Power /> : <PowerOff />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {openUserId === user.id ? (
                        <tr>
                          <td colSpan={6}>
                            {detailError ? <FormError message={detailError} /> : detail?.id === user.id ? <AddressList detail={detail} /> : <Spinner />}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={(nextPage) => void changePage(nextPage)} /> : null}
      </section>
    </div>
  )
}

function AddressList({ detail }: { detail: AdminUserDetail }) {
  if (detail.addresses.length === 0) return <p className="muted">Este usuario no tiene direcciones activas.</p>
  return (
    <ul className="user-addresses">
      {detail.addresses.map((address) => (
        <li key={address.id}>
          <strong>{address.alias}</strong>
          <span>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</span>
          <span>{address.municipality}, {address.department}</span>
          <span>{address.phone}</span>
        </li>
      ))}
    </ul>
  )
}

function userCount(total: number): string {
  return total === 1 ? '1 usuario' : `${total} usuarios`
}
