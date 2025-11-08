import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserPreferences, updateUserPreferences } from '../lib/preferencesApi'
import type { UserPreferences } from '../types/preferences'

const QUERY_KEY = ['user-preferences']

export const usePreferencesQuery = () => {
  return useQuery<UserPreferences, Error>({
    queryKey: QUERY_KEY,
    queryFn: fetchUserPreferences,
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpdatePreferencesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<UserPreferences, Error, UserPreferences>({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData<UserPreferences>(QUERY_KEY, data)
    },
  })
}
