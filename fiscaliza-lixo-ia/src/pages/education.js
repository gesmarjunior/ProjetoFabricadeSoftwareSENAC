import { config } from '../config.js';
import { pageHeading } from '../components/layout.js';
import { icon } from '../utils/icons.js';
import { categoryPoints, volumePoints } from '../services/classificationService.js';
import { escapeHtml as e } from '../utils/html.js';

const disposalGuidance = [
  [
    'Entulho e poda',
    'Consulte a prefeitura sobre os pontos de entrega, os limites de volume e a coleta de galhos. Para grandes quantidades de entulho, procure um transportador autorizado.',
  ],
  [
    'Materiais recicláveis',
    'Separe papel, plástico, metal e vidro limpos e secos. Consulte os dias da coleta seletiva ou procure uma cooperativa de reciclagem.',
  ],
  [
    'Eletrônicos',
    'Entregue equipamentos, pilhas e baterias em pontos de recebimento de lojas ou fabricantes. Não desmonte baterias nem misture esses materiais ao lixo comum.',
  ],
  [
    'Pneus',
    'Mantenha os pneus cobertos até a entrega. Consulte revendedores e serviços de logística reversa sobre o recebimento.',
  ],
];

export function guidancePage(_origin, _mode = 'supabase') {
  if (config.kind === 'waste')
    return `${pageHeading('Descarte correto', 'Saiba como separar os materiais e encontrar o destino adequado.')}<section class="panel prose"><h2>Onde descartar em Itumbiara</h2><p>Consulte os ecopontos, os materiais recebidos e as condições de entrega. Você também pode sugerir novos locais e correções.</p><a class="button" href="#/collection-points">Ver ecopontos no mapa</a><p>Os ecopontos não recebem lixo doméstico comum. Utilize a coleta domiciliar regular para restos de comida e resíduos de banheiro.</p></section><div class="guidance-grid">${disposalGuidance.map(([title, text]) => `<section class="panel form-panel"><div class="feature-icon">${icon('leaf')}</div><h2>${title}</h2><p>${text}</p></section>`).join('')}</div><section class="panel prose"><h2>Antes de levar os materiais</h2><p>Confirme a entrada, o horário de funcionamento e os materiais aceitos com o serviço responsável.</p><p>Não queime resíduos nem descarte materiais em terrenos, ruas ou cursos d’água. Ao encontrar resíduos perigosos, mantenha distância e procure o serviço responsável.</p></section>`;
  return `${pageHeading('Orientação e encaminhamento', 'Ações simples ajudam a evitar condições favoráveis a um possível criadouro. Faça somente o que for seguro.')}<div class="guidance-grid">${[
    [
      'Elimine a água parada',
      'Esvazie recipientes pequenos e lave suas bordas com água e sabão. Guarde baldes e garrafas de modo que não acumulem água.',
    ],
    [
      'Mantenha recipientes cobertos',
      'Tampe reservatórios e caixas d’água. Verifique se a vedação está íntegra. Faça uma observação periódica do ambiente.',
    ],
    [
      'Dê destino correto aos materiais',
      'Mantenha pneus protegidos da chuva e encaminhe para a logística reversa. Separe e descarte o lixo conforme a coleta local.',
    ],
    [
      'Procure o setor responsável',
      'Para calhas, lajes, reservatórios altos, áreas públicas ou locais de difícil acesso, contate a prefeitura ou a vigilância ambiental do seu município.',
    ],
  ]
    .map(
      ([title, text]) =>
        `<section class="panel form-panel"><div class="feature-icon">${icon('shield')}</div><h2>${title}</h2><p>${text}</p></section>`,
    )
    .join(
      '',
    )}</div><section class="panel prose"><h2>Prevenção com segurança</h2><p>Não entre em terrenos privados, não suba em locais altos e não manipule produtos químicos ou materiais perigosos. A ferramenta não substitui equipes de saúde ou vigilância e não encaminha registros automaticamente a elas.</p><p>O risco ambiental estimado orienta a prevenção. Ele não confirma a presença de mosquito ou doença.</p><a target="_blank" rel="noopener noreferrer" href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti">Consulte as orientações do Ministério da Saúde ↗</a></section>`;
}

