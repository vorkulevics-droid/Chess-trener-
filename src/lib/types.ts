export type LineStats = {
  attempts: number;
  correct: number;
  /** attempt-level accuracy 0..100 */
  accuracy: number;
  /** 0..100, based on the last 5 attempts, scaled by experience */
  mastery: number;
  lastTrainedAt: string | null;
  unresolvedMistakes: number;
  /** last attempts (most recent last) */
  recent: boolean[];
};

export type LineDTO = {
  id: number;
  name: string;
  category: string;
  eco: string;
  description: string;
  moves: string;
  isTrap: boolean;
  trapNote: string;
  difficulty: number;
  createdAt: string;
  updatedAt: string;
  stats: LineStats;
};

export type MistakeDTO = {
  id: number;
  lineId: number;
  lineName: string;
  lineCategory: string;
  ply: number;
  fen: string;
  playedMove: string;
  expectedMove: string;
  resolved: boolean;
  createdAt: string;
};

export type AttemptDTO = {
  id: number;
  lineId: number;
  lineName: string;
  correct: boolean;
  mistakesCount: number;
  durationMs: number;
  createdAt: string;
};

export type CategoryProgress = {
  category: string;
  lines: number;
  mastered: number;
  mastery: number;
};

export type DashboardStats = {
  totalLines: number;
  masteredLines: number;
  traps: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  unresolvedMistakes: number;
  streakDays: number;
  attemptsToday: number;
  activity: { date: string; attempts: number; correct: number }[];
  categories: CategoryProgress[];
  recentAttempts: AttemptDTO[];
  weakest: LineDTO | null;
  nextUp: LineDTO | null;
};

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

export type LineInput = {
  name: string;
  category: string;
  eco?: string;
  description?: string;
  moves: string;
  isTrap?: boolean;
  trapNote?: string;
  difficulty?: number;
};

export type MistakeDraft = {
  ply: number;
  fen: string;
  playedMove: string;
  expectedMove: string;
};
