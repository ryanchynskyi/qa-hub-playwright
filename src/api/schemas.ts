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

export const RecallCard = z.object({ id: z.string(), chapterId: z.string() });
export type RecallCard = z.infer<typeof RecallCard>;

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
});
export type Progress = z.infer<typeof Progress>;

/** Chat and comments: only the fields tests read; zod drops the rest. */
export const ChatMessage = z.object({ id: z.number().int(), text: z.string() });
export const ChatFeed = z.object({ messages: z.array(ChatMessage) });
export const Comments = z.object({ items: z.array(z.object({ text: z.string() })) });
export type ChatMessage = z.infer<typeof ChatMessage>;
export type Comments = z.infer<typeof Comments>;

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
