# CrossCue security and operational boundaries

QLOO_API_KEY exists only in the server environment/secret binding. No caller chooses the upstream URL; the adapter allows only official Qloo HTTPS origins and rejects redirects. Credentials are never in source, frontend variables, traces or exports. Error bodies and stack traces are not returned to clients.

External Qloo names are inert text. Runtime response parsing rejects unsupported shapes, duplicate IDs, wrong entity categories and off-shortlist targets. Structured tool inputs are strict schemas; extra placement/model fields cannot mutate state. No model has apply authority.

Per-visitor opaque 256-bit token is an HttpOnly SameSite=Strict cookie (Secure on HTTPS). Only its SHA-256 hash keys database state; clients cannot choose session IDs through request bodies. The API uses no permissive CORS. Mutations require exact same-origin requests and bounded JSON bodies. Browser state remains server-owned and versioned. Preview is not approval. Apply requires confirm:true, matching preview and version, recomputation and independent validation.

Global durable Qloo budget128/day, pacing750ms, three-hour provenance-preserving cache and refresh lease protect provider quota across concurrent visitors/worker instances. Sessions are limited to30 requests/minute; creation is separately limited. The application's ceiling is not a statement of the provider's quota. Failed provider attempts count. Rate/auth/network failures are visible; no automatic paid fallback or overage.

Anonymous organizer sessions expire after24h. Cleanup deletes expired records hourly. Server-side shared evidence contains only the eight public cultural identities and bounded query results. Hosted D1 state is durable; local SQLite state is ignored by Git. Exports contain the visitor's own schedule and public cultural evidence, never the cookie hash, preview ID or key.

The demo intentionally has no user account recovery: deleting its cookie or expiration starts a new session. Do not place sensitive attendee information in this fictional demonstration. No real attendee data is collected or sent upstream.

Security verification remains governed by the 60-check ledger. A documented control is not evidence that its live deployment passed.
