import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TripSummary = {
  id: string
  title: string
  destination?: string
  startDate?: string
  endDate?: string
  budget_total?: number | null
  budget_currency?: string
}

type TripState = {
  currentTripId?: string
  trips: TripSummary[]
  setCurrentTrip: (id?: string) => void
  setTrips: (items: TripSummary[]) => void
  upsertTrip: (item: TripSummary) => void
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      currentTripId: undefined,
      trips: [],
      setCurrentTrip: (id) => set({ currentTripId: id }),
      setTrips: (items) => set({ trips: items }),
      upsertTrip: (item) =>
        set((state) => {
          const exists = state.trips.find((trip) => trip.id === item.id)
          return exists
            ? {
                trips: state.trips.map((trip) => (trip.id === item.id ? { ...trip, ...item } : trip)),
              }
            : {
                trips: [...state.trips, item],
              }
        }),
    }),
    {
      name: 'lotus-trip-store',
    },
  ),
)
