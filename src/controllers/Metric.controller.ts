import { Request, Response } from "express";
import { db } from "../config/firebase";
import { Status } from "../models/Trails";

interface IMetrics {
  totalTrails: number;
  totalModules: number;
  totalLessons: number;
  statusCount: {
    [status in Status]: {
      trails: number;
      modules: number;
      lessons: number;
    };
  };
  averageCreationTime: {
    trails: number;
    modules: number;
    lessons: number;
  };
  averageUpdateTime: {
    trails: number;
    modules: number;
    lessons: number;
  };
}

export const getMetrics = async (_: Request, res: Response) => {
  try {
    const statusCount = {
      Concluída: { trails: 0, modules: 0, lessons: 0 },
      "Em curso": { trails: 0, modules: 0, lessons: 0 },
      Disponível: { trails: 0, modules: 0, lessons: 0 },
      Indisponível: { trails: 0, modules: 0, lessons: 0 },
      "Em construção": { trails: 0, modules: 0, lessons: 0 },
      "Em atualização": { trails: 0, modules: 0, lessons: 0 },
    };

    let totalCreationTimeTrilhas = 0;
    let totalCreationTimeModulos = 0;
    let totalCreationTimeAulas = 0;

    let totalUpdateTimeTrilhas = 0;
    let totalUpdateTimeModulos = 0;
    let totalUpdateTimeAulas = 0;

    let totalTrails = 0;
    let totalModules = 0;
    let totallessons = 0;

    const trailSnapshot = await db.collection("trails").get();
    trailSnapshot.docs.forEach((doc) => {
      const trail = doc.data();
      totalTrails += 1;
      statusCount[trail.status as Status].trails += 1;

      const creationTime =
        (new Date().getTime() - trail.createdAt.seconds * 1000) /
        (1000 * 60 * 60 * 24);
      totalCreationTimeTrilhas += creationTime;

      if (trail.updatedAt) {
        const updateTime =
          (new Date().getTime() - trail.updatedAt.seconds * 1000) /
          (1000 * 60 * 60 * 24);
        totalUpdateTimeTrilhas += updateTime;
      }
    });

    const moduleSnapshot = await db.collection("modules").get();
    moduleSnapshot.docs.forEach((doc) => {
      const module = doc.data();
      totalModules += 1;
      statusCount[module.status as Status].modules += 1;

      const creationTime =
        (new Date().getTime() - module.createdAt.seconds * 1000) /
        (1000 * 60 * 60 * 24);
      totalCreationTimeModulos += creationTime;

      if (module.updatedAt) {
        const updateTime =
          (new Date().getTime() - module.updatedAt.seconds * 1000) /
          (1000 * 60 * 60 * 24);
        totalUpdateTimeModulos += updateTime;
      }
    });

    const classSnapshot = await db.collection("lessons").get();
    classSnapshot.docs.forEach((doc) => {
      const classItem = doc.data();
      totallessons += 1;
      statusCount[classItem.status as Status].lessons += 1;

      const creationTime =
        (new Date().getTime() - classItem.createdAt.seconds * 1000) /
        (1000 * 60 * 60 * 24);
      totalCreationTimeAulas += creationTime;

      if (classItem.updatedAt) {
        const updateTime =
          (new Date().getTime() - classItem.updatedAt.seconds * 1000) /
          (1000 * 60 * 60 * 24);
        totalUpdateTimeAulas += updateTime;
      }
    });

    const averageCreationTime: IMetrics["averageCreationTime"] = {
      trails: totalTrails ? totalCreationTimeTrilhas / totalTrails : 0,
      modules: totalModules ? totalCreationTimeModulos / totalModules : 0,
      lessons: totallessons ? totalCreationTimeAulas / totallessons : 0,
    };

    const averageUpdateTime: IMetrics["averageUpdateTime"] = {
      trails: totalTrails ? totalUpdateTimeTrilhas / totalTrails : 0,
      modules: totalModules ? totalUpdateTimeModulos / totalModules : 0,
      lessons: totallessons ? totalUpdateTimeAulas / totallessons : 0,
    };

    const metrics: IMetrics = {
      totalTrails,
      totalModules,
      totalLessons: totallessons,
      statusCount,
      averageCreationTime,
      averageUpdateTime,
    };

    return res.status(200).json(metrics);
  } catch (err) {
    console.error("Erro ao calcular métricas:", err);
    return res.status(500).json({ error: "Erro ao calcular métricas" });
  }
};
