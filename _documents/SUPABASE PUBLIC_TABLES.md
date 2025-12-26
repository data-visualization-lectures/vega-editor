# supabase public tables

## public.plans

create table public.plans (
  id text not null,
  stripe_price_id text not null,
  name text null,
  description text null,
  amount integer null,
  currency text null default 'jpy'::text,
  constraint plans_pkey primary key (id)
) TABLESPACE pg_default;


## public.profiles

create table public.profiles (
  id uuid not null,
  display_name text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;


## public.projects

create table public.projects (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  storage_path text not null,
  app_name text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  thumbnail_path text null,
  constraint projects_pkey primary key (id),
  constraint projects_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists projects_user_id_app_name_idx on public.projects using btree (user_id, app_name) TABLESPACE pg_default;

## public.subscriptions

create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  plan_id text not null default 'pro_monthly'::text,
  status public.subscription_status not null default 'none'::subscription_status,
  current_period_end timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  cancel_at_period_end boolean not null default false,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_user_id_key unique (user_id),
  constraint subscriptions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

