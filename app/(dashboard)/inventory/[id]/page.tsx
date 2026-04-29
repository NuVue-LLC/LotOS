'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryItem, InventoryStatus } from '@/types/database'
import { ArrowLeft, Sparkles, Trash2, ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react'

const cardStyle = {
  background: '#fff',
  border: '1px solid #e8ebe6',
  borderRadius: 10,
  padding: '12px',
} as const

const sectionTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: 12,
} as const

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ margin: 'calc(var(--dash-pad) * -1) calc(var(--dash-pad) * -1) 0', padding: '12px var(--dash-pad)', borderBottom: '1px solid #e8ebe6', background: '#fff' }}>
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [vehicle, setVehicle] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    year: '',
    make: '',
    model: '',
    trim: '',
    price: '',
    purchase_price: '',
    recon_cost: '',
    purchase_payment_method: '',
    on_lot: true,
    mileage: '',
    status: 'available' as InventoryStatus,
    color: '',
    description: '',
    notes: '',
  })

  const margin =
    form.price !== '' && (form.purchase_price !== '' || form.recon_cost !== '')
      ? (parseFloat(form.price || '0') || 0) -
        (parseFloat(form.purchase_price || '0') || 0) -
        (parseFloat(form.recon_cost || '0') || 0)
      : null

  const paymentMethodOptions = [
    { value: '', label: 'Select payment method...' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'check', label: 'Check' },
    { value: 'cashier_check', label: "Cashier's Check" },
    { value: 'cashapp', label: 'CashApp' },
  ]

  useEffect(() => {
    loadVehicle()
  }, [id])

  async function loadVehicle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .eq('dealer_id', user.id)
      .single()

    if (fetchError || !data) {
      router.push('/inventory')
      return
    }

    setVehicle(data)
    setForm({
      year: data.year?.toString() ?? '',
      make: data.make ?? '',
      model: data.model ?? '',
      trim: data.trim ?? '',
      price: data.price?.toString() ?? '',
      purchase_price: data.purchase_price?.toString() ?? '',
      recon_cost: data.recon_cost?.toString() ?? '',
      purchase_payment_method: data.purchase_payment_method ?? '',
      on_lot: data.on_lot ?? true,
      mileage: data.mileage?.toString() ?? '',
      status: data.status,
      color: data.color ?? '',
      description: data.description ?? '',
      notes: data.notes ?? '',
    })
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          year: form.year ? parseInt(form.year) : null,
          make: form.make || null,
          model: form.model || null,
          trim: form.trim || null,
          price: form.price ? parseFloat(form.price) : null,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0,
          recon_cost: form.recon_cost ? parseFloat(form.recon_cost) : 0,
          purchase_payment_method: form.purchase_payment_method || null,
          on_lot: form.on_lot,
          mileage: form.mileage ? parseInt(form.mileage) : null,
          status: form.status,
          color: form.color || null,
          description: form.description || null,
          notes: form.notes || null,
        })
        .eq('id', id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      if (deleteError) {
        setError(deleteError.message)
        setDeleting(false)
        setShowDeleteModal(false)
      } else {
        router.push('/inventory')
      }
    } catch {
      setError('Failed to delete vehicle.')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  async function generateDescription() {
    if (!form.year || !form.make || !form.model) return
    setGenerating(true)
    try {
      const res = await fetch('/api/inventory/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: form.year,
          make: form.make,
          model: form.model,
          trim: form.trim,
          mileage: form.mileage,
          color: form.color,
          price: form.price,
        }),
      })
      const data = await res.json()
      if (data.description) {
        setForm((f) => ({ ...f, description: data.description }))
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(false)
    }
  }

  const MAX_PHOTOS = 20

  async function handlePhotoUpload(files: FileList) {
    if (!vehicle) return
    const currentPhotos = vehicle.photos ?? []
    const remaining = MAX_PHOTOS - currentPhotos.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    if (toUpload.length === 0) return

    setUploading(true)
    try {
      const supabase = createClient()
      const newUrls: string[] = []
      for (const file of toUpload) {
        const ext = file.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('inventory-photos').upload(path, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('inventory-photos').getPublicUrl(path)
        newUrls.push(urlData.publicUrl)
      }
      const updatedPhotos = [...currentPhotos, ...newUrls]
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ photos: updatedPhotos })
        .eq('id', id)
      if (updateError) throw new Error(updateError.message)
      setVehicle((v) => v ? { ...v, photos: updatedPhotos } : v)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handlePhotoRemove(index: number) {
    if (!vehicle) return
    const currentPhotos = vehicle.photos ?? []
    const url = currentPhotos[index]
    if (!url) return

    try {
      const supabase = createClient()
      const parts = url.split('/')
      const filename = parts[parts.length - 1]
      await supabase.storage.from('inventory-photos').remove([filename])
      const updatedPhotos = currentPhotos.filter((_, i) => i !== index)
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ photos: updatedPhotos })
        .eq('id', id)
      if (updateError) throw new Error(updateError.message)
      setVehicle((v) => v ? { ...v, photos: updatedPhotos } : v)
      if (photoIndex >= updatedPhotos.length && updatedPhotos.length > 0) {
        setPhotoIndex(updatedPhotos.length - 1)
      } else if (updatedPhotos.length === 0) {
        setPhotoIndex(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo.')
    }
  }

  if (loading) return <LoadingSkeleton />

  const photos = vehicle?.photos ?? []

  const vehicleName = vehicle
    ? `${vehicle.year ?? ''} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || 'Vehicle Details'
    : 'Vehicle Details'

  return (
    <div>
      {/* Topbar */}
      <div style={{
        margin: 'calc(var(--dash-pad) * -1) calc(var(--dash-pad) * -1) 0',
        background: '#fff',
        borderBottom: '1px solid #e8ebe6',
        padding: '12px var(--dash-pad)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link href="/inventory" style={{ display: 'flex', alignItems: 'center', color: '#1a1a1a' }}>
            <ArrowLeft size={18} />
          </Link>
          <span className="hidden sm:inline" style={{ color: '#ccc' }}>&middot;</span>
          <span className="truncate" style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{vehicleName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            style={{
              border: '1px solid #f5c6cb',
              color: '#dc3545',
              background: 'transparent',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              const formEl = document.getElementById('vehicle-form') as HTMLFormElement
              if (formEl) formEl.requestSubmit()
            }}
            disabled={saving}
            style={{
              background: '#2d7a4f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{ borderRadius: 7, border: '1px solid #c8e8d4', backgroundColor: '#e8f5ee', padding: '10px 16px', fontSize: 14, color: '#2d7a4f', marginTop: 16 }}>
          Changes saved successfully.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ borderRadius: 7, border: '1px solid #f5c6cb', backgroundColor: '#fdf0f0', padding: '10px 16px', fontSize: 14, color: '#dc3545', marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* Two-column grid */}
      <form id="vehicle-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Vehicle Details */}
          <Card style={cardStyle}>
            <h2 style={sectionTitle}>Vehicle Details</h2>
            <div className="grid grid-cols-2" style={{ gap: 10 }}>
              <Input label="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="2020" />
              <Input label="Make" value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} placeholder="Honda" />
              <Input label="Model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Civic" />
              <Input label="Trim" value={form.trim} onChange={(e) => setForm((f) => ({ ...f, trim: e.target.value }))} placeholder="EX-L" />
              <Input label="Color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Silver" />
            </div>
          </Card>

          {/* Pricing & Mileage */}
          <Card style={cardStyle}>
            <h2 style={sectionTitle}>Pricing & Mileage</h2>
            <div className="grid grid-cols-2" style={{ gap: 10 }}>
              <Input label="Purchase Price" type="number" value={form.purchase_price} onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))} placeholder="What you paid" />
              <Select label="Payment Method" value={form.purchase_payment_method} onChange={(e) => setForm((f) => ({ ...f, purchase_payment_method: e.target.value }))} options={paymentMethodOptions} />
              <Input label="Recon / Repairs" type="number" value={form.recon_cost} onChange={(e) => setForm((f) => ({ ...f, recon_cost: e.target.value }))} placeholder="Money into the car" />
              <Input label="Price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="15000" />
              <Input label="Mileage" type="number" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} placeholder="45000" />
            </div>
            {margin !== null && (
              <div style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #e8ebe6',
                backgroundColor: '#f9faf8',
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Estimated Margin</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: margin >= 0 ? '#2d7a4f' : '#dc3545' }}>
                  {margin < 0 ? '-' : ''}${Math.abs(margin).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </Card>

          {/* Status */}
          <Card style={cardStyle}>
            <h2 style={sectionTitle}>Status</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: 'available' }))}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 6,
                  border: form.status === 'available' ? '1px solid #2d7a4f' : '1px solid #e8ebe6',
                  background: form.status === 'available' ? '#2d7a4f' : '#fff',
                  color: form.status === 'available' ? '#fff' : '#1a1a1a',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: 'sold' }))}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 6,
                  border: form.status === 'sold' ? '1px solid #dc3545' : '1px solid #e8ebe6',
                  background: form.status === 'sold' ? '#dc3545' : '#fff',
                  color: form.status === 'sold' ? '#fff' : '#1a1a1a',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sold
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([
                { value: 'recon' as InventoryStatus, label: 'In Recon' },
                { value: 'listed' as InventoryStatus, label: 'Listed' },
                { value: 'under_contract' as InventoryStatus, label: 'Under Contract' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: form.status === opt.value ? '1px solid #2d7a4f' : '1px solid #e8ebe6',
                    background: form.status === opt.value ? '#e8f5ee' : '#fff',
                    color: form.status === opt.value ? '#2d7a4f' : '#999',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Location */}
          <Card style={cardStyle}>
            <h2 style={sectionTitle}>Location</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, on_lot: true }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6,
                  border: form.on_lot ? '1px solid #2d7a4f' : '1px solid #e8ebe6',
                  background: form.on_lot ? '#2d7a4f' : '#fff',
                  color: form.on_lot ? '#fff' : '#1a1a1a',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                On Lot
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, on_lot: false }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6,
                  border: !form.on_lot ? '1px solid #b8860b' : '1px solid #e8ebe6',
                  background: !form.on_lot ? '#b8860b' : '#fff',
                  color: !form.on_lot ? '#fff' : '#1a1a1a',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Off Lot
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Off Lot = at the mechanic, in transit, or not on site.</p>
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Photos */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Photos</h2>
              <span style={{ fontSize: 12, color: '#999' }}>{photos.length}/{MAX_PHOTOS}</span>
            </div>
            {photos.length > 0 && (
              <>
                <div className="relative" style={{ borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f6f3' }}>
                  <div className="relative" style={{ width: '100%', height: 140 }}>
                    <Image
                      src={photos[photoIndex]}
                      alt={`Photo ${photoIndex + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1))}
                        style={{
                          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%',
                          padding: 4, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%',
                          padding: 4, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6, marginTop: 10 }}>
                  {photos.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex(i)}
                        className="relative"
                        style={{
                          width: '100%', height: 64, borderRadius: 6, overflow: 'hidden',
                          border: i === photoIndex ? '2px solid #2d7a4f' : '2px solid transparent',
                          padding: 0, cursor: 'pointer', background: 'none', display: 'block',
                        }}
                      >
                        <Image src={url} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(i)}
                        style={{
                          position: 'absolute', top: 2, right: 2,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#fff', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      >
                        <X size={10} color="#dc3545" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {photos.length < MAX_PHOTOS && (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.dataTransfer.files && !uploading) handlePhotoUpload(e.dataTransfer.files)
                }}
                style={{
                  border: '2px dashed #e8ebe6',
                  borderRadius: 8,
                  padding: '24px',
                  textAlign: 'center' as const,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  marginTop: photos.length > 0 ? 10 : 0,
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                <ImagePlus size={24} color="#999" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p style={{ fontSize: 12, color: '#ccc', margin: '4px 0 0' }}>JPG, PNG</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handlePhotoUpload(e.target.files)
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </Card>

          {/* Listing Description */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Listing Description</h2>
              <button
                type="button"
                onClick={generateDescription}
                disabled={generating || !form.year || !form.make || !form.model}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: generating ? '#999' : '#2d7a4f',
                  cursor: generating || !form.year || !form.make || !form.model ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                <Sparkles size={12} />
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Vehicle description, condition notes, features..."
              style={{
                width: '100%', borderRadius: 7, border: '1px solid #e8ebe6', backgroundColor: '#fff',
                padding: '8px 12px', fontSize: 14, color: '#1a1a1a', minHeight: 80, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2d7a4f'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(45,122,79,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ebe6'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </Card>

          {/* Internal Notes */}
          <Card style={cardStyle}>
            <h2 style={sectionTitle}>Internal Notes</h2>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Needs oil change, has extra key, bought from John at Manheim..."
              style={{
                width: '100%', borderRadius: 7, border: '1px solid #e8ebe6', backgroundColor: '#fff',
                padding: '8px 12px', fontSize: 14, color: '#1a1a1a', minHeight: 70, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2d7a4f'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(45,122,79,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ebe6'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Not shown to customers — for your records only</p>
          </Card>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Vehicle">
        <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
          Are you sure you want to delete this{' '}
          <span style={{ fontWeight: 500, color: '#1a1a1a' }}>
            {vehicle?.year} {vehicle?.make} {vehicle?.model}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end" style={{ gap: 12 }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
