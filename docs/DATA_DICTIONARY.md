# Synthetic dataset dictionary

These column lists are based on the available implementation and originally generated practice CSV schema. Verify imported table definitions before publishing sample SQL or a schema migration.

## `organisations`

| Column | Meaning |
|---|---|
| `organisation_id` | Synthetic organisation identifier, used for filtering |
| `organisation_name` | Synthetic hospital or clinic name |

## `operations_exchanges`

| Column | Meaning |
|---|---|
| `exchange_id` | Exchange **batch** identifier |
| `date` | Batch date |
| `organisation_id`, `organisation_name` | Owning organisation |
| `direction` | Inbound or Outbound |
| `message_type` | Synthetic message category |
| `status` | Processed, Failed or Pending |
| `message_count` | **Number of messages in the batch**, not an individual row count |
| `processing_seconds` | Processing time for the batch |
| `channel` | Synthetic exchange channel |

## `clinical_encounters`

| Column | Meaning |
|---|---|
| `encounter_id` | Synthetic encounter identifier |
| `date` | Encounter date |
| `organisation_id`, `organisation_name` | Related organisation |
| `age_band` | Grouped age range; not an exact patient birth date |
| `specialty` | Clinical service specialty |
| `encounter_type` | Inpatient, Outpatient, etc. |
| `clinical_category` | Synthetic clinical classification |
| `outcome` | Synthetic encounter outcome |
| `length_of_stay_days` | Duration in days |

## Important metric definitions

- Operations **Total Messages** = SUM of `message_count` across matching batches.
- Operations Processed/Failed/Pending = SUM of `message_count` per status.
- Clinical **Total Encounters** = COUNT of matching encounter rows.
- Clinical **Organisations** = COUNT of distinct matching `organisation_id` values.
- Clinical **Specialties** = COUNT of distinct matching specialty values.
- Date filters use each table's latest available date as the reference point.
