import type { Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { LaboratoryModule } from "./laboratory.model";

const COLLECTION = "laboratory_modules";

export const getLaboratoryModulesAdmin = async (
  _req: Request,
  res: Response,
) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const modules = snapshot.docs
      .map((doc) => new LaboratoryModule({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.sequence - b.sequence)
      .map((module) => module.toObject());
    return res.status(200).json(modules);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível buscar os módulos do laboratório.",
    });
  }
};

export const createLaboratoryModule = async (req: Request, res: Response) => {
  try {
    const ref = req.body.id
      ? db.collection(COLLECTION).doc(String(req.body.id))
      : db.collection(COLLECTION).doc();
    const module = new LaboratoryModule({ ...req.body, id: ref.id });
    module.validate();
    await ref.set(module.toObject());
    return res.status(201).json(module.toObject());
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível cadastrar o módulo do laboratório.",
    });
  }
};

export const updateLaboratoryModule = async (req: Request, res: Response) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const current = await ref.get();
    if (!current.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo do laboratório não encontrado.",
      });
    }
    const module = new LaboratoryModule({
      ...current.data(),
      ...req.body,
      id: current.id,
      updatedAt: undefined,
    });
    module.validate();
    const data = {
      ...module.toObject(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(data, { merge: true });
    return res.status(200).json(module.toObject());
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível atualizar o módulo do laboratório.",
    });
  }
};

export const deleteLaboratoryModule = async (req: Request, res: Response) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const current = await ref.get();
    if (!current.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo do laboratório não encontrado.",
      });
    }
    await ref.delete();
    return res.status(200).json({
      message: "Módulo do laboratório excluído com sucesso.",
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível excluir o módulo do laboratório.",
    });
  }
};
