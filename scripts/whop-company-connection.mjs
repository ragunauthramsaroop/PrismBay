// Read-only Whop company API connectivity probe.
// Use only from trusted GitHub Actions or a server-side environment.
// Never print the credential, headers, response body, or buyer information.
const API_URL = 'https://api.whop.com/api/v1/plans';
const API_VERSION_DATE = '2026-11-07';

export async function verifyWhopReadAccess({
  key, companyId, fetchImpl = fetch, timeoutMs = 12000,
} = {}) {
  if (typeof key !== 'string' || !/^apik_[A-Za-z0-9_-]{8,}$/.test(key)) {
    return { ok: false, reason: 'api_key_missing_or_invalid_shape' };
  }
  if (typeof companyId !== 'string' || !/^biz_[A-Za-z0-9_-]{6,80}$/.test(companyId)) {
    return { ok: false, reason: 'company_id_missing_or_invalid_shape' };
  }
  const url = new URL(API_URL);
  url.searchParams.set('company_id', companyId);
  url.searchParams.set('first', '1');
  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Api-Version-Date': API_VERSION_DATE,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    if (response.status === 200) {
      return { ok: true, reason: 'read_only_plans_access_confirmed' };
    }
    if (response.status === 401) return { ok: false, reason: 'whop_unauthorized' };
    if (response.status === 403) return { ok: false, reason: 'whop_permission_denied_plan_read_required' };
    if (response.status === 404) return { ok: false, reason: 'whop_company_or_endpoint_not_found' };
    return { ok: false, reason: 'whop_unexpected_http_status', httpStatus: response.status };
  } catch {
    return { ok: false, reason: 'whop_connection_unavailable' };
  }
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result = await verifyWhopReadAccess({
    key: process.env.WHOP_COMPANY_API_KEY,
    companyId: process.env.WHOP_COMPANY_ID,
  });
  console.log('Whop connection probe: ' + (result.ok ? 'PASS' : 'BLOCKED') + ' (' + result.reason + ')');
  if (!result.ok) process.exitCode = 1;
}
