'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryItem, InventoryStatus } from '@/types/database'
import { Car, Plus, LayoutGrid, Table as TableIcon } from 'lucide-react'

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'

type FilterTab = 'all' | 'available' | 'sold'
type ViewMode = 'grid' | 'table'

function daysOnLot(listedAt: string): number {
  const ms = Date.now() - new Date(listedAt).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const statusBadge: Record<InventoryStatus, { label: string; variant: 'default' | 'success' }> = {
  available: { label: 'Available', variant: 'success' },
  recon: { label: 'In Recon', variant: 'default' },
  listed: { label: 'Listed', variant: 'success' },
  under_contract: { label: 'Under Contract', variant: 'default' },
  sold: { label: 'Sold', variant: 'default' },
}

function formatDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Added today'
  if (diffDays === 1) return 'Added yesterday'
  if (diffDays < 7) return `Added ${diffDays}d ago`
  return `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e8ebe6', borderRadius: 10, overflow: 'hidden' }}>
            <Skeleton className="h-[120px] w-full rounded-none" />
            <div style={{ padding: 12 }}>
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('inventoryView') : null
    if (saved === 'grid' || saved === 'table') setView(saved)
  }, [])

  function changeView(next: ViewMode) {
    setView(next)
    if (typeof window !== 'undefined') window.localStorage.setItem('inventoryView', next)
  }

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('dealer_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setInventory(data)
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  const filtered = inventory.filter((v) => {
    if (filter === 'available') return v.status !== 'sold'
    if (filter === 'sold') return v.status === 'sold'
    return true
  })

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'sold', label: 'Sold' },
  ]

  const available = inventory.filter((v) => v.status !== 'sold')
  const totalLotValue = available.reduce((sum, v) => sum + (v.price ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center" style={{ gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>Inventory</h1>
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#999',
            backgroundColor: '#f3f3f3',
            padding: '2px 10px',
            borderRadius: 5,
          }}>
            {inventory.length} vehicle{inventory.length !== 1 ? 's' : ''}
          </span>
          {totalLotValue > 0 && (
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              fontFamily: mono,
              color: '#2d7a4f',
              backgroundColor: '#e8f5ee',
              border: '1px solid #c8e8d4',
              padding: '2px 10px',
              borderRadius: 5,
            }}>
              ${totalLotValue.toLocaleString()}
            </span>
          )}
        </div>
        <Link href="/inventory/add">
          <Button>
            <Plus style={{ width: 15, height: 15, marginRight: 6 }} /> Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex items-center justify-between">
        <div className="flex" style={{ gap: 6 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 7,
                border: filter === tab.key ? 'none' : '1px solid #e8ebe6',
                backgroundColor: filter === tab.key ? '#2d7a4f' : '#fff',
                color: filter === tab.key ? '#fff' : '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: '#bbb', letterSpacing: '0.2px', flexShrink: 0 }}>
            Sort: newest first ↓
          </span>
          <div style={{ display: 'flex', border: '1px solid #e8ebe6', borderRadius: 7, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => changeView('grid')}
              title="Grid view"
              style={{
                padding: '6px 10px',
                background: view === 'grid' ? '#f4f6f3' : '#fff',
                color: view === 'grid' ? '#2d7a4f' : '#999',
                border: 'none', borderRight: '1px solid #e8ebe6', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <LayoutGrid style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              onClick={() => changeView('table')}
              title="CRM / table view"
              style={{
                padding: '6px 10px',
                background: view === 'table' ? '#f4f6f3' : '#fff',
                color: view === 'table' ? '#2d7a4f' : '#999',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <TableIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {inventory.length === 0 ? (
        <div className="flex flex-col items-center" style={{ padding: '60px 0' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            border: '2px dashed #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Car style={{ width: 28, height: 28, color: '#bbb' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>No vehicles in inventory</p>
          <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>Add your first vehicle to start tracking your lot.</p>
          <Link href="/inventory/add">
            <Button>
              <Plus style={{ width: 15, height: 15, marginRight: 6 }} /> Add Vehicle
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center" style={{ padding: '60px 0' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>No {filter} vehicles</p>
          <p style={{ fontSize: 13, color: '#999' }}>Try a different filter.</p>
        </div>
      ) : view === 'table' ? (
        <div style={{ background: '#fff', border: '1px solid #e8ebe6', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9faf8', borderBottom: '1px solid #e8ebe6' }}>
                {['Vehicle', 'VIN', 'Days', 'Cost', 'Asking', 'Margin', 'Status', 'Loc'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vehicle) => {
                const totalCost = (vehicle.purchase_price ?? 0) + (vehicle.recon_cost ?? 0)
                const margin = vehicle.price != null ? vehicle.price - totalCost : null
                const marginPct = margin != null && vehicle.price && vehicle.price > 0
                  ? (margin / vehicle.price) * 100
                  : null
                const days = daysOnLot(vehicle.listed_at)
                const isSold = vehicle.status === 'sold'
                return (
                  <tr
                    key={vehicle.id}
                    onClick={() => { window.location.href = `/inventory/${vehicle.id}` }}
                    style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <div style={{ position: 'relative', width: 44, height: 32, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f4f6f3', flexShrink: 0 }}>
                          {vehicle.photos && vehicle.photos.length > 0 ? (
                            <Image src={vehicle.photos[0]} alt="" fill className="object-cover" sizes="44px" />
                          ) : (
                            <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                              <Car style={{ width: 14, height: 14, color: '#ccc' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          {vehicle.trim && (
                            <div style={{ fontSize: 11, color: '#999' }}>{vehicle.trim}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: mono, fontSize: 11, color: '#666' }}>
                      {vehicle.vin ? vehicle.vin.slice(-8) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: mono, color: days > 60 ? '#dc3545' : days > 30 ? '#b8860b' : '#666' }}>
                      {days}d
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: mono, color: '#666' }}>
                      {fmtMoney(totalCost > 0 ? totalCost : null)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: mono, fontWeight: 600, color: isSold ? '#bbb' : '#1a1a1a', textDecoration: isSold ? 'line-through' : 'none' }}>
                      {fmtMoney(vehicle.price)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: mono }}>
                      {margin != null ? (
                        <div>
                          <div style={{ fontWeight: 600, color: margin >= 0 ? '#2d7a4f' : '#dc3545' }}>
                            {margin < 0 ? '-' : ''}{fmtMoney(Math.abs(margin))}
                          </div>
                          {marginPct != null && (
                            <div style={{ fontSize: 11, color: margin >= 0 ? '#7ab38f' : '#e88' }}>
                              {marginPct >= 0 ? '+' : ''}{marginPct.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#ccc' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={statusBadge[vehicle.status].variant}>
                        {statusBadge[vehicle.status].label}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: vehicle.on_lot ? '#e8f5ee' : '#fdf3e0',
                        color: vehicle.on_lot ? '#2d7a4f' : '#b8860b',
                      }}>
                        {vehicle.on_lot ? 'On' : 'Off'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
          {filtered.map((vehicle) => {
            const isSold = vehicle.status === 'sold'

            return (
              <Link
                key={vehicle.id}
                href={`/inventory/${vehicle.id}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e8ebe6',
                  borderRadius: 10,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Photo or placeholder */}
                <div className="relative flex items-center justify-center" style={{ width: '100%', height: 120, minHeight: 120, maxHeight: 120, backgroundColor: '#f4f6f3', flexShrink: 0, overflow: 'hidden' }}>
                  {vehicle.photos && vehicle.photos.length > 0 ? (
                    <Image
                      src={vehicle.photos[0]}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Car style={{ width: 20, height: 20, color: '#ccc' }} />
                  )}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Badge variant={statusBadge[vehicle.status].variant}>
                      {statusBadge[vehicle.status].label}
                    </Badge>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '8px 10px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Year */}
                  {vehicle.year != null && (
                    <p style={{ fontFamily: mono, fontSize: 10, color: '#999', letterSpacing: '0.3px', marginBottom: 1 }}>
                      {vehicle.year}
                    </p>
                  )}

                  {/* Make Model */}
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>
                    {vehicle.make} {vehicle.model}
                  </p>

                  {/* Price + Mileage row */}
                  <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                    {vehicle.price != null ? (
                      <span style={{
                        fontFamily: mono,
                        fontSize: 14,
                        fontWeight: 600,
                        color: isSold ? '#bbb' : '#1a1a1a',
                        textDecoration: isSold ? 'line-through' : 'none',
                      }}>
                        ${vehicle.price.toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ fontFamily: mono, fontSize: 12, color: '#ccc' }}>—</span>
                    )}
                    {vehicle.mileage != null && (
                      <span style={{ fontFamily: mono, fontSize: 10, color: '#999' }}>
                        {vehicle.mileage.toLocaleString()} mi
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid #e8ebe6', marginTop: 6 }} />

                  {/* Footer */}
                  <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <span style={{ fontSize: 10, color: '#bbb' }}>
                      {formatDate(vehicle.created_at)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#2d7a4f' }}>
                      View →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
