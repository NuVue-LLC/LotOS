'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { normalizeDomain } from '@/lib/utils/url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    dealershipName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.dealershipName,
          full_name: form.name,
          phone: form.phone,
          website_url: form.websiteUrl ? normalizeDomain(form.websiteUrl) : undefined,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Create your account</h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Input
        label="Your Name"
        value={form.name}
        onChange={update('name')}
        placeholder="John Smith"
        required
      />

      <Input
        label="Dealership Name"
        value={form.dealershipName}
        onChange={update('dealershipName')}
        placeholder="Smith Auto Sales"
        required
      />

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={update('email')}
        placeholder="you@dealership.com"
        required
      />

      <Input
        label="Phone"
        type="tel"
        value={form.phone}
        onChange={update('phone')}
        placeholder="(555) 123-4567"
      />

      <Input
        label="Website URL"
        value={form.websiteUrl}
        onChange={update('websiteUrl')}
        placeholder="https://yourdealership.com"
      />

      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={update('password')}
        placeholder="••••••••"
        minLength={6}
        required
      />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
