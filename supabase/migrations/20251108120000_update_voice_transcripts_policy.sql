-- 调整 voice_transcripts 表的 RLS 策略，允许用户在未指定行程时保存语音记录

alter table voice_transcripts enable row level security;

drop policy if exists "Users manage their transcripts" on voice_transcripts;
drop policy if exists "Users insert their transcripts" on voice_transcripts;

drop policy if exists "Users update their transcripts" on voice_transcripts;

drop policy if exists "Users delete their transcripts" on voice_transcripts;

create policy "Users read their transcripts" on voice_transcripts
for select using (auth.uid() = user_id);

create policy "Users insert transcripts they own" on voice_transcripts
for insert with check (
  auth.uid() = user_id
  and (
    trip_id is null
    or user_can_access_trip(trip_id)
  )
);

create policy "Users update their transcripts" on voice_transcripts
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    trip_id is null
    or user_can_access_trip(trip_id)
  )
);

create policy "Users delete their transcripts" on voice_transcripts
for delete using (auth.uid() = user_id);
