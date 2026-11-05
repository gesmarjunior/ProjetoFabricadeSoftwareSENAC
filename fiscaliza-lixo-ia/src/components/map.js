import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { escapeHtml as e } from '../utils/html.js';

/** Leaflet mantém controles de teclado e a atribuição OpenStreetMap. */
export function mountMap(element, rows, { compact = false } = {}) {
  const map = L.map(element, { scrollWheelZoom: false, zoomControl: true }).setView(
    [-16.68, -49.26],
    13,
  );
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const hint = element.parentElement.querySelector('[data-map-status]');
  tiles.on('tileerror', () => {
    if (hint)
      hint.textContent =
        'O mapa-base está indisponível. Os marcadores e a lista continuam disponíveis; verifique sua conexão.';
  });
  const layer = L.markerClusterGroup({
    disableClusteringAtZoom: 16,
    showCoverageOnHover: false,
    animate: false,
  });
  map.addLayer(layer);
  let resizeFrame;
  let disposed = false;
  function update(nextRows) {
    if (disposed) return;
    layer.clearLayers();
    const points = [];
    nextRows.forEach((row) => {
      const position = [Number(row.latitude), Number(row.longitude)];
      if (!position.every(Number.isFinite)) return;
      points.push(position);
      const color = { Baixo: '#087A58', Médio: '#8a5b00', Alto: '#b64a14', Crítico: '#ad2634' }[
        row.risk_level
      ];
      const marker = L.marker(position, {
        icon: L.divIcon({
          className: 'map-marker',
          html: `<span style="background:${color}"><b>${e(row.risk_level.slice(0, 1))}</b></span>`,
          iconSize: [32, 40],
          iconAnchor: [16, 36],
        }),
        title: `${row.classification}, ${row.district}, ${row.risk_level}`,
        alt: `Registro de ${row.classification} com nível ${row.risk_level}`,
      });
      marker.bindPopup(
        `<strong>${e(row.classification)}</strong><p>${e(row.district)} · ${e(row.risk_level)}</p><a href="#/details/${encodeURIComponent(row.id)}">Ver detalhes do registro</a>`,
      );
      layer.addLayer(marker);
    });
    if (points.length)
      map.fitBounds(L.latLngBounds(points).pad(compact ? 0.3 : 0.2), {
        maxZoom: 14,
        animate: false,
      });
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = undefined;
      if (!disposed) map.invalidateSize();
    });
  }
  update(rows);
  element
    .querySelectorAll('.leaflet-control-zoom a')
    .forEach((control) =>
      control.setAttribute(
        'aria-label',
        control.classList.contains('leaflet-control-zoom-in') ? 'Ampliar mapa' : 'Reduzir mapa',
      ),
    );
  return {
    update,
    destroy() {
      if (disposed) return;
      disposed = true;
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      map.remove();
    },
  };
}
