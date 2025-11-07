import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useTripStore, type TripSummary } from '../state/useTripStore'

const fetchTrips = async (): Promise<TripSummary[]> => {
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, destination, start_date, end_date')
    .order('created_at', { ascending: false })

  if (error) {
    // 42P01 -> relation does not exist (tables not yet migrated)
    if (error.code === '42P01') {
      console.warn('[useTripsQuery] trips table not found. Did you run migrations?')
      return []
    }
    throw error
  }

  return (data ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination ?? undefined,
    startDate: trip.start_date ?? undefined,
    endDate: trip.end_date ?? undefined,
  }))
}

export const useTripsQuery = () => {
  const setTrips = useTripStore((state) => state.setTrips)

  const query = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  })

  useEffect(() => {
    if (query.data) {
      setTrips(query.data)
    }
  }, [query.data, setTrips])

  return query
}
