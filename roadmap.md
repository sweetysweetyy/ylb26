# Roadmap

- [x] Fix and record 14 selected ownership, field-validation, Google account-link, assistant-context, and document execution findings; 56 targeted tests pass
- [ ] Remaining 27 selected findings: 7 email-recipient, 10 Odoo-destination, 3 attachment, and 6 scheduled-job findings await approval for behavior restrictions
- [ ] Selected Google Chat finding: verify provider identity before resolving user links; waiting for confirmation of the configured Google Chat verification audience

- [x] Connect the 12 read-only apps to shared automation actions with real source files and app workflows
- [x] Correct Page Weaver document generation and merge workflow actions into the shared registry without losing read actions

- [ ] Ecoflux: natural-language refinement of Laboratory ecosystem and internal-app specifications
- [ ] Ecoflux: explicit cost/time calculations, metric evidence and uncertainty
- [ ] Ecoflux: verify calculations and dialogue, preserve existing app behavior

- [x] Import ylabsplus repository as-is and make it run
- [x] Enable Lovable Database / Cloud for the project
- [x] Enable Lovable AI (LOVABLE_API_KEY)
- [x] Apply database schema migrations + create file storage (files, backgrounds, mail-attachments)
- [x] Connect external Supabase project Ylabplus5 (ref urjwrhmuewuhfuoemgkz) — schema, RLS and buckets already present; env wired
- [x] Enable email sign-in
- [ ] Google connection (Gmail/Calendar/Drive) — waiting for the user's Google credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)
- [ ] Import previous users and data — waiting for exports
- [x] Smart Teams: per-agent lab app access (toggles in agent panel, real actions via registry)
