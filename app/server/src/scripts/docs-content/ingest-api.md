If you cannot use the browser SDK — a server runtime, a mobile app, a CI job — post events directly. This is the only endpoint that does not use a session token.

## POST /api/ingest

Authenticate with the project's ingest key, either as the `X-Apexops-Key` header or as `key` in the body. The body form exists because `navigator.sendBeacon` cannot set custom headers.

```bash
curl -X POST https://your-apexops-host/api/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Apexops-Key: pk_your_ingest_key' \
  -d '{
    "events": [{
      "level": "error",
      "message": "Payment provider timed out",
      "stack": "Error: timeout\n    at charge (https://app.example.com/pay.js:42:9)",
      "url": "https://app.example.com/checkout",
      "release": "storefront@2.4.1",
      "count": 1
    }]
  }'
```

## Event fields

| Field {w-36} | Type {w-28} | Notes |
| --- | --- | --- |
| `level` | string | One of `error warn info log debug`. Anything else becomes `error`. |
| `message` | string | Max 8 KB. |
| `stack` | string? | Max 16 KB. Drives the culprit. |
| `url` | string? | Max 2048 characters. |
| `userAgent` | string? | Max 512 characters. |
| `release` | string? | Max 128 characters. |
| `count` | number? | Occurrences this event represents, 1–10000. Defaults to `1`. |
| `context` | object? | Free-form tags or breadcrumbs. |
| `timestamp` | string? | Advisory only — the server always stamps its own time. |

## Response

```json
{ "accepted": 50, "issues": 1, "dropped": 0 }
```

`dropped` counts events filtered out because their level is not in the project's capture levels. That is a normal outcome, not an error — level filtering is enforced on the server, because the SDK's configuration is a hint from a client nobody controls.

## Limits and errors

| Limit {w-64} | Value |
| --- | --- |
| Events per request | `100` |
| Request body | `1 MB` |
| Rate limit, per key | 300 requests / minute |
| Rate limit, per IP | 600 requests / minute |

| Status {w-24} | Meaning |
| --- | --- |
| `202` | Accepted. Some or all events may have been dropped by level. |
| `400` | Payload failed validation. |
| `401` | Unknown or rotated ingest key. |
| `403` | Origin not in the project's allowlist. |
| `413` | Body exceeded 1 MB. |
| `429` | Rate limited. Back off before retrying. |

:::callout{tone=warn title="Rotating a key has no grace period"}
That is the point of rotation — it exists to cut off a key that is being abused. Every page still embedding the old snippet stops reporting immediately.
:::
