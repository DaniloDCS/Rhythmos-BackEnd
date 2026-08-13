import type { Request, Response } from "express";
import { db } from "../config/firebase";
import { Crossword } from "../models/Crosswords";

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { word, clue, visible } = req.body;

    if (!word || !clue) {
      return res.status(400).json({ message: "Word e clue são obrigatórios" });
    }

    const question: Crossword = {
      word,
      clue,
      visible: visible ? visible : true,
      createdAt: new Date() as any,
    };

    const docRef = await db.collection("questions").add(question);

    return res.status(201).json({
      id: docRef.id,
      ...question,
    });
  } catch {
    return res.status(500).json({ error: "Erro ao criar questão" });
  }
};

export const getAllQuestions = async (_: Request, res: Response) => {
  try {
    const snapshot = await db.collection("questions").get();

    const questions: Crossword[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Crossword),
    }));

    return res.status(200).json(questions);
  } catch {
    return res.status(500).json({ error: "Erro ao buscar questões" });
  }
};

export const getVisibleQuestions = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection("questions")
      .where("visible", "==", true)
      .get();

    const questions: Crossword[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Crossword),
    }));

    return res.status(200).json(questions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar questões visíveis" });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { word, clue, visible } = req.body;

    if (!word && !clue) {
      return res
        .status(400)
        .json({ message: "Informe ao menos um campo para atualizar" });
    }

    const questionRef = db.collection("questions").doc(id);

    const doc = await questionRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Questão não encontrada" });
    }

    await questionRef.update({
      ...(word && { word }),
      ...(clue && { clue }),
      ...(clue && { visible }),
      updatedAt: new Date() as any,
    });

    return res.status(200).json({ message: "Questão atualizada com sucesso" });
  } catch {
    return res.status(500).json({ error: "Erro ao atualizar questão" });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const questionRef = db.collection("questions").doc(id);
    const doc = await questionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Questão não encontrada" });
    }

    await questionRef.delete();

    return res.status(200).json({ message: "Questão excluída com sucesso" });
  } catch {
    return res.status(500).json({ error: "Erro ao excluir questão" });
  }
};
