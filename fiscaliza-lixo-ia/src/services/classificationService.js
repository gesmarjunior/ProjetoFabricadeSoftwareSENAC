export const categoryPoints = Object.freeze({
  Entulho: 25,
  'Lixo doméstico': 20,
  Reciclável: 10,
  Eletrônico: 30,
  'Poda/Galhos': 15,
  Pneu: 30,
  Outro: 10,
});
export const volumePoints = Object.freeze({ Pequeno: 5, Médio: 15, Grande: 25 });

const wasteGuidance = {
  Entulho:
    'Procure um ecoponto ou serviço autorizado para resíduos de construção. Não misture com lixo doméstico.',
  'Lixo doméstico': 'Mantenha os resíduos ensacados e siga os dias e horários da coleta municipal.',
  Reciclável: 'Separe materiais limpos e secos e procure a coleta seletiva.',
  Eletrônico: 'Entregue equipamentos em um ponto de logística reversa. Não desmonte baterias.',
  'Poda/Galhos': 'Consulte a coleta de poda do município. Não queime os materiais.',
  Pneu: 'Entregue pneus a revendedores ou pontos de logística reversa e mantenha-os cobertos.',
  Outro: 'Consulte o serviço municipal de limpeza para identificar o destino adequado.',
};

/** As faixas são didáticas e não representam probabilidade de doença. */
export function riskLevel(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100)
    throw new RangeError('A pontuação deve estar entre 0 e 100.');
  if (score <= 30) return 'Baixo';
  if (score <= 60) return 'Médio';
  if (score <= 80) return 'Alto';
  return 'Crítico';
}

/** Serviço substituível: usa somente os campos informados, nunca interpreta a foto. */
export function classify(input) {
  const classification = input.category;
  if (!Object.hasOwn(categoryPoints, classification))
    throw new Error('Selecione uma categoria válida para a classificação.');
  const breakdown = [
    { label: 'Categoria', points: categoryPoints[classification] },
    { label: 'Volume', points: volumePoints[input.volume] },
    { label: 'Área sensível próxima', points: input.sensitive_area ? 20 : 0 },
    { label: 'Reincidência', points: input.recurrent ? 25 : 0 },
  ];
  if (breakdown.some(({ points }) => !Number.isFinite(points)))
    throw new Error('Selecione um volume válido.');
  const risk_score = breakdown.reduce((sum, item) => sum + item.points, 0);
  return {
    classification,
    risk_score,
    risk_level: riskLevel(risk_score),
    guidance: wasteGuidance[classification],
    breakdown,
  };
}

export function reviewClassification(input, category) {
  const corrected = { ...input, category };
  return { ...corrected, ...classify(corrected), classification_reviewed: true };
}

export const confirmClassification = reviewClassification;
