import { create } from 'zustand';
import type { Itinerary, TravelerProfile } from '../types/itinerary';
import { fetchAiItinerary } from '../features/planner/services/itinerary-service';

export type PlannerState = {
  itinerary: Itinerary | null;
  loading: boolean;
  error: string | null;
  generateItinerary: (profile: TravelerProfile) => Promise<void>;
  reset: () => void;
};

export const usePlannerStore = create<PlannerState>((set) => ({
  itinerary: null,
  loading: false,
  error: null,
  async generateItinerary(profile) {
    set({ loading: true, error: null });
    try {
      const result = await fetchAiItinerary(profile);
      set({ itinerary: result, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '生成行程时发生未知错误'
      });
    }
  },
  reset() {
    set({ itinerary: null, loading: false, error: null });
  }
}));
