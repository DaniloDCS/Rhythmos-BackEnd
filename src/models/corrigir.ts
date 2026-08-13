type Status =
  | "Disponível"
  | "Indisponível"
  | "Em curso"
  | "Em construção"
  | "Em atualização"
  | "Em breve";
type Difficulty = "Fácil" | "Intermediário" | "Avançado";

interface IUserScore {
  classId: string;
  score: number;
}

class UserTrailProgress {
  userId: string;
  trailId: string;
  progress: number = 0; // % concluído
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  timeSpent: number = 0; // minutos
  modulesCompleted: number = 0;
  lessonsCompleted: number = 0;
  scores: IUserScore[] = [];

  constructor(userId: string, trailId: string) {
    this.userId = userId;
    this.trailId = trailId;
    this.startedAt = new Date();
    this.lastAccessedAt = new Date();
  }

  updateProgress(progress: number) {
    this.progress = Math.min(100, Math.max(0, progress));
    this.lastAccessedAt = new Date();
    if (this.progress >= 100 && !this.completedAt) {
      this.completedAt = new Date();
    }
  }

  addTime(minutes: number) {
    this.timeSpent += minutes;
    this.lastAccessedAt = new Date();
  }

  completeModule() {
    this.modulesCompleted += 1;
  }

  completeClass() {
    this.lessonsCompleted += 1;
  }

  addScore(classId: string, score: number) {
    this.scores.push({ classId, score });
  }
}

class ClassUnit {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  content: string;
  status: Status;
  duration: number;
  videoUrl?: string;
  resources?: string[];
  createdAt: Date;
  updatedAt: Date;
  classOrder: number;
  quiz?: { id: string; maxScore: number };
  completionRate: number = 0;

  constructor(
    id: string,
    moduleId: string,
    title: string,
    description: string,
    content: string,
    duration: number,
    classOrder: number,
    status: Status = "Em construção",
  ) {
    this.id = id;
    this.moduleId = moduleId;
    this.title = title;
    this.description = description;
    this.content = content;
    this.duration = duration;
    this.classOrder = classOrder;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(status: Status) {
    this.status = status;
    this.updatedAt = new Date();
  }

  incrementCompletionRate() {
    this.completionRate += 1;
  }
}

class ModuleUnit {
  id: string;
  trailId: string;
  title: string;
  description: string;
  status: Status;
  progress: number = 0; // % médio de usuários
  duration: number = 0;
  quantityLessons: number = 0;
  difficulty: Difficulty;
  createdAt: Date;
  updatedAt: Date;
  moduleOrder: number;
  lessons: ClassUnit[] = [];
  quizAvailable: boolean = false;

  constructor(
    id: string,
    trailId: string,
    title: string,
    description: string,
    difficulty: Difficulty,
    moduleOrder: number,
    status: Status = "Em construção",
  ) {
    this.id = id;
    this.trailId = trailId;
    this.title = title;
    this.description = description;
    this.difficulty = difficulty;
    this.moduleOrder = moduleOrder;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addClass(classUnit: ClassUnit) {
    this.lessons.push(classUnit);
    this.quantityLessons = this.lessons.length;
    this.duration = this.lessons.reduce((acc, c) => acc + c.duration, 0);
    this.updatedAt = new Date();
  }

  updateStatus(status: Status) {
    this.status = status;
    this.updatedAt = new Date();
  }

  calculateProgress(): number {
    if (this.lessons.length === 0) return 0;
    const totalCompletion = this.lessons.reduce(
      (acc, c) => acc + c.completionRate,
      0,
    );
    this.progress = totalCompletion / this.lessons.length;
    return this.progress;
  }
}

class Trail {
  id: string;
  title: string;
  description: string;
  status: Status;
  progress: number = 0;
  duration: number = 0;
  quantityModules: number = 0;
  quantityLessons: number = 0;
  difficulty: Difficulty;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  enrolledUsers: number = 0;
  averageCompletionRate: number = 0;
  popularityScore: number = 0;
  prerequisites?: string[];
  modules: ModuleUnit[] = [];

  constructor(
    id: string,
    title: string,
    description: string,
    difficulty: Difficulty,
    tags: string[] = [],
    status: Status = "Em construção",
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.difficulty = difficulty;
    this.tags = tags;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addModule(module: ModuleUnit) {
    this.modules.push(module);
    this.quantityModules = this.modules.length;
    this.quantityLessons = this.modules.reduce(
      (acc, m) => acc + m.quantityLessons,
      0,
    );
    this.duration = this.modules.reduce((acc, m) => acc + m.duration, 0);
    this.updatedAt = new Date();
  }

  calculateProgress(): number {
    if (this.modules.length === 0) return 0;
    const totalProgress = this.modules.reduce(
      (acc, m) => acc + m.calculateProgress(),
      0,
    );
    this.progress = totalProgress / this.modules.length;
    return this.progress;
  }

  updateStatus(status: Status) {
    this.status = status;
    this.updatedAt = new Date();
  }
}

class AdminAnalytics {
  trail: Trail;

