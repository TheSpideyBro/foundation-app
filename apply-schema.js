// Applies the missing tables (members, donations, expenses) + RLS policies
// + receipt trigger + storage bucket via the Supabase Management API
// (/v1/sql endpoint uses the same API keys as the project settings API).
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
create extension if not exists "uuid-ossp";

create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  address text,
  join_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table members enable row level security;

create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  method text not null check (method in ('cash', 'bkash', 'nagad', 'bank')),
  receipt_no text not null unique,
  received_by text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
alter table donations enable row level security;

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  description text,
  proof_url text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
alter table expenses enable row level security;

create policy "members_select_staff" on members for select
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "members_insert_staff" on members for insert
  with check (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "members_update_staff" on members for update
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "members_delete_staff" on members for delete
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));

create policy "donations_select_staff" on donations for select
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "donations_insert_staff" on donations for insert
  with check (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "donations_update_staff" on donations for update
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "donations_delete_staff" on donations for delete
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));

create policy "expenses_select_staff" on expenses for select
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "expenses_insert_staff" on expenses for insert
  with check (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "expenses_update_staff" on expenses for update
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "expenses_delete_staff" on expenses for delete
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));

create or replace function generate_receipt_no()
returns text as $$
declare
  seq_num integer;
begin
  select coalesce(max(cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
    into seq_num
    from donations
    where receipt_no ~ '^R-[0-9]+$';
  return 'R-' || lpad(seq_num::text, 4, '0');
end;
$$ language plpgsql security definer;

create or replace function set_receipt_no()
returns trigger as $$
begin
  if new.receipt_no is null then
    new.receipt_no := generate_receipt_no();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger donations_set_receipt_no
  before insert on donations
  for each row
  execute function set_receipt_no();

insert into storage.buckets (id, name, public)
values ('expense-proofs', 'expense-proofs', true)
on conflict (id) do nothing;

create policy "expense_proofs_staff_upload" on storage.objects for insert
  with check (
    bucket_id = 'expense-proofs'
    and exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );
create policy "expense_proofs_public_read" on storage.objects for select
  using (bucket_id = 'expense-proofs');
`;

(async () => {
  // Try the Management API SQL endpoint (base URL of the supabase project)
  const endpoints = [
    URL.replace('/supabase.co', '/supabase.com').replace(/\/$/, '') + '/v1/sql',
    'https://api.supabase.com/v1/sql',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + SRK,
          apikey: SRK,
        },
        body: JSON.stringify({ query: SQL }),
      });
      const body = await res.text();
      console.log('Endpoint:', ep, '-> status:', res.status);
      if (res.ok) {
        console.log('Schema applied successfully.');
        return;
      }
      console.log(body.slice(0, 500));
    } catch (e) {
      console.log('Endpoint:', ep, '-> error:', e.message);
    }
  }
  console.log('All endpoints failed — user must run the SQL via Supabase Dashboard > SQL Editor.');
})();
