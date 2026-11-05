import { config } from '../config.js';
import { aggregateOccurrences } from '../utils/data.js';
import { occurrenceList, metrics } from '../components/occurrences.js';
import { icon } from '../utils/icons.js';

export function homePage(rows) {
  return `<section class="hero"><div><h1>${config.homeTitle.replace('\n', '<br />')}</h1><p>${config.homeDescription}</p><div class="button-row"><a class="button" href="#/new">${icon('plus')}Novo registro</a><a class="button secondary" href="#/map">Explorar o mapa ${icon('arrow')}</a></div><p class="hero-note">${icon('shield')}Sua participação ajuda a cuidar do bairro.</p></div><div class="hero-photo"><img src="./example-occurrence.png" alt="${config.kind === 'waste' ? 'Ilustração de resíduos descartados em uma rua' : 'Ilustração de um pneu com água parada'}" /><span>Imagem ilustrativa</span></div></section>
    <section aria-labelledby="community-heading"><div class="section-heading"><h2 id="community-heading">Um olhar para a comunidade</h2><a class="text-link" href="#/dashboard">Ver indicadores ${icon('arrow')}</a></div>${metrics(aggregateOccurrences(rows))}</section>
    <div class="home-grid"><section class="panel"><div class="panel-heading"><h2>O que acontece por perto</h2><a class="text-link" href="#/map">Abrir mapa ${icon('arrow')}</a></div><div id="home-map" class="map compact-map" aria-label="Mapa dos registros comunitários"></div><p class="map-note" data-map-status>Localizações aproximadas para proteger a privacidade.</p></section>
    <section class="panel"><div class="panel-heading"><h2>Registros recentes</h2><a class="text-link" href="#/tracking">Ver todos ${icon('arrow')}</a></div>${occurrenceList(rows.slice(0, 4), { compact: true })}</section></div>
    <section class="process"><h2>Da observação ao cuidado</h2><ol><li><span>01</span><strong>Observe e registre</strong><p>Adicione uma foto e informe o local.</p></li><li><span>02</span><strong>Confira as informações</strong><p>Revise os detalhes antes de enviar.</p></li><li><span>03</span><strong>Acompanhe e participe</strong><p>Veja as orientações e atualize o andamento.</p></li></ol></section>`;
}
