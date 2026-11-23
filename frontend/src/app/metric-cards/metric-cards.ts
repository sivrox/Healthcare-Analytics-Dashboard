import { Component, signal, computed, input } from '@angular/core';

@Component({
  selector: 'app-metric-cards',
  templateUrl: './metric-cards.html',
  styleUrl: './metric-cards.css',
})
export class MetricCard {
  label = input.required<string>();
  value = input.required<number>();
}
