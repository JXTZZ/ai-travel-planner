import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearVoiceTranscripts,
  createVoiceTranscript,
  deleteVoiceTranscript,
  fetchVoiceTranscripts,
} from '../lib/voiceApi'
import type { VoiceTranscriptRecord } from '../types/voice'

const QUERY_KEY = ['voice-transcripts']

export const useVoiceTranscriptsQuery = () => {
  return useQuery<VoiceTranscriptRecord[], Error>({
    queryKey: QUERY_KEY,
    queryFn: fetchVoiceTranscripts,
    staleTime: 60 * 1000,
  })
}

export const useSaveVoiceTranscriptMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { content: string; tripId?: string | null }>({
    mutationFn: ({ content, tripId }) => createVoiceTranscript(content, { tripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export const useDeleteVoiceTranscriptMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string }>(
    {
      mutationFn: ({ id }) => deleteVoiceTranscript(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      },
    },
  )
}

export const useClearVoiceTranscriptsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error>(
    {
      mutationFn: () => clearVoiceTranscripts(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      },
    },
  )
}
