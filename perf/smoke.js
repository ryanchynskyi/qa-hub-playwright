/**
 * Perf smoke: 1 user for 30s. Proves the script and the stack work and gives a baseline latency
 * with no contention, to compare the load run against.
 *
 *   npm run perf:smoke
 */
export { setup, guestJourney as default } from './lib/journey.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<300'],
  },
};
