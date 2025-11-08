// 行程相关类型定义

export interface Trip {
  id: string
  owner_id: string
  title: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
  party_size?: number
  budget_currency?: string
  budget_total?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface TripDay {
  id: string
  trip_id: string
  day_index: number
  date?: string | null
  summary?: string | null
  created_at?: string
  updated_at?: string
}

export interface TripActivity {
  id: string
  trip_id: string
  trip_day_id: string
  day_index?: number | null
  order_index?: number | null
  title: string
  location?: string | null
  start_time?: string | null
  end_time?: string | null
  category?: 'transportation' | 'accommodation' | 'dining' | 'sightseeing' | 'shopping' | 'other' | null
  estimated_cost?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface TripInput {
  title: string
  destination?: string
  start_date?: string
  end_date?: string
  party_size?: number
  budget_currency?: string
  budget_total?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface TripDayInput {
  trip_id: string
  day_index: number
  date?: string
  summary?: string
}

export interface TripActivityInput {
  trip_id: string
  trip_day_id: string
  day_index?: number
  order_index?: number
  title: string
  location?: string
  start_time?: string
  end_time?: string
  category?: 'transportation' | 'accommodation' | 'dining' | 'sightseeing' | 'shopping' | 'other'
  estimated_cost?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface TripDayWithActivities extends TripDay {
  trip_activities?: TripActivity[]
}

export interface TripWithDetails extends Trip {
  trip_days?: TripDayWithActivities[]
}

// AI 生成的行程结构
export interface AIItinerary {
  title: string
  destination: string
  startDate?: string
  endDate?: string
  partySize?: number
  budgetTotal?: number
  budgetCurrency?: string
  notes?: string
  days: AIDay[]
}

export interface AIDay {
  dayIndex: number
  date?: string
  summary: string
  activities: AIActivity[]
}

export interface AIActivity {
  title: string
  location?: string
  startTime?: string
  endTime?: string
  category?: 'transportation' | 'accommodation' | 'dining' | 'sightseeing' | 'shopping' | 'other'
  estimatedCost?: number
  notes?: string
}
