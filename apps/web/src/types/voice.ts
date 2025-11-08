export interface VoiceTranscriptRecord {
  id: string
  tripId: string | null
  content: string
  transcribedAt: string
}
