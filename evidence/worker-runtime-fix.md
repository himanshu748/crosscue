# Hosted Qloo failure and runtime reproduction

Initial public releases01a54ee andb6fed3c returned a clear502 network_error on first analysis. No provider evidence was cached or substituted. The first attempt to fix native fetch receiver binding passed a meaningful strict-receiver regression, but did not resolve the public failure; it is not presented as the complete cause.

The actual local workerd runtime, launched by installed Wrangler4.156.0 with compatibility date2026-10-30, reproduced the decisive failure without making any network request. Constructing a Request with redirect:error throws TypeError; redirect:manual is accepted. The exact response is recorded in worker-runtime-redirect.json.

This agrees with [Cloudflare's current Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/). The adapter now uses manual mode and explicitly rejects every3xx response. It never follows a redirect or forwards the Qloo credential to a different destination. The regression verifies one request only, the manual option and a redirect_rejected error for302.

Reproduction command used a tiny local Worker at localhost3009 whose fetch handler constructs both Request variants and returns their result. It had no credentials and made no upstream requests. The source expression was:

```js
for (const mode of ['error', 'manual']) {
  new Request('https://hackathon.api.qloo.com/search', { redirect: mode });
}
```

Both regression failures before their respective fixes are retained. After the redirect fix,42 tests and the strict TypeScript/Vite build pass. The fixed application source is aca964bf85ee718c9b5676a209e8cda99389c660. Public browser acceptance is recorded separately; local runtime reproduction alone does not prove a live hosted acquisition.
