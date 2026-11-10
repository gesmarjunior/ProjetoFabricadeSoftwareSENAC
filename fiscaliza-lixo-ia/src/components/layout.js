import { config } from '../config.js';
import { icon } from '../utils/icons.js';

const navigation = [
  ['/', 'Início', 'home'],
  ['/new', 'Novo registro', 'plus'],
  ['/map', 'Mapa', 'map'],
  ['/collection-points', 'Pontos de coleta', 'leaf'],
  ['/dashboard', 'Indicadores', 'chart'],
  ['/guidance', config.guidanceLabel, 'leaf'],
  ['/tracking', 'Acompanhamento', 'track'],
  ['/about', 'Sobre', 'info'],
];

export function layout(mode) {
  return `<aside class="sidebar"><a class="brand" href="#/">${icon(config.kind === 'waste' ? 'leaf' : 'target')}<span>${config.shortName}<small>Comunidade em ação</small></span></a>
    <nav aria-label="Navegação principal">${navigation.map(([path, label, name]) => `<a href="#${path}" data-route="${path}">${icon(name)}<span>${label}</span></a>`).join('')}</nav>
    <div class="sidebar-note">${icon('shield')}<p>Cuide do seu bairro.<br />Participe da mudança.</p></div></aside>
    <div class="workspace"><header class="topbar"><a class="mobile-brand" href="#/">${icon(config.kind === 'waste' ? 'leaf' : 'target')}${config.shortName}</a><span class="desktop-title">${config.subtitle}</span><a class="text-link desktop-title" href="#/about">Como funciona ${icon('arrow')}</a></header>
    ${mode === 'local' ? `<div class="mode-banner">${icon('info')}<span><strong>Demonstração</strong> · Você está usando dados de exemplo. Os registros ficam neste navegador.</span></div>` : ''}
    <main id="main" tabindex="-1" aria-busy="true"><p role="status">Carregando os registros…</p></main>
    <footer class="footer"><span>${config.name}</span><a href="#/about">Sobre e privacidade</a></footer></div>
    <nav class="bottom-nav" aria-label="Navegação rápida">${navigation
      .filter(([path]) => ['/', '/new', '/map', '/tracking'].includes(path))
      .map(
        ([path, label, name]) =>
          `<a href="#${path}" data-route="${path}">${icon(name)}<span>${label === 'Acompanhamento' ? 'Registros' : label}</span></a>`,
      )
      .join(
        '',
      )}<button type="button" id="more-menu" aria-expanded="false" aria-controls="mobile-menu">${icon('info')}<span>Mais</span></button></nav>
    <nav id="mobile-menu" class="mobile-menu" aria-label="Mais páginas" hidden>${navigation
      .filter(([path]) =>
        ['/collection-points', '/dashboard', '/guidance', '/about'].includes(path),
      )
      .map(([path, label, name]) => `<a href="#${path}">${icon(name)}${label}</a>`)
      .join('')}</nav>
    <div id="notification" class="notification" role="status" aria-live="polite"></div>`;
}

export function setActiveRoute(path) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === path) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

export function pageHeading(title, description, action = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p class="lead">${description}</p></div>${action}</div>`;
}
