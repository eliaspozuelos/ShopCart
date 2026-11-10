import { useState, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { errorMessage } from '../../../shared/api/client.ts'
import { ProductImage } from '../../catalog/components/ProductCard.tsx'
import { uploadCatalogPhoto } from '../admin.api.ts'

const maxPhotoBytes = 2 * 1024 * 1024

export function PhotoField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una foto JPG, PNG, WEBP o GIF.')
      return
    }
    if (file.size > maxPhotoBytes) {
      setError('La foto no puede pesar más de 2 MB.')
      return
    }
    setPending(true)
    setError(null)
    try {
      onChange(await uploadCatalogPhoto(file))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="photo-field">
      <span className="photo-field-label">{label}</span>
      <div className="photo-field-row">
        <div className="variant-photo">
          <ProductImage src={value || null} alt="" />
        </div>
        <label className={`btn btn-ghost${pending ? ' is-disabled' : ''}`}>
          <ImagePlus />
          {pending ? 'Subiendo foto...' : value ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={pending}
            onChange={(event) => void choose(event)}
          />
        </label>
        {value ? (
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => onChange('')}>
            Quitar foto
          </button>
        ) : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
