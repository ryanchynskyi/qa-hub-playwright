/**
 * Where the tests run. One place resolves the target, URLs and the production guard, so a typo in
 * an env var can never send the full suite to production.
 *
 *   TARGET=local (default)  local stack from scripts/stack.mjs, everything allowed
 *   TARGET=prod             https://qa-interview.com, only @prod-safe tests (read-only)
 *
 * BASE_URL / API_URL override the defaults of the chosen target.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env file: everything comes from the real environment.
}

export type Target = 'local' | 'prod';

const DEFAULTS: Record<Target, { baseURL: string; apiURL: string }> = {
  // The API goes through the web server's same-origin /api proxy, so the refresh cookie set by an
  // API login lands on the web origin (localhost:4273) and the browser sends it on page load.
  local: { baseURL: 'http://localhost:4273/', apiURL: 'http://localhost:4273/api/' },
  prod: { baseURL: 'https://qa-interview.com/', apiURL: 'https://qa-hub-api.onrender.com/' },
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function resolveTarget(raw: string | undefined): Target {
  const value = (raw ?? 'local').toLowerCase();
  if (value !== 'local' && value !== 'prod') {
    throw new Error(`TARGET must be "local" or "prod", got "${raw}"`);
  }
  return value;
}

/** Base URLs must end with '/', or relative paths like 'quiz/sql' drop the last path segment. */
function withSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function assertLocal(name: string, url: string): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `${name}=${url} is not a local host. Remote targets need TARGET=prod, ` +
        'which runs only @prod-safe tests.',
    );
  }
}

const target = resolveTarget(process.env.TARGET);
const baseURL = withSlash(process.env.BASE_URL ?? DEFAULTS[target].baseURL);
const apiURL = withSlash(process.env.API_URL ?? DEFAULTS[target].apiURL);

if (target === 'local') {
  assertLocal('BASE_URL', baseURL);
  assertLocal('API_URL', apiURL);
}

export const env = {
  target,
  isProd: target === 'prod',
  isCI: !!process.env.CI,
  baseURL,
  apiURL,
} as const;
