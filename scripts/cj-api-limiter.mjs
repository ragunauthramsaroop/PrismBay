// One serial read-only CJ transport per workflow run.
// CJ free accounts default to one request/second; 1600200 is a temporary
// rate-limit response, whereas 1600201 means the account quota is exhausted.
export function createCJReadOnlyClient({
  transport = globalThis.fetch,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = () => Date.now(),
  minGapMs = 1400,
  retryDelaysMs = [2600, 6000],
} = {}) {
  if (typeof transport !== 'function' || typeof pause !== 'function' ||
      typeof now !== 'function' || minGapMs < 1000) {
    throw new Error('Invalid rate-limited client configuration');
  }
  let lastStarted = -Infinity;
  return async function jsonFetch(url, options = {}) {
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      const wait = Math.max(0, lastStarted + minGapMs - now());
      if (wait) await pause(wait);
      lastStarted = now();
      let response;
      try {
        response = await transport(url, {
          ...options,
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        // Do not forward raw service/transport exceptions to public reports.
        throw new Error('CJ network request failed');
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('CJ response was not valid JSON');
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('CJ response had invalid structure');
      }
      const code = String(payload?.code ?? response.status)
        .replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 15);
      if (code === '1600201') {
        throw new Error('CJ API points quota exhausted (code 1600201)');
      }
      if (response.status === 429 || code === '1600200') {
        if (attempt < retryDelaysMs.length) {
          await pause(Math.max(minGapMs, retryDelaysMs[attempt]));
          continue;
        }
        throw new Error('CJ request failed (HTTP 429, code 1600200)');
      }
      if (!response.ok || payload?.result === false || payload?.success === false ||
          (payload?.code !== undefined && Number(payload.code) !== 200)) {
        throw new Error('CJ request failed (HTTP ' + response.status +
          ', code ' + code + ')');
      }
      return payload;
    }
    throw new Error('CJ rate limit exceeded');
  };
}
