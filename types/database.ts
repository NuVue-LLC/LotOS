export type InventoryStatus = 'available' | 'recon' | 'listed' | 'under_contract' | 'sold'
export type LeadSource = 'website' | 'facebook' | 'craigslist' | 'referral' | 'walk_in' | 'phone' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment_set' | 'closed_won' | 'closed_lost'
export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'dead'
export type MessageSender = 'ai' | 'dealer' | 'buyer'
export type MessageChannel = 'sms' | 'email' | 'voice'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'

export interface Dealer {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  logo_url: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  dealer_id: string
  vin: string | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  mileage: number | null
  price: number | null
  status: InventoryStatus
  photos: string[]
  color: string | null
  description: string | null
  recon_cost: number | null
  purchase_price: number | null
  purchase_payment_method: string | null
  on_lot: boolean
  notes: string | null
  listed_at: string
  created_at: string
  updated_at: string
  days_on_lot: number | null
}

export interface Lead {
  id: string
  dealer_id: string
  name: string
  phone: string | null
  email: string | null
  vehicle_interest: string | null
  source: LeadSource
  status: LeadStatus
  temperature: LeadTemperature
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  lead_id: string
  dealer_id: string
  message: string
  sender: MessageSender
  channel: MessageChannel
  created_at: string
}

export interface Appointment {
  id: string
  lead_id: string
  dealer_id: string
  scheduled_time: string
  status: AppointmentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      dealers: {
        Row: Dealer
        Insert: Omit<Dealer, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
        Update: Partial<Omit<Dealer, 'id' | 'created_at' | 'updated_at'>>
      }
      inventory: {
        Row: InventoryItem
        Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'listed_at' | 'days_on_lot'> & {
          id?: string; created_at?: string; updated_at?: string; listed_at?: string
        }
        Update: Partial<Omit<InventoryItem, 'id' | 'dealer_id' | 'created_at' | 'updated_at' | 'days_on_lot'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Lead, 'id' | 'dealer_id' | 'created_at' | 'updated_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Conversation, 'id' | 'dealer_id' | 'created_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Appointment, 'id' | 'dealer_id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
