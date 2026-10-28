/**
 * Load test: ramps to 20 concurrent guests, holds, ramps down (~2 min). Thresholds are the pass
 * criteria: k6 exits non-zero when any of them is broken, so the run can gate CI.
 *
 *   npm run perf:load
 *
 * The numbers are a local-stack baseline, not an SLA: a laptop with a dev build of the API
 * says nothing about production capacity. They catch regressions (a missing index, an N+1).
 */
export { setup, guestJourney as default } from './lib/journey.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Per endpoint, through the `name` tag: search is the heaviest query, watch it on its own.
    'http_req_duration{name:kb-search}': ['p(95)<800'],
    'http_req_duration{name:quiz-check}': ['p(95)<500'],
  },
};
