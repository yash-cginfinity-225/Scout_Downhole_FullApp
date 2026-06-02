import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../services/api'
import Input from '../atoms/Input/Input'
import Button from '../atoms/Button/Button'
import Spinner from '../atoms/Spinner/Spinner'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)
    try {
      const res = await loginUser(username, password)
      login(res.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark via-gray-900 to-primary-dark p-[1.25rem]">
      <div className="bg-white rounded-[0.75rem] shadow-lg px-[2.5rem] py-[3rem] w-full max-w-[26.25rem]">
        <div className="text-center mb-[2.25rem]">
          <h1 className="text-[2.25rem] font-extrabold text-primary tracking-[0.25rem]">SCOUT</h1>
          <p className="text-[0.75rem] text-gray-500 mt-[0.25rem] tracking-wide">Steering Downhole Innovation&trade;</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[1.25rem]">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-[0.8125rem] text-red-500 text-center p-[0.5rem] bg-red-50 rounded-[0.25rem]">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-[0.5rem]">
            {loading ? <Spinner size="sm" /> : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  )
}
