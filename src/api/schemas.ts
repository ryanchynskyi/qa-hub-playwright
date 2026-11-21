import { z } from 'zod';

/**
 * Response contracts of the API (docs/brief.md §8). Each schema is both a runtime check for
 * contract tests and, via z.infer, the TypeScript type the client returns: one source of truth.
 * Objects are not strict by default, so a new field in the API does not break the suite; tests
 * that must forbid a field (e.g. correctIndex in questions) check it explicitly.
 */

export const Lang = z.enum(['uk', 'en']);
export type Lang = z.infer<typeof Lang>;

export const QuestionLevel = z.enum(['junior', 'middle', 'senior']);
export type QuestionLevel = z.infer<typeof QuestionLevel>;

export const ApiError = z.object({ error: z.string(), message: z.string() });
export type ApiError = z.infer<typeof ApiError>;

export const Health = z.object({
  status: z.literal('ok'),
  db: z.literal('up'),
  content: z.object({
    questions: z.number().int().positive(),
    recallCards: z.number().int().positive(),
    articles: z.number().int().positive(),
  }),
});
export type Health = z.infer<typeof Health>;

export const Catalog = z.object({
  topics: z.array(z.object({ id: z.string(), name: z.string(), order: z.number() })),
  sections: z.array(
    z.object({
      id: z.string(),
      topicId: z.string(),
      name: z.string(),
      questionCount: z.number().int().nonnegative(),
      codeReview: z.boolean(),
    }),
  ),
  chapters: z.array(
    z.object({
      id: z.string(),
      topicId: z.string(),
      title: z.string(),
      articleCount: z.number().int().nonnegative(),
    }),
  ),
  questions: z.array(
    z.object({
      id: z.string(),
      sectionId: z.string(),
      chapterId: z.string(),
      level: QuestionLevel,
      /** Interview-plan weight, only on classified questions; never null (PLAN-13). */
      priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    }),
  ),
  recallCards: z.array(z.object({ id: z.string(), topicId: z.string(), chapterId: z.string() })),
});
export type Catalog = z.infer<typeof Catalog>;

export const Question = z.object({
  id: z.string(),
  sectionId: z.string(),
  chapterId: z.string(),
  level: QuestionLevel,
  text: z.string().min(1),
  code: z.string(),
  options: z.array(z.string()).min(2).max(10),
  /** «Реально питали»: users who marked it asked; null below 3 (PLAN-12). */
  asked: z.number().int().min(3).nullable().optional(),
});
export type Question = z.infer<typeof Question>;

/** The app shows the correct-answer share from this many first answers ($APP_DIR packages/shared). */
export const QUESTION_STAT_MIN = 5;

/** GET /recall/cards; `question` and `answer` are markdown, the UI renders them. */
export const RecallCard = z.object({
  id: z.string(),
  topicId: z.string(),
  chapterId: z.string(),
  question: z.string().min(1),
  answer: z.string().min(1),
  core: z.boolean(),
});
export type RecallCard = z.infer<typeof RecallCard>;

/** Spaced-repetition state of one card ($APP_DIR packages/shared engine); `dueAt` in ms. */
export const CardState = z.object({
  rating: z.number().int().min(1).max(5),
  reviews: z.number().int().positive(),
  dueAt: z.number(),
  history: z.array(z.number().int()),
  lastXpDate: z.string().nullable(),
});
export type CardState = z.infer<typeof CardState>;

/** POST /me/recall/rate: `at` is the server time the interval counts from. */
export const RateResult = z.object({
  result: z.object({
    xpGained: z.number().int().nonnegative(),
    grants: z.array(
      z.object({ amount: z.number(), reason: z.string(), refId: z.string().optional() }),
    ),
  }),
  at: z.number(),
  card: z.object({ id: z.string(), state: CardState }),
});
export type RateResult = z.infer<typeof RateResult>;

