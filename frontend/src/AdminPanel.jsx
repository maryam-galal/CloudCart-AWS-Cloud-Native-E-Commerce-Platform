
import { useCallback, useEffect, useState } from 'react'

const API_URL = 'http://127.0.0.1:8000'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '0',
  image_url: '',
}

export default function AdminPanel({ token }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const detail = data.detail
      const messageText = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(', ')
        : typeof detail === 'string'
          ? detail
          : `Request failed (${response.status})`

      throw new Error(messageText)
    }

    return data
  }, [token])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await request('/products/')
      setProducts(data)
    } catch (err) {
      setError(err.message || 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function startEditing(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
      image_url: product.image_url || '',
    })
    setMessage('')
    setError('')
    document.getElementById('admin-product-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      image_url: form.image_url.trim() || null,
    }

    try {
      if (editingId !== null) {
        await request(`/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setMessage('Product updated successfully.')
      } else {
        await request('/products/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setMessage('Product created successfully.')
      }

      resetForm()
      await loadProducts()
    } catch (err) {
      setError(err.message || 'Could not save the product.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivateProduct(product) {
    const confirmed = window.confirm(
      `Deactivate "${product.name}"? It will no longer appear in the public store.`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await request(`/products/${product.id}`, { method: 'DELETE' })
      setMessage(`${product.name} has been deactivated.`)
      await loadProducts()
    } catch (err) {
      setError(err.message || 'Could not deactivate the product.')
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            CLOUDCART MANAGEMENT
          </div>
          <h3>Product <span>dashboard.</span></h3>
          <p>Manage your store's catalogue, prices, and inventory.</p>
        </div>
        <div className="admin-badge">ADMIN</div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <span>Active products</span>
          <strong>{products.length}</strong>
        </div>
        <div className="admin-stat">
          <span>Total units in stock</span>
          <strong>
            {products.reduce(
              (total, product) => total + Number(product.stock_quantity || 0),
              0
            )}
          </strong>
        </div>
        <div className="admin-stat">
          <span>Low-stock products</span>
          <strong>
            {products.filter(
              (product) =>
                product.stock_quantity > 0 && product.stock_quantity <= 5
            ).length}
          </strong>
        </div>
      </div>

      {error && <p className="admin-message admin-error" role="alert">{error}</p>}
      {message && <p className="admin-message admin-success" role="status">{message}</p>}

      <div className="admin-form-card" id="admin-product-form">
        <div className="admin-form-heading">
          <h4>{editingId !== null ? 'Edit product' : 'Add a new product'}</h4>
          {editingId !== null && (
            <button className="admin-cancel" type="button" onClick={resetForm}>
              Cancel editing
            </button>
          )}
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Product name *
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              minLength={2}
              maxLength={150}
              required
              placeholder="e.g. Wireless Headphones"
            />
          </label>

          <label>
            Price (USD) *
            <input
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Stock quantity *
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              value={form.stock_quantity}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Image URL
            <input
              name="image_url"
              type="url"
              maxLength={500}
              value={form.image_url}
              onChange={updateField}
              placeholder="https://..."
            />
          </label>

          <label className="admin-description-field">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              maxLength={500}
              rows={3}
              placeholder="Describe the product..."
            />
          </label>

          <button className="primary-button admin-save" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId !== null
                ? 'Save changes ↗'
                : 'Create product ↗'}
          </button>
        </form>
      </div>

      <div className="admin-inventory">
        <div className="admin-inventory-heading">
          <h4>Product inventory</h4>
          <button
            className="admin-refresh"
            onClick={loadProducts}
            disabled={loading}
            type="button"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <p className="admin-empty">Loading inventory...</p>
        ) : products.length === 0 ? (
          <p className="admin-empty">No active products found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" />
                        ) : (
                          <span className="admin-no-image">✦</span>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>${Number(product.price).toFixed(2)}</td>
                    <td>
                      <span
                        className={`admin-stock ${
                          product.stock_quantity <= 5 ? 'admin-stock-low' : ''
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-edit"
                          onClick={() => startEditing(product)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="admin-deactivate"
                          onClick={() => deactivateProduct(product)}
                          type="button"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
