import { ITrail } from "./Trails";
import { IModule } from "./Module";
import { ILesson } from "./Lesson";
import { TStatus } from "./.";

export interface IAnalyticsAdmin {
  totalTrails: number;
  totalModules: number;
  totalLessons: number;
  statusCount: Record<
    TStatus,
    {
      trails: number;
      modules: number;
      lessons: number;
    }
  >;
  averageCreationTime: {
    trails: number; // dias
    modules: number; // dias
    lessons: number; // dias
  };
  averageUpdateTime: {
    trails: number; // dias
    modules: number; // dias
    lessons: number; // dias
  };
}

export class AnalyticsAdmin implements IAnalyticsAdmin {
  totalTrails: number = 0;
  totalModules: number = 0;
  totalLessons: number = 0;
  statusCount: IAnalyticsAdmin["statusCount"] = {
    concluida: { trails: 0, modules: 0, lessons: 0 },
    em_curso: { trails: 0, modules: 0, lessons: 0 },
    disponivel: { trails: 0, modules: 0, lessons: 0 },
    indisponivel: { trails: 0, modules: 0, lessons: 0 },
    em_construcao: { trails: 0, modules: 0, lessons: 0 },
    em_atualizacao: { trails: 0, modules: 0, lessons: 0 },
    rascunho: { trails: 0, modules: 0, lessons: 0 },
  };
  averageCreationTime = { trails: 0, modules: 0, lessons: 0 };
  averageUpdateTime = { trails: 0, modules: 0, lessons: 0 };

  constructor(trails: ITrail[], modules: IModule[], lessons: ILesson[]) {
    this.totalTrails = trails.length;
    this.totalModules = modules.length;
    this.totalLessons = lessons.length;

    let totalCreationTime = { trails: 0, modules: 0, lessons: 0 };
    let totalUpdateTime = { trails: 0, modules: 0, lessons: 0 };

    trails.forEach((t) => {
      const status = t.status ?? "em_construcao";
      this.statusCount[status].trails += 1;

      const creationTime =
        (Date.now() - t.createdAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      totalCreationTime.trails += creationTime;

      if (t.updatedAt) {
        totalUpdateTime.trails +=
          (Date.now() - t.updatedAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      }
    });

    modules.forEach((m) => {
      const status = m.status ?? "em_construcao";
      this.statusCount[status].modules += 1;

      const creationTime =
        (Date.now() - m.createdAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      totalCreationTime.modules += creationTime;

      if (m.updatedAt) {
        totalUpdateTime.modules +=
          (Date.now() - m.updatedAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      }
    });

    lessons.forEach((c) => {
      const status = c.status ?? "em_construcao";
      this.statusCount[status].lessons += 1;

      const creationTime =
        (Date.now() - c.createdAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      totalCreationTime.lessons += creationTime;

      if (c.updatedAt) {
        totalUpdateTime.lessons +=
          (Date.now() - c.updatedAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      }
    });

    this.averageCreationTime = {
      trails: totalCreationTime.trails / (trails.length || 1),
      modules: totalCreationTime.modules / (modules.length || 1),
      lessons: totalCreationTime.lessons / (lessons.length || 1),
    };

    this.averageUpdateTime = {
      trails:
        totalUpdateTime.trails /
        (trails.filter((t) => t.updatedAt).length || 1),
      modules:
        totalUpdateTime.modules /
        (modules.filter((m) => m.updatedAt).length || 1),
      lessons:
        totalUpdateTime.lessons /
        (lessons.filter((c) => c.updatedAt).length || 1),
    };
  }
}

export interface IAnalyticsUser {
  userId: string;
  trailProgress: {
    trailId: string;
    completedModules: number;
    totalModules: number;
    completionPercentage: number;
    lockedModules: string[]; // módulos bloqueados por pré-requisito
  }[];
  moduleProgress: {
    moduleId: string;
    completedLessons: number;
    totalLessons: number;
    completionPercentage: number;
  }[];
}

export class AnalyticsUser implements IAnalyticsUser {
  userId: string;
  trailProgress: IAnalyticsUser["trailProgress"] = [];
  moduleProgress: IAnalyticsUser["moduleProgress"] = [];

  constructor(
    userId: string,
    trails: ITrail[],
    modules: IModule[],
    lessons: ILesson[],
    userCompletedLessons: string[], // array de class IDs concluídas pelo usuário
  ) {
    this.userId = userId;

    modules.forEach((mod) => {
      const lessonsInModule = lessons.filter((c) => c.moduleId === mod.id);
      const completed = lessonsInModule.filter((c) =>
        userCompletedLessons.includes(c.id!),
      ).length;

      this.moduleProgress.push({
        moduleId: mod.id!,
        completedLessons: completed,
        totalLessons: lessonsInModule.length,
        completionPercentage: (completed / (lessonsInModule.length || 1)) * 100,
      });
    });

    trails.forEach((trail) => {
      const trailModules = modules.filter((m) => m.trailId === trail.id);
      const completedModules = trailModules.filter(
        (m) =>
          this.moduleProgress.find((mp) => mp.moduleId === m.id)
            ?.completionPercentage === 100,
      ).length;

      const lockedModules = trailModules
        .filter((m) => {
          const prereqModules = m.prerequisiteModuleIds || [];
          return prereqModules.some(
            (id) =>
              !this.moduleProgress.find((mp) => mp.moduleId === id)
                ?.completionPercentage ||
              this.moduleProgress.find((mp) => mp.moduleId === id)!
                .completionPercentage! < 100,
          );
        })
        .map((m) => m.id!);

      this.trailProgress.push({
        trailId: trail.id!,
        completedModules,
        totalModules: trailModules.length,
        completionPercentage:
          (completedModules / (trailModules.length || 1)) * 100,
        lockedModules,
      });
    });
  }
}
