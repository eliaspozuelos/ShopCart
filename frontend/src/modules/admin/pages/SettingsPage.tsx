import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '../../../shared/api/client.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Spinner } from '../../../shared/components/ui.tsx'
import { createSetting, listSettings, updateSetting, type Setting } from '../admin.api.ts'

export function SettingsPage() {
  const toast = useToast()
  const [settings, setSettings] = useState<Setting[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ key: '', value: '', description: '' })

  async function load() {
    const next = await listSettings()
    setSettings(next)
    const values: Record<string, string> = {}
    next.forEach((setting) => {
      values[setting.key] = setting.value
    })
    setDrafts(values)
  }

  useEffect(() => {
    let active = true
    void listSettings()
      .then((next) => {
        if (!active) return
        setSettings(next)
        const values: Record<string, string> = {}
        next.forEach((setting) => {
          values[setting.key] = setting.value
        })
        setDrafts(values)
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

  async function save(setting: Setting) {
    setError(null)
    try {
      await updateSetting(setting.key, drafts[setting.key] ?? setting.value, setting.description)
      await load()
      toast.success('Configuración actualizada.')
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createSetting({ key: form.key, value: form.value, description: form.description || null })
      setForm({ key: '', value: '', description: '' })
      await load()
      toast.success('Parámetro creado.')
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Configuración" subtitle="Parámetros globales de la tienda, incluida la moneda." />
      <FormError message={error} />
      <section className="panel">
        {settings.map((setting) => (
          <form key={setting.key} className="setting-row" onSubmit={(event) => { event.preventDefault(); void save(setting) }}>
            <div>
              <strong>{setting.key}</strong>
              <p className="muted">{setting.description}</p>
            </div>
            <OutlinedField label="Valor" required value={drafts[setting.key] ?? ''} onChange={(value) => setDrafts({ ...drafts, [setting.key]: value })} />
            <button className="btn btn-ghost" type="submit">Guardar</button>
          </form>
        ))}
      </section>
      <form className="panel form-grid" onSubmit={(event) => void create(event)}>
        <h2 className="full">Nuevo parámetro</h2>
        <OutlinedField label="Clave" required value={form.key} onChange={(value) => setForm({ ...form, key: value })} />
        <OutlinedField label="Valor" required value={form.value} onChange={(value) => setForm({ ...form, value: value })} />
        <OutlinedField label="Descripción" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
        <button className="btn" type="submit">Crear</button>
      </form>
    </div>
  )
}
