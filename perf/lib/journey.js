import http from 'k6/http';
import { check, fail, sleep } from 'k6';

/**
 * A guest's read path through the API: catalog, a section's questions, one answer check and a
 * knowledge-base search. Guests write nothing (quiz/check without a token records nothing), so
 * runs leave the database as it was and need no test users.
 *
 * k6 is not Node: no process.env, no npm packages, no src/config/env.ts. The production guard is
 * repeated here instead, and it is stricter: perf never runs anywhere but the local stack, where
 * scripts/stack.mjs starts the API with rate limits off.
 */
export const API = withSlash(__ENV.API_URL || 'http://localhost:4273/api/');

if (!/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(API)) {
  throw new Error(`API_URL=${API} is not local. Load tests run only against the local stack.`);
}

function withSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

const JSON_HEADERS = { 'content-type': 'application/json' };
const SEARCH_TERMS = ['test', 'api', 'sql', 'http', 'bug'];

/** Runs once before the VUs start: fails fast on a dead stack, collects section ids. */
export function setup() {
  const health = http.get(`${API}health`);
  if (health.status !== 200 || health.json('db') !== 'up') {
    fail(`API is not ready at ${API}health (${health.status}). Start it with npm run stack.`);
  }
  const sections = http
    .get(`${API}content/catalog?lang=en`)
    .json('sections')
    .filter((s) => s.questionCount > 0)
    .map((s) => s.id);
  if (sections.length === 0) fail('Catalog has no sections with questions');
  return { sections };
}

export function guestJourney({ sections }) {
  get('catalog', 'content/catalog?lang=en');

  const questions = get('questions', `sections/${pick(sections)}/questions?lang=en`);
  if (questions) {
    const body = JSON.stringify({ questionId: pick(questions.json()).id, choice: 0 });
    const res = http.post(`${API}quiz/check`, body, {
      headers: JSON_HEADERS,
      tags: { name: 'quiz-check' },
    });
    check(res, { 'quiz-check 200': (r) => r.status === 200 });
  }

  get('kb-search', `kb/search?q=${pick(SEARCH_TERMS)}`);

  sleep(1); // think time: a user reads the question before the next request
}

/**
 * GET with a fixed `name` tag: without it every section id becomes its own metric series.
 * Returns the response on 200, otherwise null.
 */
function get(name, path) {
  const res = http.get(`${API}${path}`, { tags: { name } });
  return check(res, { [`${name} 200`]: (r) => r.status === 200 }) ? res : null;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}
