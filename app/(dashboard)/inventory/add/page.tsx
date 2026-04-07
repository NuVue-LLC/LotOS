'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Upload, X, ArrowLeft, CheckCircle, Sparkles, Camera } from 'lucide-react'
import Link from 'next/link'

interface VinResult {
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
}

interface PhotoEntry {
  file: File
  preview: string
}

export default function AddVehiclePage() {
  const router = useRouter()
  const scanInputRef = useRef<HTMLInputElement>(null)
  const [vinLooking, setVinLooking] = useState(false)
  const [vinDecoded, setVinDecoded] = useState<VinResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [form, setForm] = useState({
    vin: '', year: '', make: '', model: '', trim: '',
    mileage: '', price: '', color: '', description: '', notes: '',
  })

  async function lookupVin() {
    if (!form.vin || form.vin.length < 11) return
    setVinLooking(true)
    try {
      const res = await fetch(`/api/vin/${form.vin}`)
      const data: VinResult = await res.json()
      setForm((f) => ({
        ...f,
        year: data.year?.toString() ?? f.year,
        make: data.make ?? f.make,
        model: data.model ?? f.model,
        trim: data.trim ?? f.trim,
      }))
      setVinDecoded(data)
    } catch { /* silently fail */ }
    setVinLooking(false)
  }

  async function scanBuySheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScanning(true)
    setScanError(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/inventory/scan-buysheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (!res.ok) { setScanError('Could not read buy sheet'); return }
      const data = await res.json()
      if (data.error) { setScanError('Could not read buy sheet'); return }
      setForm((f) => ({
        ...f, vin: data.vin ?? f.vin, year: data.year?.toString() ?? f.year,
        make: data.make ?? f.make, model: data.model ?? f.model,
        mileage: data.mileage?.toString() ?? f.mileage,
      }))
    } catch { setScanError('Could not read buy sheet') }
    finally { setScanning(false) }
  }

  const MAX_PHOTOS = 20
  const remaining = MAX_PHOTOS - photos.length

  function addFiles(files: FileList | File[]) {
    const allowed = Array.from(files).slice(0, remaining)
    if (allowed.length === 0) return
    setPhotos((prev) => [...prev, ...allowed.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    addFiles(files)
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index) })
  }

  async function generateDescription(): Promise<string | null> {
    if (!form.year || !form.make || !form.model) return null
    setGenerating(true)
    try {
      const res = await fetch('/api/inventory/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: form.year, make: form.make, model: form.model, trim: form.trim, mileage: form.mileage, color: form.color, price: form.price }),
      })
      const data = await res.json()
      if (data.description) { setForm((f) => ({ ...f, description: data.description })); return data.description }
      return null
    } catch { return null }
    finally { setGenerating(false) }
  }

  async function uploadPhotos(): Promise<string[]> {
    const supabase = createClient()
    const urls: string[] = []
    for (const photo of photos) {
      const ext = photo.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('inventory-photos').upload(path, photo.file)
      if (error) throw new Error(`Photo upload failed: ${error.message}`)
      const { data: urlData } = supabase.storage.from('inventory-photos').getPublicUrl(path)
      urls.push(urlData.publicUrl)
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be logged in.'); setSaving(false); return }
      let description = form.description
      if (!description && form.year && form.make && form.model) description = (await generateDescription()) ?? ''
      let photoUrls: string[] = []
      if (photos.length > 0) photoUrls = await uploadPhotos()
      const { error: insertError } = await supabase.from('inventory').insert({
        dealer_id: user.id, vin: form.vin || null,
        year: form.year ? parseInt(form.year) : null, make: form.make || null,
        model: form.model || null, trim: form.trim || null,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        price: form.price ? parseFloat(form.price) : null,
        color: form.color || null, description: description || null,
        notes: form.notes || null, photos: photoUrls, status: 'available' as const,
      })
      if (insertError) { setError(insertError.message); setSaving(false); return }
      router.push('/inventory')
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <Link href="/inventory">
          <Button variant="ghost" size="sm"><ArrowLeft style={{ width: 16, height: 16 }} /></Button>
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>Add Vehicle</h1>
      </div>

      {error && (
        <div style={{ border: '1px solid #f5c6c6', backgroundColor: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc3545' }}>
          {error}
        </div>
      )}

      {/* Mobile scan */}
      <div className="md:hidden">
        <Card>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Scan Buy Sheet</h2>
          <Button size="lg" className="w-full" disabled={scanning} onClick={() => scanInputRef.current?.click()}>
            <Camera style={{ width: 15, height: 15, marginRight: 6 }} />
            {scanning ? 'Reading...' : 'Take Photo of Buy Sheet'}
          </Button>
          <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={scanBuySheet} className="hidden" />
          {scanError && <p style={{ fontSize: 13, color: '#dc3545', marginTop: 8 }}>{scanError}</p>}
        </Card>
      </div>

      {/* VIN Lookup */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>VIN Lookup</h2>
        <div className="flex" style={{ gap: 10 }}>
          <div className="flex-1">
            <Input value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))} placeholder="Enter VIN to auto-fill" />
          </div>
          <Button onClick={lookupVin} disabled={vinLooking || form.vin.length < 11}>
            <Search style={{ width: 14, height: 14, marginRight: 6 }} />
            {vinLooking ? 'Decoding...' : 'Decode'}
          </Button>
        </div>
      </Card>

      {vinDecoded && (
        <div style={{ border: '1px solid #c8e8d4', backgroundColor: '#e8f5ee', borderRadius: 8, padding: 16 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
            <CheckCircle style={{ width: 16, height: 16, color: '#2d7a4f' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Vehicle Identified</span>
          </div>
          <p style={{ fontSize: 13, color: '#666', marginLeft: 24 }}>
            {vinDecoded.year} {vinDecoded.make} {vinDecoded.model}{vinDecoded.trim ? ` ${vinDecoded.trim}` : ''}
          </p>
        </div>
      )}

      {/* Main Form */}
      <Card>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Vehicle Details</h2>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              <Input label="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="2020" />
              <Input label="Make" value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} placeholder="Honda" />
              <Input label="Model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Civic" />
              <Input label="Trim" value={form.trim} onChange={(e) => setForm((f) => ({ ...f, trim: e.target.value }))} placeholder="EX-L" />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Pricing & Mileage</h2>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              <Input label="Price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="15000" />
              <Input label="Mileage" type="number" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} placeholder="45000" />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input label="Color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Silver" />
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Description</label>
                  <Button type="button" variant="ghost" size="sm" onClick={generateDescription} disabled={generating || !form.year || !form.make || !form.model}>
                    <Sparkles style={{ width: 13, height: 13, marginRight: 4 }} />
                    {generating ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Vehicle description, features..."
                  style={{ width: '100%', border: '1px solid #e8ebe6', borderRadius: 7, padding: '8px 12px', fontSize: 14, color: '#1a1a1a', outline: 'none', resize: 'vertical', minHeight: 100 }}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Internal Notes</h2>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Needs oil change, extra key..."
              style={{ width: '100%', border: '1px solid #e8ebe6', borderRadius: 7, padding: '8px 12px', fontSize: 14, color: '#1a1a1a', outline: 'none', resize: 'vertical', minHeight: 70 }}
            />
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Not shown to customers</p>
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Photos</h2>
              <span style={{ fontSize: 13, color: '#999' }}>{photos.length}/{MAX_PHOTOS}</span>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4" style={{ gap: 10, marginBottom: 12 }}>
                {photos.map((photo, i) => (
                  <div key={i} className="relative group" style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute opacity-0 group-hover:opacity-100"
                      style={{ top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {remaining > 0 ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  border: dragActive ? '2px dashed #2d7a4f' : '2px dashed #ddd',
                  borderRadius: 10, padding: '36px 0', cursor: 'pointer',
                  backgroundColor: dragActive ? '#f0faf4' : 'transparent',
                }}
              >
                <Upload style={{ width: 20, height: 20, color: '#999' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Drop photos or click to upload</span>
                <span style={{ fontSize: 12, color: '#aaa' }}>{remaining} remaining</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              </label>
            ) : (
              <p style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '20px 0' }}>Maximum {MAX_PHOTOS} photos reached.</p>
            )}
          </div>

          <Button type="submit" disabled={saving} size="lg" className="w-full">
            {saving ? (photos.length > 0 ? 'Uploading & saving...' : 'Saving...') : 'Save Vehicle'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
