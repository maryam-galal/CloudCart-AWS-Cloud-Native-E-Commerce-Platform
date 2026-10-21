
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import AuthPanel from './AuthPanel.jsx'

const API_URL = 'http://127.0.0.1:8000'

const categories = [
  { name: 'All Products', icon: '✦' },
  { name: 'Electronics', icon: '⌁' },
  { name: 'Fashion', icon: '◇' },
  { name: 'Accessories', icon: '◈' },
  { name: 'Lifestyle', icon: '☕' },
]

function getCategory(product) {
  const name = product.name.toLowerCase()

  if (
    name.includes('headphone') ||
    name.includes('watch') ||
    name.includes('keyboard') ||
    name.includes('speaker')
  ) return 'Electronics'

  if (name.includes('sneaker')) return 'Fashion'

  if (name.includes('sunglasses') || name.includes('backpack')) {
    return 'Accessories'
  }

  return 'Lifestyle'
}

function App() {
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Products')
  const [cartData, setCartData] = useState({ items: [], total: 0 })
  const [orders, setOrders] = useState([])
  const [token, setToken] = useState(
    () => localStorage.getItem('cloudcart_token') || ''
  )
  const [notice, setNotice] = useState('')
  const [cartLoading, setCartLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (response.status === 204) return null

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const detail = data.detail
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(', ')
        : typeof detail === 'string'
          ? detail
          : `Request failed (${response.status})`

      throw new Error(message)
    }

    return data
  }, [token])

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/products/`)
      if (!response.ok) throw new Error('Could not load products.')
      setProducts(await response.json())
      setError('')
    } catch {
      setError(
        'Could not connect to CloudCart. Make sure the FastAPI backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCart = useCallback(async () => {
    if (!token) {
      setCartData({ items: [], total: 0 })
      return
    }

    try {
      const data = await apiRequest('/cart/')
      setCartData(data)
    } catch (err) {
      setNotice(`Could not load your saved cart: ${err.message}`)
    }
  }, [token, apiRequest])

  const loadOrders = useCallback(async () => {
    if (!token) {
      setOrders([])
      return
    }

    try {
      const data = await apiRequest('/orders/')
      setOrders(data.orders || [])
    } catch (err) {
      setNotice(`Could not load order history: ${err.message}`)
    }
  }, [token, apiRequest])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const syncAuth = () => {
      setToken(localStorage.getItem('cloudcart_token') || '')
    }

    window.addEventListener('cloudcart-auth-change', syncAuth)

    return () => {
      window.removeEventListener('cloudcart-auth-change', syncAuth)
    }
  }, [])

  useEffect(() => {
    loadCart()
    loadOrders()
  }, [loadCart, loadOrders])

  const cart = useMemo(() => {
    return cartData.items.map((item) => {
      const product = products.find((entry) => entry.id === item.product_id)

      return {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        image_url: product?.image_url || null,
        stock_quantity: product?.stock_quantity ?? 0,
      }
    })
  }, [cartData, products])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = Number(cartData.total || 0)

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = `${product.name} ${product.description || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesCategory =
        category === 'All Products' || getCategory(product) === category

      return matchesSearch && matchesCategory
    })
  }, [products, search, category])

  async function addToCart(product) {
    if (!token) {
      setNotice('Please sign in before adding products to your saved cart.')
      document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (product.stock_quantity <= 0) {
      setNotice('Sorry, this product is out of stock.')
      return
    }

    setCartLoading(true)
    setNotice('')

    try {
      const data = await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      })

      setCartData(data)
      setNotice(`${product.name} added to your saved cart.`)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setCartLoading(false)
    }
  }

  async function changeQuantity(item, quantity) {
    setCartLoading(true)
    setNotice('')

    try {
      if (quantity <= 0) {
        await apiRequest(`/cart/items/${item.id}`, {
          method: 'DELETE',
        })

        const data = await apiRequest('/cart/')
        setCartData(data)
      } else {
        const data = await apiRequest(`/cart/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        })

        setCartData(data)
      }
    } catch (err) {
      setNotice(err.message)
    } finally {
      setCartLoading(false)
    }
  }

  async function checkout() {
    if (!token) {
      setNotice('Please sign in before checking out.')
      document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (cart.length === 0) {
      setNotice('Your cart is empty.')
      return
    }

    setCheckoutLoading(true)
    setNotice('')

    try {
      const order = await apiRequest('/orders/checkout', {
        method: 'POST',
      })

      setNotice(
        `Order #${order.id} placed successfully! Total: $${Number(order.total_amount).toFixed(2)}.`
      )

      await loadProducts()
      await loadCart()
      await loadOrders()

      document.getElementById('orders')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    } catch (err) {
      setNotice(`Checkout failed: ${err.message}`)
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="store">
      <div className="announcement">
        YOUR EVERYDAY FINDS, ALL IN ONE PLACE
        <span> ✦ </span>
        WELCOME TO CLOUDCART
      </div>

      <header className="navbar">
        <a className="brand" href="#" aria-label="CloudCart home">
          <span className="brand-icon">C</span>
          cloud<span>cart</span>
          <span className="brand-dot">.</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-active" href="#shop">Shop</a>
          <a href="#categories">Categories</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-actions">
          <a className="account-link" href="#account">Sign in</a>
          <a className="cart-button" href="#cart">
            <span>Bag</span>
            <span className="cart-count">{cartCount}</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              A LITTLE SOMETHING FOR EVERYONE
            </div>

            <h1>
              Good things.
              <br />
              <span>Great finds.</span>
            </h1>

            <p className="hero-description">
              Discover everyday essentials and things you didn’t know you
              needed. Thoughtfully picked, ready for you.
            </p>

            <a className="primary-button" href="#shop">
              Explore the collection <span>↗</span>
            </a>

            <div className="hero-proof">
              <span className="proof-stars">★★★★★</span>
              <span>Little finds, big smiles.</span>
            </div>
          </div>

          <div className="hero-art" aria-label="CloudCart shopping illustration">
            <div className="art-circle" />
            <div className="art-label label-top">THE EVERYDAY EDIT</div>
            <div className="art-card art-card-back">
              <span>GOOD</span>
              <span>THINGS</span>
              <span>INSIDE.</span>
              <div className="art-sun">✳</div>
            </div>
            <div className="art-card art-card-front">
              <div className="art-bag-handle" />
              <div className="art-bag-logo">c.</div>
              <div className="art-bag-caption">A BAG FULL OF GOOD</div>
            </div>
            <div className="art-sticker">MADE FOR<br />YOUR EVERYDAY ✦</div>
            <div className="art-label label-bottom">FIND YOUR NEXT FAVOURITE</div>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                THE CLOUDCART COLLECTION
              </div>
              <h2>Find your <span>favourite.</span></h2>
            </div>

            <p className="section-note">
              Good quality. Everyday prices.
              <br />
              Just a click away.
            </p>
          </div>

          <div className="shop-toolbar" id="categories">
            <div className="category-list">
              {categories.map((item) => (
                <button
                  key={item.name}
                  className={`category-button ${
                    category === item.name ? 'selected' : ''
                  }`}
                  onClick={() => setCategory(item.name)}
                >
                  <span>{item.icon}</span> {item.name}
                </button>
              ))}
            </div>

            <label className="search-box">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products"
              />
            </label>
          </div>

          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss message">
                ×
              </button>
            </div>
          )}

          {loading && (
            <div className="state-message">Finding your favourites...</div>
          )}

          {!loading && error && (
            <div className="state-message error-state">
              <h3>We couldn’t load the collection.</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="state-message">
              <h3>No products found.</h3>
              <p>Try another search or category.</p>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div className="product-count">
                SHOWING {filteredProducts.length} FINDS
              </div>

              <div className="product-grid">
                {filteredProducts.map((product, index) => (
                  <article className="product-card" key={product.id}>
                    <div className={`product-image image-tone-${index % 4}`}>
                      <span className="product-category">
                        {getCategory(product)}
                      </span>

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="image-placeholder">✦</span>
                      )}

                      <button
                        className="quick-add"
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity <= 0}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {product.stock_quantity <= 0 ? 'Sold out' : '+ Add'}
                      </button>
                    </div>

                    <div className="product-info">
                      <div className="product-name-row">
                        <h3>{product.name}</h3>
                        <span className="product-price">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      <p className="product-description">
                        {product.description || 'A little something for your everyday.'}
                      </p>

                      <p className={`stock-note ${
                        product.stock_quantity <= 5 ? 'low-stock' : ''
                      }`}>
                        {product.stock_quantity > 0
                          ? `${product.stock_quantity} available`
                          : 'Currently out of stock'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        
        <section className="cart-section" id="cart">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR LITTLE COLLECTION
              </div>
              <h2>Your shopping <span>bag.</span></h2>
            </div>
            <p className="section-note">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag
            </p>
          </div>

          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                onClick={() => setNotice('')}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {!token ? (
            <div className="empty-cart">
              <span className="empty-cart-icon">♡</span>
              <h3>Sign in to access your saved bag.</h3>
              <p>Your shopping cart will be saved to your account.</p>
              <button
                className="primary-button"
                onClick={() =>
                  document.getElementById('account')?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }
              >
                Sign in to continue ↗
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="empty-cart">
              <span className="empty-cart-icon">♡</span>
              <h3>Your bag is waiting for something good.</h3>
              <p>Explore the collection and add your favourites.</p>
              <a className="primary-button" href="#shop">
                Explore products ↗
              </a>
            </div>
          ) : (
            <div className="cart-panel">
              {cart.map((item) => (
                <div className="cart-row" key={item.id}>
                  <div className="cart-item-image">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} />
                    )}
                  </div>

                  <div className="cart-item-details">
                    <strong>{item.name}</strong>
                    <span>${Number(item.price).toFixed(2)} each</span>
                  </div>

                  <div className="quantity-controls">
                    <button
                      disabled={cartLoading}
                      onClick={() =>
                        changeQuantity(item, item.quantity - 1)
                      }
                      aria-label={`Remove one ${item.name}`}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      disabled={
                        cartLoading ||
                        item.quantity >= item.stock_quantity
                      }
                      onClick={() =>
                        changeQuantity(item, item.quantity + 1)
                      }
                      aria-label={`Add one ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-line-total">
                    <strong>
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </strong>
                    <button
                      className="remove-item"
                      disabled={cartLoading}
                      onClick={() => changeQuantity(item, 0)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="cart-summary">
                <span>Subtotal</span>
                <strong>${cartTotal.toFixed(2)}</strong>
              </div>

              <p className="checkout-hint">
                Your order will be created using the current prices and stock.
              </p>

              <button
                className="primary-button checkout-button"
                disabled={cartLoading || checkoutLoading}
                onClick={checkout}
              >
                {checkoutLoading
                  ? 'Processing order...'
                  : 'Place Order ↗'}
              </button>
            </div>
          )}
        </section>


        
        <section className="orders-section" id="orders">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR CLOUDCART ACCOUNT
              </div>
              <h2>Your order <span>history.</span></h2>
            </div>
            <p className="section-note">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>

          {!token ? (
            <div className="empty-cart">
              <h3>Your orders will appear here.</h3>
              <p>Sign in to view your previous purchases.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-cart">
              <h3>No orders yet.</h3>
              <p>Your completed checkouts will appear here.</p>
              <a className="primary-button" href="#shop">
                Start shopping ↗
              </a>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div>
                      <span className="order-label">ORDER</span>
                      <h3>#{order.id}</h3>
                    </div>
                    <span className="order-status">
                      {order.status}
                    </span>
                  </div>

                  <div className="order-items">
                    {order.items.map((item) => (
                      <div
                        className="order-item"
                        key={item.id}
                      >
                        <span>
                          {item.product_name} × {item.quantity}
                        </span>
                        <strong>
                          ${Number(item.subtotal).toFixed(2)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-total">
                    <span>Order total</span>
                    <strong>
                      ${Number(order.total_amount).toFixed(2)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="account-section" id="account">
          <AuthPanel />
        </section>





        <section className="about-strip" id="about">
          <span>✳ THOUGHTFUL FINDS</span>
          <span>✳ EVERYDAY ESSENTIALS</span>
          <span>✳ A LITTLE JOY IN EVERY ORDER</span>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">C</span>
          cloud<span>cart</span><span className="brand-dot">.</span>
        </a>
        <p>Good things, delivered.</p>
        <span>© 2026 CloudCart</span>
      </footer>
    </div>
  )
}

export default App
