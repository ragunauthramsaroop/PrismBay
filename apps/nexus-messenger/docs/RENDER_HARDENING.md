# Render Static Site security configuration

Do not treat Docker `nginx.conf` as the headers configuration of a Render Static Site. Render requires configuring static site headers in its **Dashboard > service > Settings > Headers**, or creating a Blueprint with an explicit headers block.

Set response headers for `/*`:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), payment=()` |

Set `Cache-Control: no-cache` for `/index.html` and `/sw.js`. Set `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`.

CSP requires a compatibility and security test with Matrix Rust WebAssembly, dynamic permitted homeservers, IndexedDB, blob URLs, and Vite's bundle. Proposed starting policy for a staging deployment only:

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https: wss:; worker-src 'self' blob:; media-src 'self' blob: https:;
```

Do not enforce the draft CSP on the production origin until E2EE initialization, homeserver connections, and file/voice flows pass regression tests. Tighten connect-src to an owned homeserver when one exists.

Validation:

```bash
curl -sSI https://nexus-messenger-l6g9.onrender.com/ | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|cache-control'
```

App installability is separate from secure message recovery. A service worker caches **only static application files** and intentionally never caches Matrix API responses. Native mobile push and secure offline delivery need their own implementation.

References: https://render.com/docs/static-site-headers
