const paths = {
  home: '<path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/>',
  track: '<path d="M9 5h11M9 12h11M9 19h11m-17-14 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  leaf: '<path d="M20 4C12 4 5 7 5 14c0 3 2 5 5 5 7 0 10-7 10-15ZM4 21c3-5 7-8 12-11"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M23 12h-4M12 23v-4M1 12h4"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  shield: '<path d="m12 2 8 3v6c0 7-8 11-8 11S4 18 4 11V5Z"/><path d="m8 12 3 3 5-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.info}</svg>`;
}
