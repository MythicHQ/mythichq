alter table public.movies
  add column if not exists worldwide_collection numeric(18, 2);

alter table public.movies
  drop constraint if exists movies_budget_currency_check;

alter table public.movies
  add constraint movies_budget_currency_check
    check (budget_currency ~ '^[A-Z]{3}$');

alter table public.movies
  drop constraint if exists movies_worldwide_collection_nonnegative_check,
  add constraint movies_worldwide_collection_nonnegative_check
    check (worldwide_collection is null or worldwide_collection >= 0) not valid;
