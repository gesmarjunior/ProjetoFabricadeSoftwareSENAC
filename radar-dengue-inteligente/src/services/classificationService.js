export const categoryPoints = Object.freeze({
  Pneu: 25,
  'Balde/Vaso/Recipiente': 20,
  'Caixa d’água/Reservatório': 25,
  'Lixo/Garrafa/Lata': 15,
  'Calha/Laje': 20,
  Outro: 10,
});
export const volumePoints = Object.freeze({});
const preventionGuidance =
  'Se for seguro, elimine a água parada, lave as bordas dos recipientes e mantenha reservatórios cobertos. Para locais de difícil acesso, procure o setor municipal responsável. A ferramenta não substitui equipes de saúde ou vigilância.';

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
  const classification = input.container_type;
  if (!Object.hasOwn(categoryPoints, classification))
    throw new Error('Selecione uma categoria válida para a classificação.');
  const breakdown = [
    { label: 'Água parada', points: input.standing_water ? 35 : 0 },
    { label: 'Tipo de recipiente', points: categoryPoints[classification] },
    { label: 'Área externa', points: input.outdoor_area ? 15 : 0 },
    { label: 'Reincidência', points: input.recurrent ? 25 : 0 },
  ];
  const risk_score = breakdown.reduce((sum, item) => sum + item.points, 0);
  return {
    classification,
    risk_score,
    risk_level: riskLevel(risk_score),
    guidance: preventionGuidance,
    breakdown,
  };
}

export function reviewClassification(input, category) {
  const corrected = { ...input, container_type: category };
  return { ...corrected, ...classify(corrected), classification_reviewed: true };
}

export const confirmClassification = reviewClassification;
