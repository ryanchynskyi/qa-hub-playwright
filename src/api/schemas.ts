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
  type: z.enum(['ANSWER_N', 'ACCURACY', 'REVIEW_DUE', 'READ_ARTICLE', 'CODE_REVIEW', 'WEAK_SPOT']),
  params: z.object({
    topicId: z.string().optional(),
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

/** Chat and comments: only the fields tests read; zod drops the rest. */
export const ChatMessage = z.object({
  id: z.number().int(),
  text: z.string(),
  /** Null on an anonymous message, which carries the author's tag number instead. */
  name: z.string().nullable(),
  anonNumber: z.number().int().nullable(),
  isMine: z.boolean(),
});
export const ChatFeed = z.object({ messages: z.array(ChatMessage) });
export const Comments = z.object({ items: z.array(z.object({ text: z.string() })) });
export type ChatMessage = z.infer<typeof ChatMessage>;
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
