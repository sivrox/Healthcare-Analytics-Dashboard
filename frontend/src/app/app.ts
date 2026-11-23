
import { Component, signal, computed, inject } from '@angular/core';
import { MetricCard } from './metric-cards/metric-cards';
import { forkJoin } from 'rxjs';
import {
  HealthcareData,
  type OperationsSummary,
  type ClinicalSummary,
  type OperationsChartData,
  type ClinicalChartData,
  type ExchangeRecord,
  type OperationsFilters,
  type ClinicalFilters,
  type Organisation,
  type ClinicalOptions
} from './services/healthcare-data';
import type { ChartConfiguration } from 'chart.js';
import { ChartPanel } from './chart-panel/chart-panel';
import { MatSelectModule } from '@angular/material/select';

/**
 * One Chart.js configuration type shared by our three chart styles.
 * The actual chart rendering happens in the reusable ChartPanel component.
 */
type DashboardChart = ChartConfiguration<
  'line' | 'bar' | 'doughnut'
>;

/**
 * Build Chart.js options consistently for all Operations and Clinical charts.
 * `horizontal` switches bar charts to horizontal bars (used by specialties).
 */
function makeChart(
  type: 'line' | 'bar' | 'doughnut',
  labels: string[],
  datasets: DashboardChart['data']['datasets'],
  horizontal = false
): DashboardChart {

  return {
    type: type,

    data: {
      labels: labels,
      datasets: datasets
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',

      plugins: {
        legend: {
          display: type !== 'bar' || datasets.length > 1,
          position: type === 'doughnut' ? 'right' : 'top',
          labels: {
            color: '#F5EEDD',
            boxWidth: 12,
            padding: 8
          }
        }
      },

      scales: type === 'doughnut' ? {} : {
        x: {
          ticks: {
            color: '#F5EEDD',
            maxTicksLimit: 8
          },
          grid: {
            color: 'rgba(245,238,221,0.12)'
          }
        },

        y: {
          beginAtZero: true,
          ticks: {
            color: '#F5EEDD',
            maxTicksLimit: 8
          },
          grid: {
            color: 'rgba(245,238,221,0.12)'
          }
        }
      }
    }
  };
}