export function aboutPage(mode = 'supabase') {
  return `${pageHeading(
    'Sobre o aplicativo',
    'Saiba como registrar, acompanhar e cuidar do seu bairro.',
  )}
    <div class="about-grid">
      <section class="panel prose">
        <h2>Seu bairro, seu cuidado</h2>
        <p>${
          config.kind === 'waste'
            ? 'O FiscalizaLixo IA ajuda a registrar descarte irregular, visualizar os registros da comunidade e encontrar orientações para o destino de resíduos.'
            : 'O Radar da Dengue Inteligente apoia a prevenção de condições ambientais favoráveis a possíveis criadouros do Aedes aegypti.'
        }
          Desenvolvido na Fábrica de Software do SENAC.</p>
        <h2>Como acompanhar</h2>
        <p>Adicione uma foto, informe o bairro e confira as informações antes de salvar. Na página Acompanhamento, selecione “Mostrar somente meus registros” para encontrar o que você enviou e atualizar o andamento.</p>
        <details><summary>Como calculamos ${config.kind === 'waste' ? 'a prioridade' : 'o risco ambiental'}?</summary>
        <p>O resultado considera as informações que você preenche. A foto documenta a situação e não é analisada por inteligência artificial. Confira o tipo de material ou recipiente antes de salvar.</p>
        <h3>Pontuação por ${config.kind === 'waste' ? 'categoria' : 'recipiente'}</h3>
        <table class="data-table">
          <caption class="sr-only">Regras de pontuação</caption>
          <thead><tr><th scope="col">Categoria</th><th scope="col">Pontos</th></tr></thead>
          <tbody>${Object.entries(categoryPoints)
            .map(([label, points]) => `<tr><th scope="row">${e(label)}</th><td>${points}</td></tr>`)
            .join('')}</tbody>
        </table>
        <p>${
          config.kind === 'waste'
            ? `Volume: ${Object.entries(volumePoints)
                .map(([label, points]) => `${label} ${points}`)
                .join(', ')} pontos. Área sensível: 20. Reincidência: 25.`
            : 'Água parada: 35 pontos. Área externa: 15. Reincidência: 25.'
        }</p>
        <p>Baixo: 0–30 · Médio: 31–60 · Alto: 61–80 · Crítico: 81–100. O total máximo é 100.</p></details>
      </section>
      <div>
        <section class="panel prose">
          <h2>Sua privacidade importa</h2>
          <p>Não solicitamos nome, telefone, e-mail ou documento. As coordenadas são aproximadas. Não inclua dados pessoais no relato ou nas fotos.</p>
          <p>Seu relato e sua foto não aparecem para outras pessoas. No mapa, a localização é aproximada.</p>
          <p>Para acompanhar e atualizar seus registros, use este mesmo navegador. Se você apagar os dados do site ou trocar de navegador, poderá perder esse acesso.</p>
          ${mode === 'local' ? '<p>Na demonstração, os exemplos são fictícios e os registros ficam apenas neste navegador.</p>' : ''}
        </section>
        <section class="panel prose">
          <h2>Quando procurar ajuda</h2>
          <p>O registro ajuda a acompanhar a situação, mas não solicita atendimento à prefeitura. Para pedir coleta, fiscalização ou uma visita ao local, entre em contato com o serviço responsável no seu município.</p>
          <p>${
            config.kind === 'dengue'
              ? 'A ferramenta não faz diagnóstico, não identifica doença e não confirma foco de mosquito. Procure profissionais de saúde para questões de saúde.'
              : 'Não toque em materiais cortantes, tóxicos ou desconhecidos. O app não substitui a avaliação de equipes técnicas.'
          }</p>
        </section>
      </div>
    </div>`;
}
