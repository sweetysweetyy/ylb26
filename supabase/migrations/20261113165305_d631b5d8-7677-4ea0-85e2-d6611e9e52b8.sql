CREATE TABLE public.sa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.sa_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  amount NUMERIC NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sa_payments TO authenticated;
GRANT ALL ON public.sa_payments TO service_role;
ALTER TABLE public.sa_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sa payments" ON public.sa_payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sa_payments_document_idx ON public.sa_payments(document_id);