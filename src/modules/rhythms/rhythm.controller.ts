import type { Request, Response } from "express";
import { db } from "../../config/firebase";
import { IRhythm } from "./rhythm.model";

export const createRhythm = async (req: Request, res: Response) => {
  try {
    const {
      name,
      frequency,
      frequencyIsRegular,
      regularityRhythm,
      origin,
      description,
      dangerous,
      rhythm,
      pattern,
      pWave,
      avRelation,
      qrs,
      intervals,
      conduction,
      responseToStimulus,
      symptoms,
      context,
      abbreviation,
    } = req.body;

    if (!name || !frequency || !origin || !rhythm || !abbreviation) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Campos obrigatórios estão faltando",
      });
    }

    const rhythmData: IRhythm = {
      name,
      frequency,
      frequencyIsRegular,
      regularityRhythm,
      origin,
      description,
      dangerous,
      rhythm,
      pattern,
      pWave,
      avRelation,
      qrs,
      intervals,
      conduction,
      responseToStimulus,
      symptoms,
      context,
      abbreviation,
    };

    const docRef = await db.collection("rhythms").add(rhythmData);

    return res.status(201).json({
      id: docRef.id,
      ...rhythmData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao criar ritmo",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const Rhythms: IRhythm[] = [
  {
    name: "Taquicardia Sinusal",
    frequency: ">100 bpm",
    frequencyIsRegular: true,
    rhythm: "regular",
    regularityRhythm: "regular",
    pattern: "constante",
    origin: "sinusal",
    description: "ritmo rápido, geralmente fisiológico",
    dangerous: false,
    pWave: "presente antes de cada QRS",
    avRelation: "1:1",
    qrs: "estreito",
    intervals: "normais ou PR encurtado",
    conduction: "normal",
    responseToStimulus: "reduz em repouso",
    symptoms: "palpitação leve",
    context: "exercício, febre, dor, ansiedade",
    abbreviation: "TS",
  },
  {
    name: "Bradicardia Sinusal",
    frequency: "<60 bpm",
    frequencyIsRegular: true,
    rhythm: "regular",
    regularityRhythm: "regular",
    pattern: "constante",
    origin: "sinusal",
    description: "ritmo lento, pode ser fisiológico ou patológico",
    dangerous: false,
    pWave: "presente antes de cada QRS",
    avRelation: "1:1",
    qrs: "estreito",
    intervals: "PR normal",
    conduction: "normal",
    responseToStimulus: "aumenta com esforço",
    symptoms: "geralmente ausentes",
    context: "atletas, sono, vagotonia",
    abbreviation: "BS",
  },
  {
    name: "Flutter Atrial",
    frequency: "250–350 bpm (atrial)",
    frequencyIsRegular: false,
    rhythm: "regular ou regularmente irregular",
    regularityRhythm: "irregular",
    pattern: "em dente de serra",
    origin: "atrial",
    description:
      "ritmo rápido e desorganizado, pode levar a complicações graves",
    dangerous: true,
    pWave: "ausente (ondas F)",
    avRelation: "2:1, 3:1 ou variável",
    qrs: "estreito",
    intervals: "RR regular ou variável",
    conduction: "bloqueio AV funcional",
    responseToStimulus: "pouca resposta",
    symptoms: "palpitação, dispneia",
    context: "cardiopatia estrutural",
    abbreviation: "FA",
  },
  {
    name: "Fibrilação Atrial",
    frequency: "variável (geralmente >100 bpm)",
    frequencyIsRegular: false,
    rhythm: "irregularmente irregular",
    regularityRhythm: "irregular",
    pattern: "caótico",
    origin: "atrial",
    description: "ritmo descoordenado e imprevisível",
    dangerous: true,
    pWave: "ausente",
    avRelation: "variável",
    qrs: "estreito",
    intervals: "RR irregular",
    conduction: "desorganizada",
    responseToStimulus: "pouca resposta",
    symptoms: "palpitação, dispneia",
    context: "idosos, cardiopatia, hipertensão",
    abbreviation: "FA",
  },
  {
    name: "Taquicardia Supraventricular",
    frequency: "150–250 bpm",
    frequencyIsRegular: true,
    rhythm: "regular",
    regularityRhythm: "regular",
    pattern: "início e término súbitos",
    origin: "supraventricular",
    description: "ritmo rápido, de início súbito",
    dangerous: false,
    pWave: "oculta ou retrógrada",
    avRelation: "1:1",
    qrs: "estreito",
    intervals: "PR curto ou invisível",
    conduction: "reentrada",
    responseToStimulus: "responde a manobras vagais",
    symptoms: "palpitação súbita",
    context: "jovens, estresse",
    abbreviation: "TSV",
  },
  {
    name: "Fibrilação Ventricular",
    frequency: "indefinida",
    frequencyIsRegular: false,
    rhythm: "caótico",
    regularityRhythm: "irregular",
    pattern: "desorganizado",
    origin: "ventricular",
    description: "parada cardíaca, ritmo extremamente grave",
    dangerous: true,
    pWave: "ausente",
    avRelation: "ausente",
    qrs: "inexistente",
    intervals: "inavaliáveis",
    conduction: "caótica",
    responseToStimulus: "nenhuma",
    symptoms: "parada cardíaca",
    context: "emergência",
    abbreviation: "FV",
  },
  {
    name: "Taquicardia Ventricular",
    frequency: "120–250 bpm",
    frequencyIsRegular: true,
    rhythm: "regular",
    regularityRhythm: "regular",
    pattern: "sustentada ou não sustentada",
    origin: "ventricular",
    description: "ritmo grave, associado a risco de morte",
    dangerous: true,
    pWave: "ausente ou dissociada",
    avRelation: "dissociação AV",
    qrs: "largo",
    intervals: "RR regular",
    conduction: "anormal",
    responseToStimulus: "não responde a manobras vagais",
    symptoms: "tontura, síncope",
    context: "infarto prévio, cardiopatia",
    abbreviation: "TV",
  },
  {
    name: "Bloqueio Atrioventricular Total",
    frequency: "atrial normal / ventricular lento",
    frequencyIsRegular: true,
    rhythm: "regular",
    regularityRhythm: "regular",
    pattern: "dissociação AV",
    origin: "atrial e ventricular independentes",
    description: "dissociação entre as aurículas e os ventrículos",
    dangerous: true,
    pWave: "presente, sem relação com QRS",
    avRelation: "dissociada",
    qrs: "estreito ou largo",
    intervals: "PR variável",
    conduction: "bloqueio completo",
    responseToStimulus: "não responde",
    symptoms: "síncope, fadiga",
    context: "doença do sistema de condução",
    abbreviation: "BAVT",
  },
];

export const createAllRhythm = async (_req: Request, res: Response) => {
  try {
    Rhythms.forEach(async (element) => {
      const rhythmData: IRhythm = { ...element };

      await db.collection("rhythms").add(rhythmData);
    });

    return res.status(201).json({ sucesso: "sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao criar ritmo",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getAllRhythms = async (_: Request, res: Response) => {
  try {
    const snapshot = await db.collection("rhythms").get();

    const rhythms: IRhythm[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as IRhythm),
    }));

    return res.status(200).json(rhythms);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao buscar ritmos",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getRhythmById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rhythmRef = db.collection("rhythms").doc(id);
    const doc = await rhythmRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ritmo não encontrado",
      });
    }

    return res.status(200).json({ id: doc.id, ...(doc.data() as IRhythm) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao buscar ritmo",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateRhythm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      frequency,
      frequencyIsRegular,
      regularityRhythm,
      origin,
      description,
      dangerous,
      rhythm,
      pattern,
      pWave,
      avRelation,
      qrs,
      intervals,
      conduction,
      responseToStimulus,
      symptoms,
      context,
      abbreviation,
    } = req.body;

    const rhythmRef = db.collection("rhythms").doc(id);
    const doc = await rhythmRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ritmo não encontrado",
      });
    }

    await rhythmRef.update({
      ...(name && { name }),
      ...(frequency && { frequency }),
      ...(frequencyIsRegular !== undefined && { frequencyIsRegular }),
      ...(regularityRhythm && { regularityRhythm }),
      ...(origin && { origin }),
      ...(description && { description }),
      ...(dangerous !== undefined && { dangerous }),
      ...(rhythm && { rhythm }),
      ...(pattern && { pattern }),
      ...(pWave && { pWave }),
      ...(avRelation && { avRelation }),
      ...(qrs && { qrs }),
      ...(intervals && { intervals }),
      ...(conduction && { conduction }),
      ...(responseToStimulus && { responseToStimulus }),
      ...(symptoms && { symptoms }),
      ...(context && { context }),
      ...(abbreviation && { abbreviation }),
      updatedAt: new Date() as any,
    });

    return res.status(200).json({ message: "Ritmo atualizado com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao atualizar ritmo",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteRhythm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rhythmRef = db.collection("rhythms").doc(id);
    const doc = await rhythmRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ritmo não encontrado",
      });
    }

    await rhythmRef.delete();

    return res.status(200).json({ message: "Ritmo excluído com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao excluir ritmo",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
