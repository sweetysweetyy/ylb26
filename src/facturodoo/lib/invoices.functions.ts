import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/facturodoo/types";
import type { ExtractedInvoice, SupplierCandidate, SupplierMatch } from "./invoice-types";

const LineSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  tax_rate: z.number().nullable(),
  total: z.number().nullable(),
});
const ExtractedSchema = z.object({
  supplier: z.object({
    name: z.string(),
    vat: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    street: z.string().nullable(),
    zip: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    website: z.string().nullable(),
  }),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total: z.number().nullable(),
  payment_reference: z.string().nullable(),
  notes: z.string().nullable(),
  lines: z.array(LineSchema),
  confidence: z.number(),
});

import { analyzeInvoiceCore, searchSuppliersCore, pushInvoiceToOdooCore } from "./invoices-workflow.server";

export const analyzeInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(analyzeInvoiceCore);

export const searchSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ query: z.string().min(1) }).parse(i))
  .handler(searchSuppliersCore);

export const pushInvoiceToOdoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      invoiceId: z.string().uuid(),
      extracted: ExtractedSchema,
      partnerId: z.number().nullable(),
      createPurchaseOrder: z.boolean(),
      attachPdf: z.boolean(),
    }).parse(i),
  )
  .handler(pushInvoiceToOdooCore);