  constructor(trail: Trail) {
    this.trail = trail;
  }

  getModuleStats() {
    return this.trail.modules.map((m) => ({
      moduleId: m.id,
      averageProgress: m.progress,
      completionRate: m.lessons.length
        ? m.lessons.reduce((acc, c) => acc + c.completionRate, 0) /
          m.lessons.length
        : 0,
      mostDifficultClassId: m.lessons.reduce((prev, curr) =>
        curr.completionRate < prev.completionRate ? curr : prev,
      )?.id,
    }));
  }

  getEngagementMetrics(usersProgress: UserTrailProgress[]) {
    const totalUsers = usersProgress.length;
    const averageProgress =
      usersProgress.reduce((acc, u) => acc + u.progress, 0) / (totalUsers || 1);
    const averageTimeSpent =
      usersProgress.reduce((acc, u) => acc + u.timeSpent, 0) /
      (totalUsers || 1);

    return {
      totalUsers,
      averageProgress,
      averageTimeSpent,
    };
  }
}

class AdvancedTrail extends Trail {
  userProgress: UserTrailProgress[] = []; // todos os usuários inscritos

  // Registrar ou atualizar progresso de um usuário
  updateUserProgress(
    userId: string,
    moduleId: string,
    classId: string,
    progressIncrement: number,
    timeSpent: number,
    score?: number,
  ) {
    let user = this.userProgress.find((u) => u.userId === userId);
    if (!user) {
      user = new UserTrailProgress(userId, this.id);
      this.userProgress.push(user);
    }

    user.addTime(timeSpent);
    user.updateProgress(user.progress + progressIncrement);
    user.completeClass();
    const module = this.modules.find((m) => m.id === moduleId);
    if (module) {
      const classUnit = module.lessons.find((c) => c.id === classId);
      if (classUnit) {
        classUnit.incrementCompletionRate();
      }
      user.completeModule(); // opcional: só se o módulo completo
      module.calculateProgress();
    }
    this.calculateProgress();
    if (score !== undefined) {
      user.addScore(classId, score);
    }
  }

  // Usuários mais ativos por progresso
  getTopActiveUsers(top: number = 5) {
    return [...this.userProgress]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, top)
      .map((u) => ({ userId: u.userId, progress: u.progress }));
  }

  // Estatísticas agregadas para o dashboard
  getAnalytics() {
    const totalUsers = this.userProgress.length;
    const averageProgress =
      totalUsers > 0
        ? this.userProgress.reduce((acc, u) => acc + u.progress, 0) / totalUsers
        : 0;

    const averageTimeSpent =
      totalUsers > 0
        ? this.userProgress.reduce((acc, u) => acc + u.timeSpent, 0) /
          totalUsers
        : 0;

    const moduleStats = this.modules.map((m) => ({
      moduleId: m.id,
      averageProgress: m.progress,
      completionRate:
        m.lessons.length > 0
          ? m.lessons.reduce((acc, c) => acc + c.completionRate, 0) /
            m.lessons.length
          : 0,
      mostDifficultClassId: m.lessons.reduce((prev, curr) =>
        curr.completionRate < prev.completionRate ? curr : prev,
      )?.id,
    }));

    const dailyActiveUsers = this.getActiveUsers("daily");
    const weeklyActiveUsers = this.getActiveUsers("weekly");
    const monthlyActiveUsers = this.getActiveUsers("monthly");

    return {
      totalUsers,
      averageProgress,
      averageTimeSpent,
      moduleStats,
      topUsers: this.getTopActiveUsers(),
      engagement: {
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
      },
    };
  }

  // Simulação de usuários ativos (pode integrar com logs reais)
  private getActiveUsers(period: "daily" | "weekly" | "monthly") {
    const now = new Date();
    const periodMs =
      period === "daily"
        ? 1000 * 60 * 60 * 24
        : period === "weekly"
          ? 1000 * 60 * 60 * 24 * 7
          : 1000 * 60 * 60 * 24 * 30;

    return this.userProgress.filter(
      (u) => u.lastAccessedAt.getTime() >= now.getTime() - periodMs,
    ).length;
  }
}
