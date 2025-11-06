import { create } from 'zustand'

type Transcript = {
  id: string
  tripId?: string
  text: string
  createdAt: number
}

type VoiceState = {
  isRecording: boolean
  transcripts: Transcript[]
  setRecording: (value: boolean) => void
  addTranscript: (text: string, options?: { tripId?: string }) => void
  clearTranscripts: () => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isRecording: false,
  transcripts: [],
  setRecording: (value) => set({ isRecording: value }),
  addTranscript: (text, options) =>
    set((state) => ({
      transcripts: [
        {
          id: crypto.randomUUID(),
          tripId: options?.tripId,
          text,
          createdAt: Date.now(),
        },
        ...state.transcripts,
      ],
    })),
  clearTranscripts: () => set({ transcripts: [] }),
}))
