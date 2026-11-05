import { config } from '../config.js';
import { pageHeading } from '../components/layout.js';
import { aggregateOccurrences } from '../utils/data.js';
import { metrics } from '../components/occurrences.js';
import { escapeHtml as e } from '../utils/html.js';

const dimensions = [
  ['byCategory', config.kind === 'waste' ? 'Por categoria' : 'Por recipiente'],
  ['byDistrict', 'Por bairro'],
  ['byStatus', 'Por status'],
  ['byRisk', 'Por nível de prioridade'],
  ['byMonth', 'Evolução mensal'],
];
export function dashboardPage(rows) {
  const totals = aggregateOccurrences(rows);
  return `${pageHeading(config.kind === 'waste' ? 'Indicadores da comunidade' : 'Indicadores de prevenção ambiental', 'Veja a evolução dos registros e as situações que precisam de atenção.')}${metrics(totals)}<p class="help-text">Todo o período. ${config.kind === 'waste' ? 'Registros agrupados por mês.' : 'Os indicadores representam situações ambientais registradas, não casos de dengue.'}</p><div class="charts-grid">${dimensions.map(([key, title]) => `<section class="panel chart-panel"><h2>${config.kind === 'dengue' && key === 'byRisk' ? 'Por risco ambiental estimado' : title}</h2>${totals.total ? `<div class="chart-container"><canvas id="chart-${key}" role="img" aria-label="${title}. Os mesmos dados estão na tabela abaixo."></canvas></div>` : '<p>Nenhum registro disponível para gerar o gráfico.</p>'}<table class="data-table"><caption class="sr-only">${title}</caption><thead><tr><th scope="col">Grupo</th><th scope="col">Registros</th></tr></thead><tbody>${totals[key].map(({ label, count }) => `<tr><th scope="row">${e(label)}</th><td>${count}</td></tr>`).join('') || '<tr><td colspan="2">Sem dados.</td></tr>'}</tbody></table></section>`).join('')}</div>`;
}

export async function mountCharts(rows, isActive = () => true) {
  const { Chart, registerables } = await import('chart.js');
  if (!isActive()) return () => {};
  Chart.register(...registerables);
  const data = aggregateOccurrences(rows);
  const accent = config.kind === 'waste' ? '#087A58' : '#1769DF';
  const charts = dimensions.flatMap(([key]) => {
    const canvas = document.querySelector(`#chart-${key}`);
    if (!canvas) return [];
    return [
      new Chart(canvas, {
        type: key === 'byMonth' ? 'line' : 'bar',
        data: {
          labels: data[key].map((item) => item.label),
          datasets: [
            {
              label: 'Registros',
              data: data[key].map((item) => item.count),
              backgroundColor: accent,
              borderColor: accent,
              borderWidth: 2,
              borderRadius: 4,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: '#526274' },
              grid: { color: '#e5eaf0' },
            },
            x: { ticks: { color: '#526274', font: { size: 11 } }, grid: { display: false } },
          },
        },
      }),
    ];
  });
  return () => charts.forEach((chart) => chart.destroy());
}
