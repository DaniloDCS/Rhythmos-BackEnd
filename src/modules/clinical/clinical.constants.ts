import type { IClinicalCaseStep } from "./clinical.types";

export const DEFAULT_CLINICAL_ANALYSIS_STEPS: IClinicalCaseStep[] = [
  {
    id: "calibration",
    order: 1,
    label: "Velocidade e calibração",
    description:
      "Confira a padronização do exame antes de interpretar o traçado.",
    placeholder: "Ex.: 25 mm/s e 10 mm/mV",
  },
  {
    id: "rhythm",
    order: 2,
    label: "Ritmo",
    description: "Descreva a regularidade e a organização do ritmo observado.",
    placeholder: "Descreva o ritmo...",
  },
  {
    id: "heart-rate",
    order: 3,
    label: "Frequência cardíaca",
    description: "Informe a frequência estimada no traçado.",
    placeholder: "Ex.: 78 bpm",
  },
  {
    id: "p-wave",
    order: 4,
    label: "Onda P",
    description: "Observe presença, morfologia e relação com os complexos QRS.",
    placeholder: "Descreva a onda P...",
  },
  {
    id: "pr-interval",
    order: 5,
    label: "Intervalo PR",
    description: "Avalie duração e constância do intervalo PR.",
    placeholder: "Descreva o intervalo PR...",
  },
  {
    id: "qrs",
    order: 6,
    label: "Complexo QRS",
    description: "Avalie duração, largura e morfologia dos complexos.",
    placeholder: "Descreva o QRS...",
  },
  {
    id: "axis",
    order: 7,
    label: "Eixo elétrico",
    description: "Registre sua avaliação do eixo quando aplicável ao caso.",
    placeholder: "Descreva o eixo...",
  },
  {
    id: "st-segment",
    order: 8,
    label: "Segmento ST",
    description: "Procure elevação, depressão ou outras alterações relevantes.",
    placeholder: "Descreva o segmento ST...",
  },
  {
    id: "t-wave",
    order: 9,
    label: "Onda T",
    description: "Avalie polaridade, amplitude e alterações de morfologia.",
    placeholder: "Descreva a onda T...",
  },
  {
    id: "qt-qtc",
    order: 10,
    label: "Intervalo QT / QTc",
    description:
      "Registre a avaliação do intervalo QT e, quando necessário, QTc.",
    placeholder: "Descreva QT/QTc...",
  },
];
