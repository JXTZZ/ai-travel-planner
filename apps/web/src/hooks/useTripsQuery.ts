import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrips, createTrip, updateTrip, deleteTrip } from '../lib/tripApi'
import { useTripStore, type TripSummary } from '../state/useTripStore'
import type { TripInput } from '../types/trip'

const fetchTrips = async (): Promise<TripSummary[]> => {
  try {
    const trips = await getTrips()
    return trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      destination: trip.destination ?? undefined,
      startDate: trip.start_date ?? undefined,
      endDate: trip.end_date ?? undefined,
    }))
  } catch (error) {
    console.error('[useTripsQuery] Failed to fetch trips:', error)
    return []
  }
}

export const useTripsQuery = () => {
  const setTrips = useTripStore((state) => state.setTrips)

  const query = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (query.data) {
      setTrips(query.data)
    }
  }, [query.data, setTrips])

  return query
}

/**
 * Mutation hook for creating a new trip
 */
export const useCreateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TripInput) => createTrip(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

/**
 * Mutation hook for updating a trip
 */
export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TripInput> }) => 
      updateTrip(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

/**
 * Mutation hook for deleting a trip
 */
export const useDeleteTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
