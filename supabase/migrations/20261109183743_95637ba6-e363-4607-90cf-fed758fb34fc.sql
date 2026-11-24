create table if not exists public.sv_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id uuid not null references public.sv_documents(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'transfer',
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists sv_payments_doc_idx on public.sv_payments(document_id);
grant select on public.sv_payments to authenticated;
grant all on public.sv_payments to service_role;
alter table public.sv_payments enable row level security;
drop policy if exists "sv_payments_own_select" on public.sv_payments;
create policy "sv_payments_own_select" on public.sv_payments for select to authenticated using (user_id = auth.uid());

create or replace function public.sv_register_payment(p_document_id uuid, p_amount numeric, p_date date, p_method text, p_reference text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_doc public.sv_documents; v_paid numeric;
begin
  select * into v_doc from public.sv_documents where id = p_document_id and user_id = auth.uid() for update;
  if not found then raise exception 'Facture introuvable'; end if;
  if v_doc.type <> 'invoice' or v_doc.status = 'draft' then raise exception 'Paiement possible uniquement sur une facture validée'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;
  select coalesce(sum(amount),0) into v_paid from public.sv_payments where document_id = v_doc.id;
  if v_paid + p_amount > v_doc.total_ttc + 0.001 then raise exception 'Le montant dépasse le reste à payer'; end if;
  insert into public.sv_payments(user_id, document_id, amount, payment_date, payment_method, reference)
  values (v_doc.user_id, v_doc.id, p_amount, coalesce(p_date, current_date), coalesce(p_method,'transfer'), p_reference);
  if v_paid + p_amount >= v_doc.total_ttc - 0.001 then
    update public.sv_documents set status = 'paid' where id = v_doc.id;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.sv_register_payment(uuid, numeric, date, text, text) from public, anon;
grant execute on function public.sv_register_payment(uuid, numeric, date, text, text) to authenticated;