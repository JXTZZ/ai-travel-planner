export type TravelPace = 'easy' | 'balanced' | 'tight'

export interface UserPreferences {
  homeCity: string
  travelPace: TravelPace
  dailyHours: number
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  homeCity: '南京',
  travelPace: 'balanced',
  dailyHours: 8,
}
