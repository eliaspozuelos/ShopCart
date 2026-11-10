import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { Check, Folder, FolderPlus, Layers, Package, PackagePlus, Pencil, Power, PowerOff, Tags, Trash, X } from 'lucide-react'
import { ApiError, errorMessage } from '../../../shared/api/client.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField, OutlinedSelect } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import { formatProductPrice } from '../../catalog/price.ts'
import type { Category, PageInfo, ProductSummary } from '../../catalog/catalog.types.ts'
import { PhotoField } from '../components/PhotoField.tsx'
import { ProductVariants } from '../components/ProductVariants.tsx'
import {
  createAttribute,
  createCategory,
  createProduct,
  deleteAttribute,
  listAdminCategories,
  listAdminProducts,
  listAttributes,
  updateAttribute,
  updateCategory,
  updateProduct,
  type CatalogAttribute,
} from '../admin.api.ts'

const PRODUCT_PAGE_SIZE = 20

export function CatalogAdminPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [attributes, setAttributes] = useState<CatalogAttribute[]>([])
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PageInfo | null>(null)
  const [openProductId, setOpenProductId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attributeError, setAttributeError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null)
  const [editingAttribute, setEditingAttribute] = useState<{ id: number; name: string } | null>(null)
  const [editingProduct, setEditingProduct] = useState<{ id: number; name: string; categoryId: string } | null>(null)
  const [attributeName, setAttributeName] = useState('')
  const [product, setProduct] = useState({ categoryId: '', name: '', description: '', imageUrl: '' })
  const [pending, setPending] = useState(false)

  async function load(next: { page?: number; search?: string } = {}) {
    const nextPage = next.page ?? page
    const nextSearch = (next.search ?? appliedSearch).trim()
    const [nextCategories, nextAttributes, nextProducts] = await Promise.all([
      listAdminCategories(),
      listAttributes(),
      listAdminProducts({
        page: nextPage,
        pageSize: PRODUCT_PAGE_SIZE,
        ...(nextSearch ? { search: nextSearch } : {}),
      }),
    ])
    setCategories(nextCategories)
    setAttributes(nextAttributes)
    setProducts(nextProducts.products)
    setPagination(nextProducts.pagination)
    setPage(nextProducts.pagination.page)
    setAppliedSearch(nextSearch)
    setProduct((current) => ({ ...current, categoryId: current.categoryId || String(nextCategories[0]?.id ?? '') }))
  }

  useEffect(() => {
    let active = true
    void load()
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

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createCategory(categoryName)
      setCategoryName('')
      await load()
      toast.success('Categoría creada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function saveAttribute(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createAttribute(attributeName)
      setAttributeName('')
      await load()
      toast.success('Atributo creado.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const name = product.name.trim()
      const imageUrl = product.imageUrl.trim()
      const productId = await createProduct({
        categoryId: Number(product.categoryId),
        name: product.name,
        description: product.description || null,
        imageUrl: imageUrl || null,
      })
      setProduct((current) => ({ ...current, name: '', description: '', imageUrl: '' }))
      setSearch(name)
      await load({ page: 1, search: name })
      setOpenProductId(productId)
      toast.success(imageUrl
        ? 'Producto creado. Esa foto se usa cuando la variante no tiene la suya.'
        : 'Producto creado. La foto se carga en cada variante.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function renameCategory(event: FormEvent, category: Category) {
    event.preventDefault()
    const name = editingCategory?.name.trim() ?? ''
    if (!name || editingCategory?.id !== category.id) return
    if (name === category.name) {
      setEditingCategory(null)
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateCategory(category.id, { name })
      setEditingCategory(null)
      await load()
      toast.success('Categoría actualizada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function toggleCategory(category: Category) {
    try {
      await updateCategory(category.id, { active: !category.active })
      await load()
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  async function renameAttribute(event: FormEvent, attribute: CatalogAttribute) {
    event.preventDefault()
    const name = editingAttribute?.name.trim() ?? ''
    if (!name || editingAttribute?.id !== attribute.id) return
    if (name === attribute.name) {
      setEditingAttribute(null)
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateAttribute(attribute.id, name)
      setEditingAttribute(null)
      await load()
      toast.success('Atributo actualizado.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function removeAttribute(attribute: CatalogAttribute) {
    setError(null)
    if (attribute.inUse) {
      const message = `No se puede borrar ${attribute.name} porque tiene productos asociados.`
      setAttributeError(message)
      window.alert(message)
      return
    }
    setPending(true)
    setAttributeError(null)
    try {
      await deleteAttribute(attribute.id)
      if (editingAttribute?.id === attribute.id) setEditingAttribute(null)
      await load()
      toast.success('Atributo eliminado.')
    } catch (caught) {
      const blocked = caught instanceof ApiError && caught.code === 'ATTRIBUTE_IN_USE'
      const message = blocked
        ? `No se puede borrar ${attribute.name} porque tiene productos asociados.`
        : errorMessage(caught)
      setAttributeError(message)
      if (blocked) window.alert(message)
    } finally {
      setPending(false)
    }
  }

  async function renameProduct(event: FormEvent, item: ProductSummary) {
    event.preventDefault()
    const name = editingProduct?.name.trim() ?? ''
    const categoryId = Number(editingProduct?.categoryId)
    if (!name || !Number.isInteger(categoryId) || editingProduct?.id !== item.id) return
    if (name === item.name && categoryId === item.category.id) {
      setEditingProduct(null)
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateProduct(item.id, {
        ...(name === item.name ? {} : { name }),
        ...(categoryId === item.category.id ? {} : { categoryId }),
      })
      setEditingProduct(null)
      await load()
      toast.success('Producto actualizado.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function findProducts(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setOpenProductId(null)
    setEditingProduct(null)
    try {
      await load({ page: 1, search })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function changePage(nextPage: number) {
    setError(null)
    setOpenProductId(null)
    setEditingProduct(null)
    try {
      await load({ page: nextPage })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function toggleProduct(item: ProductSummary) {
    try {
      await updateProduct(item.id, { active: !item.active })
      await load()
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Catálogo" subtitle="Categorías, atributos y productos, incluidos los inactivos." />
      <FormError message={error} />
      <section className="panel">
        <div className="section-head">
          <h2><Folder /> Categorías</h2>
        </div>
        {categories.length === 0 ? <p className="muted">Todavía no hay categorías.</p> : (
          <div className="category-grid">
            {categories.map((category) => (
                <article key={category.id} className={category.active ? 'category-card' : 'category-card is-off'}>
                  <span className="catalog-icon" aria-hidden="true"><Folder /></span>
                  {editingCategory?.id === category.id ? (
                    <form className="category-edit" onSubmit={(event) => void renameCategory(event, category)}>
                      <OutlinedField
                        label="Nombre"
                        required
                        maxLength={100}
                        value={editingCategory.name}
                        onChange={(value) => setEditingCategory({ id: category.id, name: value })}
                      />
                      <button className="catalog-action" type="submit" disabled={pending} aria-label={`Guardar ${category.name}`}>
                        <Check />
                      </button>
                      <button className="catalog-action" type="button" disabled={pending} aria-label="Cancelar edición" onClick={() => setEditingCategory(null)}>
                        <X />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{category.name}</strong>
                        <span className={category.active ? 'order-status is-done' : 'order-status is-bad'}>
                          {category.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="catalog-action"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                        >
                          <Pencil />
                        </button>
                        <button
                          type="button"
                          className="catalog-action"
                          aria-label={category.active ? `Desactivar ${category.name}` : `Activar ${category.name}`}
                          onClick={() => void toggleCategory(category)}
                        >
                          {category.active ? <Power /> : <PowerOff />}
                        </button>
                      </div>
                    </>
                  )}
                </article>
            ))}
          </div>
        )}
        <form className="category-create" onSubmit={(event) => void saveCategory(event)}>
          <OutlinedField label="Nueva categoría" required value={categoryName} onChange={setCategoryName} />
          <button className="btn" type="submit" disabled={pending}><FolderPlus /> Crear categoría</button>
        </form>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2><Tags /> Atributos</h2>
        </div>
        <p className="catalog-note">El atributo es el tipo, como Material o Color. Plata, Oro y Bronce se escriben en la variante de cada producto.</p>
        {attributeError ? <p className="catalog-alert" role="alert">{attributeError}</p> : null}
        {attributes.length === 0 ? <p className="muted">Todavía no hay atributos.</p> : (
          <div className="attribute-list">
            {attributes.map((attribute) => (
              <article key={attribute.id} className="attribute-chip">
                {editingAttribute?.id === attribute.id ? (
                  <form className="attribute-edit" onSubmit={(event) => void renameAttribute(event, attribute)}>
                    <OutlinedField
                      label="Nombre"
                      required
                      maxLength={50}
                      value={editingAttribute.name}
                      onChange={(value) => setEditingAttribute({ id: attribute.id, name: value })}
                    />
                    <button className="catalog-action" type="submit" disabled={pending} aria-label={`Guardar ${attribute.name}`}>
                      <Check />
                    </button>
                    <button className="catalog-action" type="button" disabled={pending} aria-label="Cancelar edición" onClick={() => setEditingAttribute(null)}>
                      <X />
                    </button>
                  </form>
                ) : (
                  <>
                    <Tags />
                    <span>{attribute.name}</span>
                    <button
                      type="button"
                      className="catalog-action"
                      aria-label={`Editar ${attribute.name}`}
                      onClick={() => setEditingAttribute({ id: attribute.id, name: attribute.name })}
                    >
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      className="catalog-action"
                      aria-label={`Eliminar ${attribute.name}`}
                      disabled={pending}
                      onClick={() => void removeAttribute(attribute)}
                    >
                      <Trash />
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        <form className="attribute-create" onSubmit={(event) => void saveAttribute(event)}>
          <OutlinedField label="Nuevo atributo" required maxLength={50} value={attributeName} onChange={setAttributeName} />
          <button className="btn" type="submit" disabled={pending}><Tags /> Crear atributo</button>
        </form>
      </section>
      <form className="panel catalog-form" onSubmit={(event) => void saveProduct(event)}>
        <div className="section-head">
          <h2><PackagePlus /> Nuevo producto</h2>
        </div>
        <OutlinedSelect label="Categoría" required value={product.categoryId} onChange={(value) => setProduct({ ...product, categoryId: value })}>
          {categories.filter((category) => category.active).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </OutlinedSelect>
        <OutlinedField label="Nombre" required value={product.name} onChange={(value) => setProduct({ ...product, name: value })} />
        <OutlinedField label="Descripción" multiline value={product.description} onChange={(value) => setProduct({ ...product, description: value })} />
        <PhotoField label="Foto del producto" value={product.imageUrl} onChange={(value) => setProduct({ ...product, imageUrl: value })} />
        <button className="btn" type="submit" disabled={pending}><PackagePlus /> Crear producto</button>
        <p className="catalog-note">Esta foto se usa cuando una variante no tiene la suya. El SKU, los atributos, el precio, la existencia y la foto propia se cargan en cada variante.</p>
      </form>
      <section className="panel">
        <div className="section-head">
          <h2><Package /> Productos</h2>
          {pagination ? <p className="muted">{productCount(pagination.total)}</p> : null}
        </div>
        <form className="inline-actions catalog-toolbar" onSubmit={(event) => void findProducts(event)}>
          <OutlinedField label="Buscar producto" maxLength={100} value={search} onChange={setSearch} />
          <button className="btn btn-ghost" type="submit">Buscar</button>
        </form>
        {products.length === 0 ? <p className="muted">No hay productos con esa búsqueda.</p> : <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {products.map((item) => {
                const open = openProductId === item.id
                const price = item.price.minimum
                return (
                  <Fragment key={item.id}>
                    <tr className={open ? 'is-open' : ''}>
                      <td>
                        {editingProduct?.id === item.id ? (
                          <form className="product-edit" onSubmit={(event) => void renameProduct(event, item)}>
                            <OutlinedField
                              label="Nombre"
                              required
                              maxLength={150}
                              value={editingProduct.name}
                              onChange={(value) => setEditingProduct({ ...editingProduct, name: value })}
                            />
                            <button className="catalog-action" type="submit" disabled={pending} aria-label={`Guardar ${item.name}`}>
                              <Check />
                            </button>
                            <button className="catalog-action" type="button" disabled={pending} aria-label="Cancelar edición" onClick={() => setEditingProduct(null)}>
                              <X />
                            </button>
                          </form>
                        ) : (
                          <>
                            <strong>{item.name}</strong>
                            <div className="muted">{item.variantCount === 1 ? '1 variante' : `${item.variantCount} variantes`}</div>
                          </>
                        )}
                      </td>
                      <td>
                        {editingProduct?.id === item.id ? (
                          <OutlinedSelect
                            label="Categoría"
                            required
                            value={editingProduct.categoryId}
                            onChange={(value) => setEditingProduct({ ...editingProduct, categoryId: value })}
                          >
                            {categories.filter((category) => category.active || category.id === item.category.id).map((category) => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </OutlinedSelect>
                        ) : item.category.name}
                      </td>
                      <td>{formatProductPrice(item)}</td>
                      <td className={item.stock === 0 ? 'stock-out' : ''}>{item.stock}</td>
                      <td><span className={item.active ? 'order-status is-done' : 'order-status is-bad'}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="row-actions">
                          {editingProduct?.id === item.id ? null : (
                            <button
                              type="button"
                              className="catalog-action"
                              aria-label={`Editar ${item.name}`}
                              onClick={() => setEditingProduct({ id: item.id, name: item.name, categoryId: String(item.category.id) })}
                            >
                              <Pencil />
                            </button>
                          )}
                          <button
                            type="button"
                            className={open ? 'catalog-action is-on' : 'catalog-action'}
                            aria-expanded={open}
                            aria-label={`Variantes de ${item.name}`}
                            onClick={() => setOpenProductId(open ? null : item.id)}
                          >
                            <Layers />
                          </button>
                          <button
                            type="button"
                            className="catalog-action"
                            aria-label={item.active ? `Desactivar ${item.name}` : `Activar ${item.name}`}
                            onClick={() => void toggleProduct(item)}
                          >
                            {item.active ? <Power /> : <PowerOff />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="variant-row">
                        <td colSpan={6}>
                          <ProductVariants
                            productId={item.id}
                            productName={item.name}
                            defaultPrice={price == null || !Number.isFinite(Number(price)) ? '' : Number(price).toFixed(2)}
                            attributes={attributes}
                            onSaved={async () => { await load() }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>}
        {pagination ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={(nextPage) => void changePage(nextPage)} /> : null}
      </section>
    </div>
  )
}

function productCount(total: number): string {
  if (total === 1) return '1 producto'
  return `${total} productos`
}
