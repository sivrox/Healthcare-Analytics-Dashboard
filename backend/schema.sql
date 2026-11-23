-- Synthetic demo data schema. For use with the provided CSV files only.
-- Run against a fresh database named healthcare_db.
CREATE TABLE IF NOT EXISTS organisations (
  organisation_id TEXT PRIMARY KEY,
  organisation_name TEXT NOT NULL,
  organisation_type TEXT,
  region TEXT
);

CREATE TABLE IF NOT EXISTS operations_exchanges (
  exchange_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  organisation_id TEXT NOT NULL REFERENCES organisations(organisation_id),
  organisation_name TEXT NOT NULL,
  direction TEXT NOT NULL,
  message_type TEXT,
  status TEXT NOT NULL,
  message_count INTEGER NOT NULL,
  processing_seconds NUMERIC,
  channel TEXT
);

CREATE TABLE IF NOT EXISTS clinical_encounters (
  encounter_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  organisation_id TEXT NOT NULL REFERENCES organisations(organisation_id),
  organisation_name TEXT NOT NULL,
  age_band TEXT NOT NULL,
  specialty TEXT NOT NULL,
  encounter_type TEXT NOT NULL,
  clinical_category TEXT,
  outcome TEXT,
  length_of_stay_days INTEGER
);
