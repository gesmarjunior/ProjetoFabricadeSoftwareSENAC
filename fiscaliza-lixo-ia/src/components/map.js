import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { escapeHtml as e } from '../utils/html.js';
import { hasPointCoordinates, pointMapUrl } from '../services/collectionPointService.js';

/** Leaflet mantém controles de teclado e a atribuição OpenStreetMap. */
export function mountMap(element, rows, { compact = false, collection = false } = {}) {
  const map = L.map(element, { scrollWheelZoom: false, zoomControl: true }).setView(
    collection ? [-18.42, -49.22] : [-16.68, -49.26],
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
      if (collection && !hasPointCoordinates(row)) return;
      const position = [Number(row.latitude), Number(row.longitude)];
      if (!position.every(Number.isFinite)) return;
      points.push(position);
      const color = collection
        ? '#087A58'
        : { Baixo: '#087A58', Médio: '#8a5b00', Alto: '#b64a14', Crítico: '#ad2634' }[
            row.risk_level
          ];
      const marker = L.marker(position, {
        icon: L.divIcon({
          className: 'map-marker',
          html: `<span style="background:${color}"><b>${collection ? 'C' : e(row.risk_level.slice(0, 1))}</b></span>`,
          iconSize: [32, 40],
          iconAnchor: [16, 36],
        }),
        title: collection
          ? `${row.name} — ${row.location_precision === 'confirmed' ? 'Localização confirmada' : 'Referência aproximada; confirme a entrada'}`
          : `${row.classification}, ${row.district}, ${row.risk_level}`,
        alt: collection
          ? `Local de coleta: ${row.name}`
          : `Registro de ${row.classification} com nível ${row.risk_level}`,
      });
      marker.bindPopup(
        collection
          ? `<strong>${e(row.name)}</strong><p>${e(row.site_type)} · ${e(row.address)}</p><p>${row.location_precision === 'confirmed' ? 'Localização confirmada.' : 'Referência aproximada; confirme a entrada antes de ir.'}</p><p>Aceita: ${e(row.accepted_materials.join(', '))}.</p><a href="${e(pointMapUrl(row))}" target="_blank" rel="noopener noreferrer">Consultar endereço ↗</a>`
          : `<strong>${e(row.classification)}</strong><p>${e(row.district)} · ${e(row.risk_level)}</p><a href="#/details/${encodeURIComponent(row.id)}">Ver detalhes do registro</a>`,
      );
      layer.addLayer(marker);
    });
    if (points.length)
      map.fitBounds(L.latLngBounds(points).pad(compact ? 0.3 : 0.2), {
        maxZoom: 14,
        animate: false,
      });
    if (!points.length && collection) map.setView([-18.42, -49.22], 12, { animate: false });
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

/** Os campos numéricos oferecem uma alternativa à seleção com o mouse. */
export function mountPointPicker(element, onPick, initial = null) {
  const map = L.map(element, { scrollWheelZoom: false }).setView([-18.42, -49.22], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  // O ícone vetorial evita a autodetecção de PNGs do Leaflet, que falha em builds sob subcaminhos.
  const markerOptions = {
    icon: L.divIcon({
      className: 'map-marker',
      html: '<span style="background:#087A58"><b>C</b></span>',
      iconSize: [32, 40],
      iconAnchor: [16, 36],
    }),
    title: 'Referência aproximada do local de coleta',
    alt: 'Referência do local de coleta',
  };
  let marker;
  if (initial && hasPointCoordinates(initial)) {
    const position = [Number(initial.latitude), Number(initial.longitude)];
    marker = L.marker(position, markerOptions).addTo(map);
    map.setView(position, 14);
  }
  map.on('click', ({ latlng }) => {
    if (marker) marker.setLatLng(latlng);
    else marker = L.marker(latlng, markerOptions).addTo(map);
    onPick(latlng.lat, latlng.lng);
  });
  return () => {
    map.stop();
    map.remove();
  };
}