export const CheckResult = z.object({
  outcome: z.enum(['correct', 'wrong', 'skipped']),
  correctIndex: z.number().int().min(0),
  explanation: z.string(),
  /** Share of first answers that were correct; absent below QUESTION_STAT_MIN first answers. */
  stat: z.object({ answered: z.number().int(), pct: z.number().int() }).optional(),
});
export type CheckResult = z.infer<typeof CheckResult>;

export const User = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  timeZone: z.string(),
});
export type User = z.infer<typeof User>;

export const AuthResponse = z.object({
  accessToken: z.string().min(1),
  user: User,
  refreshToken: z.string().optional(),
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const LeaderboardRow = z.object({
  rank: z.number().int().positive(),
  name: z.string().nullable(),
  level: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  isMe: z.boolean(),
});

export const Leaderboard = z.object({
  period: z.enum(['all', 'week']),
  top: z.array(LeaderboardRow),
  me: LeaderboardRow.nullable(),
});
export type Leaderboard = z.infer<typeof Leaderboard>;

export const SearchHit = z.object({
  articleId: z.string(),
  chapterId: z.string(),
  topicId: z.string(),
  index: z.number().int().nonnegative(),
  title: z.string(),
  chapterTitle: z.string(),
  snippet: z.string(),
});
export const SearchHits = z.array(SearchHit);
export type SearchHit = z.infer<typeof SearchHit>;

/** One daily task ($APP_DIR packages/shared/src/engine/daily-tasks.ts); `id` is `<date>:<slot>`. */
export const DailyTask = z.object({
  id: z.string(),
  date: z.string(),
  slot: z.number().int().nonnegative(),
  type: z.enum([
    'ANSWER_N',
    'ACCURACY',
    'REVIEW_DUE',
    'READ_ARTICLE',
    'CODE_REVIEW',
    'WEAK_SPOT',
    'PLAN_DAY',
  ]),
  params: z.object({
    topicId: z.string().optional(),
    topicIds: z.array(z.string()).optional(),
    size: z.number().optional(),
    chapterId: z.string().optional(),
    sectionIds: z.array(z.string()).optional(),
    minAnswered: z.number().optional(),
    minRatio: z.number().optional(),
  }),
  target: z.number().int().positive(),
  progress: z.number().int().nonnegative(),
  rewardXp: z.number().int().positive(),
  completedAt: z.number().nullable(),
});
export type DailyTask = z.infer<typeof DailyTask>;

const Daily = z.object({ date: z.string(), tasks: z.array(DailyTask) }).nullable();

/** PUT /me/daily-count: the chosen count, and the set in force today (a started one keeps its size). */
export const DailyCount = z.object({ dailyTaskCount: z.number().int(), daily: Daily });
export type DailyCount = z.infer<typeof DailyCount>;

/** GET /kb/chapters/:id: only the article ids tests read. */
export const KbChapter = z.object({
  id: z.string(),
  articles: z.array(z.object({ id: z.string() })),
});
export type KbChapter = z.infer<typeof KbChapter>;

/** GET /me/progress: only the parts tests read; zod drops the rest. */
export const Progress = z.object({
  /** questionId → latest answer: lastResult 1 = correct; a skip is 0 with `skipped: true`. */
  questions: z.record(
    z.string(),
    z.object({
      lastResult: z.union([z.literal(0), z.literal(1)]),
      skipped: z.boolean().optional(),
      attempts: z.number().int().optional(),
    }),
  ),
  stats: z.object({ totalXp: z.number().int().nonnegative() }),
  /** sectionId → finished runs, newest first. */
  attempts: z.record(
    z.string(),
    z.array(z.object({ at: z.number(), n: z.number(), y: z.number() })),
  ),
  /** XP grants, newest last; `refId` is the question/card/task the grant is for. */
  xpLog: z.array(
    z.object({ amount: z.number(), reason: z.string(), refId: z.string().optional() }),
  ),
  dailyTaskCount: z.number().int(),
  daily: Daily,
});
export type Progress = z.infer<typeof Progress>;

/** Comments: only the fields tests read; zod drops the rest. */
export const Comments = z.object({ items: z.array(z.object({ text: z.string() })) });
export type Comments = z.infer<typeof Comments>;

/** Bug reports and feedback ($APP_DIR packages/shared/src/bug-report.ts, community.ts). */
const UploadStatus = z.enum(['open', 'done']);
export type UploadStatus = z.infer<typeof UploadStatus>;
const StoredImage = z.object({ id: z.number().int(), mime: z.string(), size: z.number().int() });

export const BugReportCreated = z.object({ id: z.number().int() });
export const AdminBugReport = z.object({
  id: z.number().int(),
  text: z.string(),
  status: UploadStatus,
  /** Display name; null for a guest. */
  author: z.string().nullable(),
  images: z.array(StoredImage),
});
export const AdminBugReports = z.object({
  open: z.number().int(),
  total: z.number().int(),
  items: z.array(AdminBugReport),
});
export type AdminBugReports = z.infer<typeof AdminBugReports>;

export const FeedbackCreated = z.object({ id: z.string(), number: z.number().int() });
export const AdminFeedbackItem = z.object({
  id: z.string(),
  number: z.number().int(),
  rating: z.number().int(),
  text: z.string(),
  status: UploadStatus,
  author: z.string().nullable(),
  images: z.array(StoredImage),
  reply: z.string().nullable(),
  replySeenAt: z.string().nullable(),
  canReply: z.boolean(),
});
export const AdminFeedback = z.object({
  total: z.number().int(),
  open: z.number().int(),
  items: z.array(AdminFeedbackItem),
});
export const MyFeedback = z.object({
  items: z.array(
    z.object({
      number: z.number().int(),
      rating: z.number().int(),
      text: z.string(),
      reply: z.string().nullable(),
      seen: z.boolean(),
    }),
  ),
});

const ImportCounts = z.object({
  questions: z.number().int().nonnegative(),
  cards: z.number().int().nonnegative(),
  articles: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
});

/** POST /me/import ($APP_DIR packages/shared/src/import.ts). */
export const ImportResult = z.object({
  imported: ImportCounts,
  /** Unknown ids, or items the account already had. */
  skipped: ImportCounts,
  xpGained: z.number().int().nonnegative(),
  levelUp: z.object({ from: z.number().int(), to: z.number().int() }).nullable(),
});
export type ImportResult = z.infer<typeof ImportResult>;

/** An interview (POST/PATCH /me/interviews); `checklist` holds the ticked «Перед співбесідою» keys. */
export const Interview = z.object({
  id: z.string(),
  date: z.string(),
  level: QuestionLevel,
  chapterIds: z.array(z.string()).min(1),
  minutesPerDay: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  outcome: z.enum(['offer', 'waiting', 'failed']).nullable(),
  /** Frozen when the result is saved (×100), null before. */
  readiness: z.number().int().nullable(),
  checklist: z.array(z.string()),
  /** The first «Які питання ставили?» save, null before. */
  askedAt: z.string().nullable(),
});
export type Interview = z.infer<typeof Interview>;
export type InterviewOutcome = NonNullable<Interview['outcome']>;

export const InterviewResponse = z.object({ interview: Interview });

/** GET /me/interviews: at most one active (date ≥ the user's today). */
export const Interviews = z.object({ active: Interview.nullable(), past: z.array(Interview) });
export type Interviews = z.infer<typeof Interviews>;

/** One day of the plan; the last one («Фініш», the day before the interview) has no topics and cards. */
export const PlanDay = z.object({
  date: z.string(),
  topicIds: z.array(z.string()),
  size: z.number().int().nonnegative(),
  state: z.enum(['todo', 'done', 'missed']),
  ahead: z.boolean(),
  cards: z.object({
    size: z.number().int().nonnegative(),
    rated: z.number().int().nonnegative(),
    state: z.enum(['todo', 'done']),
  }),
});
export type PlanDay = z.infer<typeof PlanDay>;

/** GET /me/plan: only the parts tests read; `days` runs today … the «Фініш» day. */
export const Plan = z.object({
  interview: Interview,
  today: z.string(),
  perDay: z.number().int(),
  cardsPerDay: z.number().int(),
  todayQuestions: z.number().int(),
  /** «Сьогодні 1 год» is on for today. */
  todayOverride: z.boolean(),
  /** On the interview day every day is past, so `days` may be empty then. */
  days: z.array(PlanDay),
  /** A re-pack after this missed day happened today («Учора без плану»), else null. */
  missed: z.object({ date: z.string(), topicIds: z.array(z.string()) }).nullable(),
  /** Only on the «Фініш» date: the round's make-up. */
  finish: z
    .object({
      cards: z.number().int().nonnegative(),
      questions: z.number().int().nonnegative(),
      chapterIds: z.array(z.string()),
    })
    .nullable(),
  /** Only on the interview day: the warm-up, at most 5 items; null when nothing to repeat. */
  warmup: z
    .object({
      size: z.number().int().min(0).max(5),
      cards: z.number().int().nonnegative(),
      questions: z.number().int().nonnegative(),
      from: z.enum(['finish', 'recent']),
      state: z.enum(['todo', 'done']),
      correct: z.number().int().nonnegative().optional(),
    })
    .nullable(),
});
export type Plan = z.infer<typeof Plan>;

/** A bank question as «Які питання ставили?» offers it. */
const AskedQuestion = z.object({
  id: z.string(),
  text: z.string().min(1),
  chapterId: z.string(),
  sectionId: z.string(),
});

/** GET /me/interviews/:id/questions (PUT answers the same plus `interview`). */
export const AskedQuestions = z.object({
  picked: z.array(AskedQuestion),
  texts: z.array(z.string()),
  suggested: z.array(AskedQuestion).max(4),
});
export type AskedQuestions = z.infer<typeof AskedQuestions>;
export const SavedAskedQuestions = AskedQuestions.extend({ interview: Interview });

/** GET /quiz/search?q= (signed in): at most 20, bank order. */
export const AskedSearch = z.object({ items: z.array(AskedQuestion).max(20) });

/** GET /admin/asked: own questions, newest first; never the user's name, email or id. */
export const AdminAsked = z.object({
  open: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  items: z.array(
    z.strictObject({
      id: z.number().int(),
      createdAt: z.string(),
      text: z.string(),
      level: QuestionLevel,
      chapters: z.array(z.string()),
      interviewDate: z.string(),
      status: z.enum(['open', 'done']),
    }),
  ),
});
export type AdminAsked = z.infer<typeof AdminAsked>;

/** POST /me/plan/days/:date/start: the round's ids; questions answer through `quiz/check`. */
export const PlanStart = z.object({
  questionIds: z.array(z.string()),
  cardIds: z.array(z.string()),
});
export type PlanStart = z.infer<typeof PlanStart>;

/** POST /me/plan/days/:date/cards/start: frozen at the first call; `ratings[i]` 0 = not rated. */
export const PlanCards = z.object({
  cardIds: z.array(z.string()),
  ratings: z.array(z.number().int().min(0).max(5)),
});
export type PlanCards = z.infer<typeof PlanCards>;

/** Rating a plan card or finishing a plan day: the account's stats after it. */
export const PlanUpdate = z.object({
  result: z.object({
    stats: z.object({
      totalXp: z.number().int().nonnegative(),
      streak: z.number().int().nonnegative(),
      longestStreak: z.number().int().nonnegative(),
      lastActiveDate: z.string().nullable(),
    }),
  }),
});
export type PlanUpdate = z.infer<typeof PlanUpdate>;
