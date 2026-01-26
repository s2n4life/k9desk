-- Allow authenticated users to report errors to the sentinel
create policy "Authenticated users can insert system logs" on system_logs
  for insert with check (auth.uid() is not null);

-- Allow public (unsigned users) to report errors (e.g. from the booking form)
create policy "Anyone can insert system logs" on system_logs
  for insert with check (true);
