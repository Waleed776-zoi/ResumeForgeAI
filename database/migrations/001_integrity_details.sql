-- Migration 001 — keep the integrity check's actual findings.
--
-- Until now only the pass/fail boolean was stored, so the reasons the
-- fact-checker gave were generated and then thrown away. The results page
-- was filling that gap with `explainability.addedKeywords`, which is a
-- different (code-derived) signal — it showed a keyword diff while claiming
-- to show verification findings.
--
-- Run this in the Supabase SQL Editor BEFORE using the updated app code:
-- Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run; safe on existing rows.

alter table applications
  add column if not exists integrity_flagged_items jsonb default '[]'::jsonb;

alter table applications
  add column if not exists integrity_notes text default '';
