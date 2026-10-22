
import { useEffect, useState } from 'react'
import AdminPanel from './AdminPanel.jsx'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function AuthPanel() {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('cloudcart_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    let cancelled = false

    async function loadUser() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          localStorage.removeItem('cloudcart_token')
          if (!cancelled) {
            setToken('')
            setUser(null)
          }
          return
        }

        const data = await response.json()
        if (!cancelled) setUser(data)
      } catch {
        if (!cancelled) {
          setError('Could not verify your session. Check that the backend is running.')
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      let response

      if (mode === 'signin') {
        const formData = new URLSearchParams()
        formData.set('username', email)
        formData.set('password', password)

        response = await fetch(`${API_URL}/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        })
      } else {
        response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
      }

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = data.detail
        const messageText = Array.isArray(detail)
          ? detail.map((item) => item.msg).join(', ')
          : typeof detail === 'string'
            ? detail
            : 'Please check your details and try again.'

        throw new Error(messageText)
      }

      if (mode === 'signup') {
        setMessage('Account created! You can now sign in.')
        setMode('signin')
        setPassword('')
      } else {
        if (!data.access_token) {
          throw new Error('The server did not return an access token.')
        }

        localStorage.setItem('cloudcart_token', data.access_token)
        setToken(data.access_token)
        window.dispatchEvent(new Event('cloudcart-auth-change'))
        setPassword('')
        setMessage('Signed in successfully!')
      }
    } catch (err) {
      setError(
        err.message || 'Could not connect to CloudCart. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    localStorage.removeItem('cloudcart_token')
    setToken('')
    window.dispatchEvent(new Event('cloudcart-auth-change'))
    setUser(null)
    setPassword('')
    setMessage('You have signed out.')
    setError('')
  }

  if (token && user) {
    return (
      <div className="auth-card">
        <div className="auth-success-icon">OK</div>
        <div className="eyebrow auth-eyebrow">YOUR CLOUDCART ACCOUNT</div>
        <h3>Welcome, {user.name}!</h3>
        <p className="auth-description">
          You are signed in as <strong>{user.email}</strong>.
        </p>

        <div className="account-role">
          <span>Account role</span>
          <strong>{user.role}</strong>
        </div>

        {user.role === 'admin' ? (
          <AdminPanel token={token} />
        ) : (
          <p className="auth-description">
            Your customer account is ready. We'll connect your saved cart and
            order history next.
          </p>
        )}

        <button className="primary-button auth-submit" onClick={signOut}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <div className="eyebrow auth-eyebrow">
        <span className="eyebrow-line" />
        YOUR CLOUDCART ACCOUNT
      </div>

      <h3>{mode === 'signin' ? 'Welcome back.' : 'Join CloudCart.'}</h3>

      <p className="auth-description">
        {mode === 'signin'
          ? 'Sign in to your account to continue shopping.'
          : 'Create your customer account in just a moment.'}
      </p>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => {
            setMode('signin')
            setError('')
            setMessage('')
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => {
            setMode('signup')
            setError('')
            setMessage('')
          }}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <label>
            Full name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            minLength={mode === 'signup' ? 8 : undefined}
            maxLength={128}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {message && <p className="auth-message auth-info" role="status">{message}</p>}

        <button className="primary-button auth-submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign in ->'
              : 'Create account ->'}
        </button>
      </form>

      <p className="auth-footnote">
        New registrations receive customer access. Admin access is assigned
        separately on the backend.
      </p>
    </div>
  )
}
