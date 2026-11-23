# Architecture and request lifecycle

## 1. Frontend

`app.ts` owns user selections, tab/sidebar state, API response signals, chart configurations and heatmap calculations. The HTML template renders the two dashboard views; `app.css` controls their layout. `metric-cards` and `chart-panel` are reusable child components (copy their original source files into the repo).

`HealthcareData` is an Angular service wrapping all HTTP requests. A single `buildParams` helper serialises query strings:

- `null` → omit that category (All)
- `[]` → send `__none__` (None)
- `[a,b]` → `?filter=a&filter=b` (select multiple)
- `days` and `min_volume` → numbers

`forkJoin` fetches each tab's summary and charts (plus recent exchanges for Operations). The response updates Angular Signals, which drive the rendered UI.

## 2. Backend

`main.py` exposes seven read-only GET endpoints. Each tab has one filtering helper and multiple aggregate queries sharing those filter conditions. Values are parameterised, not interpolated into the SQL literal. `read_query` uses `dict_row` to return JSON-ready dictionaries.

Operations count **messages** using `SUM(message_count)`; recent exchanges list **batches**. Clinical counts encounters using `COUNT(*)`. They are different measures and should not be conflated.

## 3. Time window design

The Last 7/30/90 days option is relative to the **latest date in each synthetic table**, rather than the machine clock. This keeps the educational dataset meaningful even after its collection period passes.

## 4. Request example

User selects Cardiology and Neurology → `clinicalSpecialties` Signal changes → `refreshClinical()` collects all active filters → service requests both Clinical endpoints with two `specialty` parameters → FastAPI receives `list[str]` → PostgreSQL matches `specialty = ANY(%s)` and other selected conditions → JSON updates `clinicalSummary` and `clinicalChartData` → derived chart configurations and heatmap render.

## 5. Scope and trust boundary

No authentication, patient-level details, or real-time external healthcare interoperability is implemented. The dataset is fictional. This is an analytics demonstration, not an EHR, diagnostic system or clinical decision-support service.
