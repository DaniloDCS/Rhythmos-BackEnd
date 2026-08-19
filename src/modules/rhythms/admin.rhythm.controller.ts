import type { Request, Response } from "express";

import { db } from "../../config/firebase";

import { IRhythm } from "./rhythm.model";
import { Rhythms } from "./rhythm.controller";

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
