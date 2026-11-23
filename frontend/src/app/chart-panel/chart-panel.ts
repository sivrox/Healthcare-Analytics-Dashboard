import { Component, ElementRef, input, afterRenderEffect, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-panel',
  imports: [],
  templateUrl: './chart-panel.html',
  styleUrl: './chart-panel.css',
})

export class ChartPanel {
  config = input.required<
  ChartConfiguration<'line' | 'bar' | 'doughnut'>
  >();
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>(
    'chartCanvas'
  );

  constructor() {
    afterRenderEffect({
      write: (onCleanup) => {

        const element = this.canvas().nativeElement;
        const configuration = this.config();
        const chart = new Chart(element, configuration);

        onCleanup(() => {
          chart.destroy();
        });
      }
    });
  }
}
