import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { escapeHtml as e } from '../utils/html.js';
import { hasFacilityCoordinates, facilityMapUrl } from '../services/healthFacilityService.js';

const icon = () =>
  L.divIcon({
    className: 'map-marker',
    html: '<span style="background:#1769df"><b>S</b></span>',
    iconSize: [32, 40],
    iconAnchor: [16, 36],
  });
function baseMap(element) {
  const map = L.map(element, { scrollWheelZoom: false }).setView([-18.42, -49.22], 12);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  tiles.on('tileerror', () => {
    const hint = element.parentElement.querySelector('[data-map-status]');
    if (hint)
      hint.textContent =
        'O mapa-base está indisponível. Os marcadores e a lista continuam disponíveis.';
  });
  element
    .querySelectorAll('.leaflet-control-zoom a')
    .forEach((control) =>
      control.setAttribute(
        'aria-label',
        control.classList.contains('leaflet-control-zoom-in') ? 'Ampliar mapa' : 'Reduzir mapa',
      ),
    );
  return map;
}

/** Pontos aproximados compartilhados permanecem agrupados e podem ser expandidos. */
export function mountHealthMap(element, rows) {
  const map = baseMap(element),
    layer = L.markerClusterGroup({
      showCoverageOnHover: false,
      animate: false,
      spiderfyOnMaxZoom: true,
    });
  map.addLayer(layer);
  let frame;
  let disposed = false;
  function update(nextRows) {
    if (disposed) return;
    layer.clearLayers();
    const positions = [];
    for (const row of nextRows) {
      if (!hasFacilityCoordinates(row)) continue;
      const position = [Number(row.latitude), Number(row.longitude)];
      positions.push(position);
      const marker = L.marker(position, {
        icon: icon(),
        title: `${row.name} — ${row.location_precision === 'confirmed' ? 'Localização confirmada' : 'Referência aproximada'}`,
        alt: `Serviço de saúde: ${row.name}`,
      });
      marker.bindPopup(
        `<strong>${e(row.name)}</strong><p>${e(row.facility_type)} · ${e(row.address)}</p><p>${row.location_precision === 'confirmed' ? 'Localização confirmada.' : 'Referência aproximada; confirme a entrada.'}</p><p>Confirme serviços, vacinação e horários com a unidade.</p><a target="_blank" rel="noopener noreferrer" href="${e(facilityMapUrl(row))}">Consultar endereço ↗</a>`,
      );
      layer.addLayer(marker);
    }
    if (positions.length)
      map.fitBounds(L.latLngBounds(positions).pad(0.2), { maxZoom: 14, animate: false });
    else map.setView([-18.42, -49.22], 12, { animate: false });
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!disposed) map.invalidateSize();
    });
  }
  update(rows);
  return {
    update,
    destroy() {
      if (disposed) return;
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      map.stop();
      map.remove();
    },
  };
}

/** Ícone vetorial explícito: dispensa imagens de marcador em caminhos dependentes da hospedagem. */
export function mountHealthPicker(element, onPick, initial = null) {
  const map = baseMap(element);
  let marker;
  if (initial && hasFacilityCoordinates(initial)) {
    const position = [Number(initial.latitude), Number(initial.longitude)];
    marker = L.marker(position, { icon: icon(), title: 'Referência aproximada da unidade' }).addTo(
      map,
    );
    map.setView(position, 14);
  }
  map.on('click', ({ latlng }) => {
    if (marker) marker.setLatLng(latlng);
    else
      marker = L.marker(latlng, { icon: icon(), title: 'Referência aproximada da unidade' }).addTo(
        map,
      );
    onPick(latlng.lat, latlng.lng);
  });
  return () => {
    map.stop();
    map.remove();
  };
}