@Component({
  selector: 'app-root',
  imports: [MetricCard, ChartPanel, MatSelectModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // ---------------------------------------------------------------------------
  // 1. UI state: active tab and visible filter panel
  // ---------------------------------------------------------------------------
  activeTab = signal('operations');
  showFilters = signal(false);

  // ---------------------------------------------------------------------------
  // 2. Filter state
  // `null` = all options, [] = no options, ['a', 'b'] = selected options.
  // The date strings ('0', '7', '30', '90') are converted to numbers for the API.
  // ---------------------------------------------------------------------------
  messageStatus = signal<string[] | null>(null);
  organisation = signal<string[] | null>(null);
  dateRange = signal('0');
  minimumVolume = signal(0);

  clinicalPeriod = signal('0');
  clinicalSpecialties = signal<string[] | null>(null);
  clinicalEncounterType = signal<string[] |null>(null);
  clinicalAgeBand = signal<string[] | null>(null);

  // Dropdown choices loaded from PostgreSQL through FastAPI.
  organisations = signal<Organisation[]>([]);

  clinicalOptions = signal<ClinicalOptions>({
    specialties: [],
    types: [],
    ages: []
  });

  // ---------------------------------------------------------------------------
  // 3. Convert filter signals to the objects the API service expects
  // ---------------------------------------------------------------------------
  getOperationsFilters(): OperationsFilters {
    return {
      status: this.messageStatus(),
      organisation_id: this.organisation(),
      days: Number(this.dateRange()),
      min_volume: this.minimumVolume()
    };
  }

  getClinicalFilters(): ClinicalFilters {
    return {
      days: Number(this.clinicalPeriod()),
      specialty: this.clinicalSpecialties(),
      encounter_type: this.clinicalEncounterType(),
      age_band: this.clinicalAgeBand()
    };
  }

  // ---------------------------------------------------------------------------
  // 4. React to user actions: selections, tabs, reset and sidebar visibility
  // ---------------------------------------------------------------------------
  changeOperationsSelection(
    filter: 'status' | 'organisation',
    selected: string[]
  ) {
    if (filter === 'status') {
      this.messageStatus.set(selected);
    } else {
      this.organisation.set(selected);
    }

    this.refreshOperations();
  }

  changeClinicalSelection(
    filter: 'specialty' | 'encounter_type' | 'age_band',
    selected: string[]
  ) {
    if (filter === 'specialty') {
      this.clinicalSpecialties.set(selected);
    } else if (filter === 'encounter_type') {
      this.clinicalEncounterType.set(selected);
    } else {
      this.clinicalAgeBand.set(selected);
    }

    this.refreshClinical();
  }

  changeTab(tab: string) {
    this.activeTab.set(tab);
  }


  resetFilters() {
    if (this.activeTab() === 'operations') {
      this.messageStatus.set(null);
      this.organisation.set(null);
      this.dateRange.set('0');
      this.minimumVolume.set(0);

      this.refreshOperations();
    } else {
      this.clinicalPeriod.set('0');
      this.clinicalSpecialties.set(null);
      this.clinicalEncounterType.set(null);
      this.clinicalAgeBand.set(null);

      this.refreshClinical();
    }
  }

  toggleFilters() {
    this.showFilters.update(open => !open);
  }


  allOrganisationIds(): string[] {
    return this.organisations().map(
      org => org.organisation_id
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Data state: returned summaries, chart datasets and exchange table rows
  // ---------------------------------------------------------------------------
  private healthcareData = inject(HealthcareData);
  operationsSummary = signal<OperationsSummary | null>(null);
  clinicalSummary = signal<ClinicalSummary | null>(null);
  operationsChartData = signal<OperationsChartData | null>(null);
  clinicalChartData = signal<ClinicalChartData | null>(null);
  exchangeRecords = signal<ExchangeRecord[]>([]);
  exchangeLoading = signal(true);
  exchangeError = signal(false);


  // ---------------------------------------------------------------------------
  // 6. Initial dropdown choices: these come from live API endpoints
  // ---------------------------------------------------------------------------
  loadOrganisations() {
    this.healthcareData.getOrganisations().subscribe({
      next: data => {
        this.organisations.set(data);
      },
      error: error => {
        console.error('Organisations failed:', error);
      }
    });
  }

  loadClinicalOptions() {
    this.healthcareData.getClinicalOptions().subscribe({
      next: data => {
        this.clinicalOptions.set(data);
      },
      error: error => {
        console.error('Clinical options failed:', error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Reload each tab from the database
  // forkJoin waits for the tab's requests and publishes a consistent result.
  // When one request fails, its existing data is left in place.
  // ---------------------------------------------------------------------------
  refreshOperations() {
    const filters = this.getOperationsFilters();

    this.exchangeLoading.set(true);
    this.exchangeError.set(false);

    forkJoin({
      summary: this.healthcareData.getOperationsSummary(filters),
      charts: this.healthcareData.getOperationsCharts(filters),
      records: this.healthcareData.getOperationsRecords(filters)
    }).subscribe({
      next: result => {
        this.operationsSummary.set(result.summary);
        this.operationsChartData.set(result.charts);
        this.exchangeRecords.set(result.records);

        this.exchangeLoading.set(false);
      },
      error: error => {
        console.error('Operations refresh failed:', error);
        this.exchangeError.set(true);
        this.exchangeLoading.set(false);
      }
    });
  }

  refreshClinical() {
    const filters = this.getClinicalFilters();

    forkJoin({
      summary: this.healthcareData.getClinicalSummary(filters),
      charts: this.healthcareData.getClinicalCharts(filters)
    }).subscribe({
      next: result => {
        this.clinicalSummary.set(result.summary);
        this.clinicalChartData.set(result.charts);
      },
      error: error => {
        console.error('Clinical refresh failed:', error);
      }
    });
  }

  // On startup, get filter choices and both dashboards' initial data.
  constructor() {
    this.loadOrganisations();
    this.loadClinicalOptions();
    this.refreshOperations();
    this.refreshClinical();
  }

  // ---------------------------------------------------------------------------
  // 8. Convert the API's numeric arrays into Chart.js display configurations
  // `computed` recalculates these only when the underlying chart data changes.
  // ---------------------------------------------------------------------------
  operationsCharts = computed(() => {

    const data = this.operationsChartData();

    if (!data) {
      return null;
    }

    const days = data.daily.map(row => row.day);

    const activity = makeChart('line', days, [
      {
        label: 'Inbound',
        data: data.daily.map(row => row.inbound),
        borderColor: '#F5EEDD',
        backgroundColor: '#F5EEDD',
        tension: 0.3
      },
      {
        label: 'Outbound',
        data: data.daily.map(row => row.outbound),
        borderColor: '#84B3CE',
        backgroundColor: '#84B3CE',
        tension: 0.3
      }
    ]);

    const status = makeChart(
      'doughnut',

      data.status.map(row => row.status),

      [{
        label: 'Messages',
        data: data.status.map(row => row.total),
        backgroundColor: data.status.map(row => {
          if (row.status.toLowerCase() === 'processed') return '#84B3CE';
          if (row.status.toLowerCase() === 'failed') return '#E98080';
          return '#F5EEDD';
        })
      }]
    );

    return {
      activity: activity,
      status: status
    };
  });

  clinicalCharts = computed(() => {

    const data = this.clinicalChartData();

    if (!data) {
      return null;
    }

    const trend = makeChart(
      'line',
      data.daily.map(row => row.day),
      [{
        label: 'Encounters',
        data: data.daily.map(row => row.total),
        borderColor: '#84B3CE',
        backgroundColor: '#84B3CE',
        tension: 0.3
      }]
    );

    const types = makeChart(
      'doughnut',
      data.types.map(row => row.name),
      [{
        label: 'Encounters',
        data: data.types.map(row => row.total),
        backgroundColor: [
          '#F5EEDD',
          '#84B3CE',
          '#E98080',
          '#B5A1D8'
        ]
      }]
    );

    const ages = makeChart(
      'bar',
      data.ages.map(row => row.name),
      [{
        label: 'Encounters',
        data: data.ages.map(row => row.total),
        backgroundColor: '#84B3CE',
        borderRadius: 6
      }]
    );

    const specialties = makeChart(
      'bar',
      data.specialties.map(row => row.name),
      [{
        label: 'Encounters',
        data: data.specialties.map(row => row.total),
        backgroundColor: '#84B3CE',
        borderRadius: 6
      }],
      true
    );

    return {
      trend: trend,
      types: types,
      ages: ages,
      specialties: specialties
    };
  });

  // ---------------------------------------------------------------------------
  // 9. Clinical heatmap: row labels, column labels, values and colour intensity
  // ---------------------------------------------------------------------------
  heatmapSpecialties = computed(() =>
    this.clinicalChartData()?.specialties.map(row => row.name) ?? []
  );

  heatmapTypes = computed(() =>
    this.clinicalChartData()?.types.map(row => row.name) ?? []
  );

  heatmapValue(specialty: string, type: string) {
    const rows = this.clinicalChartData()?.heatmap ?? [];

    const match = rows.find(row =>
      row.specialty === specialty &&
      row.encounter_type === type
    );

    return match?.total ?? 0;
  }

  heatmapMax = computed(() => {
    const rows = this.clinicalChartData()?.heatmap ?? [];

    return Math.max(1, ...rows.map(row => row.total));
  });
  
  heatmapColor(specialty: string, type: string) {
    const value = this.heatmapValue(specialty, type);
    const intensity = value / this.heatmapMax();

    return `rgba(132, 179, 206, ${0.15 + intensity * 0.75})`;
  }
}