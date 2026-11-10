import { useEffect, useState, type FormEvent } from 'react'
import { Layers, Pencil, Plus, Power, PowerOff, X } from 'lucide-react'
import { errorMessage } from '../../../shared/api/client.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField, OutlinedSelect } from '../../../shared/components/outlined-field.tsx'
import { FormError, Spinner } from '../../../shared/components/ui.tsx'
import { ProductImage } from '../../catalog/components/ProductCard.tsx'
import type { ProductDetail, ProductVariant } from '../../catalog/catalog.types.ts'
import { PhotoField } from './PhotoField.tsx'
import { getAdminProduct, saveVariant, setVariantActive, type CatalogAttribute } from '../admin.api.ts'

interface AttributeRow {
  key: string
  attributeId: string
  value: string
}

interface VariantDraft {
  variantId: number | null
  sku: string
  price: string
  stock: string
  imageUrl: string
  rows: AttributeRow[]
}

export function ProductVariants({
  productId,
  productName,
  defaultPrice,
  attributes,
  onSaved,
}: {
  productId: number
  productName: string
  defaultPrice: string
  attributes: CatalogAttribute[]
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [draft, setDraft] = useState<VariantDraft>(() => blankDraft(attributes, defaultPrice))

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getAdminProduct(productId)
      .then((product) => {
        if (active) setDetail(product)
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
  }, [productId])

  useEffect(() => {
    const usedId = detail?.variants.find((variant) => variant.attributes.length > 0)?.attributes[0]?.id
    const fallbackId = usedId ?? attributes[0]?.id
    if (!fallbackId) return
    setDraft((current) => {
      if (current.variantId || current.sku.trim() || current.imageUrl.trim() || current.rows.some((row) => row.value.trim())) return current
      return {
        ...current,
        rows: current.rows.map((row, index) => (
          index === 0 ? { ...row, attributeId: String(fallbackId) } : row
        )),
      }
    })
  }, [attributes, detail])

  function editVariant(variant: ProductVariant) {
    setError(null)
    setDraft({
      variantId: variant.id,
      sku: variant.sku,
      price: moneyInput(variant.price),
      stock: String(variant.stock),
      imageUrl: variant.imageUrl ?? '',
      rows: variant.attributes.length > 0
        ? variant.attributes.map((attribute) => ({
          key: newRowKey(),
          attributeId: String(attribute.id),
          value: attribute.value,
        }))
        : [blankRow(attributes)],
    })
  }

  async function toggleVariant(variant: ProductVariant) {
    setPending(true)
    setError(null)
    try {
      await setVariantActive(productId, variant.id, !variant.active)
      const product = await getAdminProduct(productId)
      setDetail(product)
      await onSaved()
      toast.success(variant.active ? 'Variante desactivada.' : 'Variante activada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDraft(draft, attributes)
    if (typeof parsed === 'string') {
      setError(parsed)
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveVariant(productId, parsed)
      const product = await getAdminProduct(productId)
      setDetail(product)
      setDraft(blankDraft(attributes, defaultPrice))
      await onSaved()
      toast.success(draft.variantId ? 'Variante actualizada.' : 'Variante creada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="variant-panel">
      <div className="section-head">
        <h3><Layers /> Variantes de {productName}</h3>
      </div>
      <p className="catalog-note">
        Cada valor, como Plata, Oro o Bronce, es una variante con su propio SKU, precio, existencia y foto.
      </p>
      <FormError message={error} />
      {loading ? <Spinner /> : null}
      {detail ? (
        <div className="variant-list">
          {detail.variants.map((variant) => (
            <article key={variant.id} className={variant.active ? 'variant-card' : 'variant-card is-off'}>
              <div className="variant-photo">
                <ProductImage src={variant.imageUrl} alt="" />
              </div>
              <div className="variant-copy">
                <strong>{variant.sku}</strong>
                <span className="muted">{variant.priceDisplay} · {variant.stock} en existencia</span>
                <span className={variant.active ? 'order-status is-done' : 'order-status is-bad'}>{variant.active ? 'Activa' : 'Inactiva'}</span>
              </div>
              <div className="attribute-list">
                {variant.attributes.length === 0 ? <span className="order-status is-bad">Sin valor</span> : variant.attributes.map((attribute) => (
                  <span key={attribute.id} className="attribute-chip">{attribute.name}: {attribute.value}</span>
                ))}
              </div>
              <div className="variant-card-actions">
                <button type="button" className="catalog-action" aria-label={`Editar ${variant.sku}`} onClick={() => editVariant(variant)}>
                  <Pencil />
                </button>
                <button
                  type="button"
                  className="catalog-action"
                  aria-label={variant.active ? `Desactivar ${variant.sku}` : `Activar ${variant.sku}`}
                  disabled={pending}
                  onClick={() => void toggleVariant(variant)}
                >
                  {variant.active ? <Power /> : <PowerOff />}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {attributes.length === 0 ? (
        <p className="catalog-note">Crea primero un atributo, por ejemplo Material. Después escribe aquí Plata, Oro o Bronce.</p>
      ) : (
        <form className="variant-form" onSubmit={(event) => void submit(event)}>
          <h3 className="full">{draft.variantId ? 'Editar variante' : 'Nueva variante'}</h3>
          <OutlinedField label="SKU" required value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} />
          <OutlinedField label="Precio" required type="number" min="0.01" step="0.01" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} />
          <OutlinedField label="Existencia" required type="number" min="0" step="1" value={draft.stock} onChange={(value) => setDraft({ ...draft, stock: value })} />
          <div className="full">
            <PhotoField label="Foto de la variante" value={draft.imageUrl} onChange={(value) => setDraft({ ...draft, imageUrl: value })} />
          </div>
          {draft.rows.map((row, index) => (
            <div key={row.key} className="variant-pair">
              <OutlinedSelect
                label="Atributo"
                required
                value={row.attributeId}
                onChange={(value) => setDraft({
                  ...draft,
                  rows: draft.rows.map((item) => item.key === row.key ? { ...item, attributeId: value } : item),
                })}
              >
                {attributes.map((attribute) => (
                  <option key={attribute.id} value={attribute.id}>{attribute.name}</option>
                ))}
              </OutlinedSelect>
              <OutlinedField
                label="Valor"
                required
                maxLength={100}
                value={row.value}
                onChange={(value) => setDraft({
                  ...draft,
                  rows: draft.rows.map((item) => item.key === row.key ? { ...item, value } : item),
                })}
              />
              {draft.rows.length > 1 ? (
                <button
                  type="button"
                  className="catalog-action"
                  aria-label={`Quitar valor ${index + 1}`}
                  onClick={() => setDraft({ ...draft, rows: draft.rows.filter((item) => item.key !== row.key) })}
                >
                  <X />
                </button>
              ) : <span />}
            </div>
          ))}
          {draft.rows.length < attributes.length ? (
            <button
              className="btn btn-ghost full"
              type="button"
              onClick={() => setDraft({ ...draft, rows: [...draft.rows, blankRow(attributes, draft.rows)] })}
            >
              <Plus /> Otro atributo en esta variante
            </button>
          ) : null}
          <div className="variant-actions full">
            {draft.variantId ? (
              <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => setDraft(blankDraft(attributes, defaultPrice))}>
                Cancelar
              </button>
            ) : null}
            <button className="btn" type="submit" disabled={pending}>
              {draft.variantId ? 'Guardar variante' : 'Agregar variante'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function blankDraft(attributes: CatalogAttribute[], price: string): VariantDraft {
  return {
    variantId: null,
    sku: '',
    price,
    stock: '0',
    imageUrl: '',
    rows: [blankRow(attributes)],
  }
}

function blankRow(attributes: CatalogAttribute[], used: AttributeRow[] = []): AttributeRow {
  const taken = new Set(used.map((row) => row.attributeId))
  const next = attributes.find((attribute) => !taken.has(String(attribute.id))) ?? attributes[0]
  return { key: newRowKey(), attributeId: String(next?.id ?? ''), value: '' }
}

function newRowKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isStoredPhoto(value: string): boolean {
  if (/^\/api\/v1\/catalog\/media\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function moneyInput(value: number): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''
  return amount.toFixed(2)
}

function parseDraft(
  draft: VariantDraft,
  attributes: CatalogAttribute[],
): { variantId?: number; sku: string; price: number; stock: number; imageUrl: string | null; attributes: Array<{ attributeId: number; value: string }> } | string {
  const sku = draft.sku.trim()
  if (!sku) return 'Escribe el SKU de la variante.'
  const price = Math.round(Number(draft.price) * 100) / 100
  if (!Number.isFinite(price) || price <= 0) return 'El precio debe ser mayor que cero.'
  const stock = Number(draft.stock)
  if (!Number.isInteger(stock) || stock < 0) return 'La existencia debe ser un número entero.'
  const imageUrl = draft.imageUrl.trim()
  if (imageUrl && !isStoredPhoto(imageUrl)) return 'Vuelve a subir la foto de la variante.'
  if (attributes.length === 0) return 'Crea un atributo antes de guardar la variante.'
  const chosen = draft.rows.map((row) => ({
    attributeId: Number(row.attributeId),
    value: row.value.trim(),
  }))
  if (chosen.some((row) => !Number.isInteger(row.attributeId) || row.attributeId <= 0 || !row.value)) {
    return 'Elige el atributo y escribe el valor, por ejemplo Plata.'
  }
  if (new Set(chosen.map((row) => row.attributeId)).size !== chosen.length) {
    return 'Una variante no puede repetir el mismo atributo.'
  }
  return {
    ...(draft.variantId ? { variantId: draft.variantId } : {}),
    sku,
    price,
    stock,
    imageUrl: imageUrl || null,
    attributes: chosen,
  }
}
