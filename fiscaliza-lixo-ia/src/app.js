import { config } from './config.js';
import { createRepository } from './repositories/index.js';
import { createSubmission } from './services/submissionService.js';
import { layout, setActiveRoute, pageHeading } from './components/layout.js';
import { homePage } from './pages/home.js';
import { formPage, bindForm } from './pages/form.js';
import { reviewPage, bindReview } from './pages/review.js';
import { explorePage, bindExplore } from './pages/explore.js';
import { detailsPage, bindDetails } from './pages/details.js';
import { dashboardPage, mountCharts } from './pages/dashboard.js';
import {
  collectionPointsPage,
  bindCollectionPoints,
  collectionPointForm,
  bindCollectionPointForm,
} from './pages/collectionPoints.js';
import { guidancePage, aboutPage } from './pages/education.js';

/** Coordena navegação e dados; cada página mantém sua apresentação e eventos. */
export async function startApp() {
  const container = document.querySelector('#app');
  let source;
  try {
    source = createRepository();
    await source.repo.init();
  } catch {
    container.innerHTML =
      '<main id="main" class="startup-error" tabindex="-1"><h1>Não foi possível abrir o aplicativo</h1><p role="alert">Verifique sua conexão e tente novamente em instantes.</p><button class="button" id="retry-start">Tentar novamente</button></main>';
    document.querySelector('#retry-start').addEventListener('click', () => location.reload());
    return;
  }
  const draftKey = `${config.kind}-draft-v1`;
  function readDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || '{}');
    } catch {
      return {};
    }
  }
  const app = {
    ...source,
    draft: readDraft(),
    submission: createSubmission(source.repo),
    saveDraft(draft) {
      this.draft = draft;
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        this.notify(
          'Não foi possível guardar este rascunho. Mantenha a página aberta para continuar.',
        );
      }
    },
    clearDraft() {
      this.draft = {};
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        this.notify('Registro salvo.');
      }
    },
    notify(message) {
      document.querySelector('#notification').textContent = message;
      clearTimeout(this.notificationTimer);
      this.notificationTimer = setTimeout(() => {
        document.querySelector('#notification').textContent = '';
      }, 7000);
    },
  };
  container.innerHTML = layout(app.mode);
  document.documentElement.dataset.theme = config.kind;
  const main = document.querySelector('#main');
  document.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: 'start' });
  });
  const more = document.querySelector('#more-menu');
  const menu = document.querySelector('#mobile-menu');
  function closeMenu() {
    menu.hidden = true;
    more.setAttribute('aria-expanded', 'false');
  }
  more.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    more.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('a').focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      more.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !more.contains(event.target)) closeMenu();
  });
  let cleanup = () => {};
  let renderVersion = 0;
  app.render = async () => {
    const route = location.hash.replace(/^#/, '') || '/';
    if (route === 'main') {
      main.focus();
      return;
    }
    const version = ++renderVersion;
    cleanup();
    cleanup = () => {};
    closeMenu();
    setActiveRoute(route.startsWith('/details/') ? '/tracking' : route);
    main.setAttribute('aria-busy', 'true');
    main.innerHTML = '<p role="status" class="loading">Carregando os registros…</p>';
    const pending = [];
    try {
      if (
        route === '/collection-points' ||
        route === '/collection-points/new' ||
        route.startsWith('/collection-points/suggest/')
      ) {
        const points = await app.pointRepo.list();
        if (version !== renderVersion) return;
        if (route === '/collection-points') {
          main.innerHTML = collectionPointsPage(points);
          const { mountMap } = await import('./components/map.js');
          if (version !== renderVersion) return;
          const map = mountMap(document.querySelector('#collection-map'), points, {
            collection: true,
          });
          pending.push(() => map.destroy());
          pending.push(bindCollectionPoints(points, map));
        } else {
          const original = route.startsWith('/collection-points/suggest/')
            ? points.find(
                (point) =>
                  point.id === route.slice('/collection-points/suggest/'.length) &&
                  point.publication_status === 'published',
              )
            : null;
          if (route.startsWith('/collection-points/suggest/') && !original)
            throw new Error('Local não encontrado.');
          main.innerHTML = collectionPointForm(original);
          pending.push(bindCollectionPointForm(app, original));
          const { mountPointPicker } = await import('./components/map.js');
          if (version !== renderVersion) {
            pending.forEach((dispose) => dispose?.());
            return;
          }
          pending.push(
            mountPointPicker(
              document.querySelector('#point-picker'),
              (lat, lng) => {
                document.querySelector('#site-lat').value = lat.toFixed(6);
                document.querySelector('#site-lng').value = lng.toFixed(6);
                document.querySelector('#picked-location').textContent =
                  'Referência aproximada selecionada. Confira os valores antes de enviar.';
              },
              original,
            ),
          );
        }
        cleanup = () => pending.forEach((dispose) => dispose?.());
        return;
      }
      const rows = await app.repo.list();
      if (version !== renderVersion) return;
      if (route === '/') {
        main.innerHTML = homePage(rows);
        const { mountMap } = await import('./components/map.js');
        if (version !== renderVersion) return;
        const map = mountMap(document.querySelector('#home-map'), rows, { compact: true });
        pending.push(() => map.destroy());
      } else if (route === '/new') {
        main.innerHTML = formPage(app.draft);
        pending.push(bindForm(app));
      } else if (route === '/review') {
        main.innerHTML = reviewPage(app.draft);
        pending.push(bindReview(app));
      } else if (route === '/map' || route === '/tracking') {
        let mountMap;
        let map;
        if (route === '/map') {
          ({ mountMap } = await import('./components/map.js'));
          if (version !== renderVersion) return;
        }
        main.innerHTML = explorePage(rows, route === '/map');
        if (mountMap) {
          map = mountMap(document.querySelector('#occurrences-map'), rows);
          pending.push(() => map.destroy());
        }
        bindExplore(rows, map);
      } else if (route.startsWith('/details/')) {
        const id = decodeURIComponent(route.slice('/details/'.length));
        const row = await app.repo.get(id);
        const html = await detailsPage(row, app.repo);
        if (version !== renderVersion) return;
        main.innerHTML = html;
        pending.push(bindDetails(app, row));
      } else if (route === '/dashboard') {
        main.innerHTML = dashboardPage(rows);
        const dispose = await mountCharts(rows, () => version === renderVersion);
        if (version !== renderVersion) {
          dispose();
          return;
        }
        pending.push(dispose);
      } else if (route === '/guidance') {
        main.innerHTML = guidancePage(
          rows.find((row) => row.is_owner),
          app.mode,
        );
      } else if (route === '/about') {
        main.innerHTML = aboutPage(app.mode);
      } else {
        main.innerHTML = `${pageHeading('Página não encontrada', 'Este endereço não corresponde a uma tela do aplicativo.')}<a class="button" href="#/">Voltar ao início</a>`;
      }
      cleanup = () => pending.forEach((dispose) => dispose?.());
    } catch {
      pending.forEach((dispose) => dispose?.());
      if (version !== renderVersion) return;
      main.innerHTML = `${pageHeading('Não foi possível carregar os registros', 'Tente novamente para continuar.')}<p role="alert">Verifique sua conexão e tente novamente em instantes.</p><button class="button" id="retry-page">Tentar novamente</button>`;
      document.querySelector('#retry-page').addEventListener('click', app.render);
    } finally {
      if (version === renderVersion) {
        main.setAttribute('aria-busy', 'false');
        const heading = main.querySelector('h1');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
        document.title = `${heading?.textContent || 'Início'} · ${config.name}`;
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };
  window.addEventListener('hashchange', app.render);
  window.addEventListener('storage', (event) => {
    if (event.key === `${config.kind}-occurrences-v1`) app.render();
  });
  await app.render();
}
