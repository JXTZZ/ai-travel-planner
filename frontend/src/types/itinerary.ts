export type TravelPreference = '美食' | '亲子' | '文化' | '户外' | '购物' | '夜生活' | '历史' | '海岛';

export type TravelerProfile = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  preferences: TravelPreference[];
  notes?: string;
};

export type ItineraryActivity = {
  time: string;
  title: string;
  description: string;
  location?: string;
  costEstimate?: number;
  tips?: string;
};

export type ItineraryDay = {
  date: string;
  summary: string;
  activities: ItineraryActivity[];
  accommodation?: string;
  diningHighlights?: string[];
  transportationNotes?: string;
};

export type ItineraryBudget = {
  totalEstimate: number;
  breakdown: {
    category: string;
    amount: number;
  }[];
};

export type Itinerary = {
  title: string;
  intro: string;
  days: ItineraryDay[];
  budget?: ItineraryBudget;
  recommendations?: string[];
};
