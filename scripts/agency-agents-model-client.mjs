// Minimal read-only OpenAI-compatible transport for the existing local 9Router.
// Avoid Claude Code's hardcoded model catalog for verified free provider IDs.
// No tools, edits, streaming, external writes, paid fallback or retries.
const MAX_PROMPT_BYTES = 32000;
const MAX_OUTPUT_CHARS = 24000;
const DEFAULT_API = 'http://127.0.0.1:20128/v1';

export function extractChatText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  const raw = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter(part => part?.type === 'text' && typeof part?.text === 'string')
        .map(part => part.text).join('\n')
      : '';
  const text = raw.trim();
  if (!text) throw new Error('9router_chat_returned_no_text');
  if (text.length > MAX_OUTPUT_CHARS) throw new Error('9router_chat_output_exceeds_bound');
  return text;
}

export async function completeVia9Router({
  apiKey, model, prompt, baseUrl = DEFAULT_API,
  fetchImpl = fetch, timeoutMs = 90000,
} = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('missing_9router_api_key');
  // Existing 9Router bootstrap already selects OpenCode's advertised free models.
  // Enforce a second independent no-spend check at the external request boundary.
  if (typeof model !== 'string' || !model.startsWith('oc/') ||
      (!model.toLowerCase().includes('free') && !model.toLowerCase().includes('contributor'))) {
    throw new Error('non_free_9router_model_blocked');
  }
  if (typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt,'utf8') > MAX_PROMPT_BYTES) {
    throw new Error('invalid_or_oversized_agent_prompt');
  }
  const endpoint = new URL(baseUrl);
  if (endpoint.href !== DEFAULT_API && endpoint.href !== DEFAULT_API + '/') {
    throw new Error('9router_endpoint_must_be_loopback');
  }
  const response = await fetchImpl(DEFAULT_API + '/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {role:'system',content:'Read-only PrismBay commerce analyst. No purchases, orders, publications, messages, credentials, tools, or invented claims. Return evidence-based advice only.'},
        {role:'user',content:prompt},
      ],
      stream:false,
      max_tokens:1400,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response?.ok) {
    // Never reflect potentially sensitive upstream response bodies or tokens to logs.
    throw new Error('9router_chat_http_' + (Number(response?.status) || 'unknown'));
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('9router_chat_invalid_json'); }
  return extractChatText(payload);
}
