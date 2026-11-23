import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

// -----------------------------------------------------------------------------
// Data contracts: TypeScript shapes matching FastAPI JSON responses.
// These interfaces do not fetch data; they help TypeScript check our code.
// -----------------------------------------------------------------------------
export interface OperationsSummary {
  totalMessages: number;
  processed: number;
  failed: number;
  pending: number;
}

export interface ClinicalSummary {
  totalEncounters: number;
  organisations: number;
  specialties: number;
}

/**
 * Filter contract shared by every Operations endpoint.
 * For multi-select fields: null = all, [] = none, array = chosen values.
 */
export interface OperationsFilters {
  status: string[] | null;
  organisation_id: string[] | null;
  days: number;
  min_volume: number;
}

/** Filter contract shared by Clinical summaries and charts. */
export interface ClinicalFilters {
  days: number;
  specialty: string[] | null;
  encounter_type: string[] | null;
  age_band: string[] | null;
}

export interface Organisation {
  organisation_id: string;
  organisation_name: string;
}

export interface ClinicalOptions {
  specialties: string[];
  types: string[];
  ages: string[];
}

/**
 * The single place Angular uses to talk to the FastAPI backend.
 * Keep HTTP request details out of dashboard components.
 */
@Injectable({ providedIn: 'root' })
export class HealthcareData {
  private http = inject(HttpClient);
  
  // Lists for filter dropdowns (loaded from PostgreSQL, not hardcoded).
  getOrganisations() {
    return this.http.get<Organisation[]>('/api/organisations');
  }

  getClinicalOptions() {
    return this.http.get<ClinicalOptions>('/api/clinical/options');
  }

  // Every Operations request receives the same selection object.
  getOperationsSummary(filters: OperationsFilters) {
    return this.http.get<OperationsSummary>(
      '/api/operations/summary',
      { params: this.buildParams(filters) }
    );
  }

  getOperationsCharts(filters: OperationsFilters) {
    return this.http.get<OperationsChartData>(
      '/api/operations/charts',
      { params: this.buildParams(filters) }
    );
  }

  getOperationsRecords(filters: OperationsFilters) {
    return this.http.get<ExchangeRecord[]>(
      '/api/operations/records',
      { params: this.buildParams(filters) }
    );
  }

  // Every Clinical request receives the same selection object.
  getClinicalSummary(filters: ClinicalFilters) {
    return this.http.get<ClinicalSummary>(
      '/api/clinical/summary',
      { params: this.buildParams(filters) }
    );
  }

  getClinicalCharts(filters: ClinicalFilters) {
    return this.http.get<ClinicalChartData>(
      '/api/clinical/charts',
      { params: this.buildParams(filters) }
    );
  }

  /**
   * Translate filters into URL query parameters.
   * - null: omit the filter (all values are allowed)
   * - []: send __none__ (intentionally match zero records)
   * - [x, y]: repeat the parameter (?specialty=x&specialty=y)
   * - number/string: send one normal parameter
   */
  private buildParams(filters: OperationsFilters | ClinicalFilters
  ): HttpParams {

    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {

      if (Array.isArray(value)) {

        if (value.length === 0) {
          params = params.append(key, '__none__');
        } else {
          for (const item of value) {
            params = params.append(key, item);
          }
        }

      } else if (value !== null) {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}

// -----------------------------------------------------------------------------
// Chart series and recent exchange row data.
// -----------------------------------------------------------------------------
export interface DailyOperations {
  day: string;
  inbound: number;
  outbound: number;
}

export interface CategoryTotal {
  name: string;
  total: number;
}

export interface OperationsChartData {
  daily: DailyOperations[];
  status: {
    status: string;
    total: number;
  }[];
}

export interface ClinicalChartData {
  daily: {
    day: string;
    total: number;
  }[];

  types: CategoryTotal[];
  ages: CategoryTotal[];
  specialties: CategoryTotal[];

  heatmap: {
    specialty: string;
    encounter_type: string;
    total: number;
  }[];
}

export interface ExchangeRecord {
  exchange_id: string;
  date: string;
  organisation_name: string;
  direction: string;
  status: string;
  message_count: number;
}