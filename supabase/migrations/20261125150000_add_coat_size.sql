alter table public.children
  add column if not exists coat_size text
  check (char_length(coat_size) <= 60);
