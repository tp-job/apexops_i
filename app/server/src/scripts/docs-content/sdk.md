The SDK is a single script with no dependencies and no build step. It is configured entirely through `data-*` attributes on its own script tag.

## Configuration

| Attribute {w-44} | Default {w-32} | Purpose |
| --- | --- | --- |
| `data-project` | required | Your ingest key. If absent the SDK does nothing at all, silently. |
| `data-levels` | `error,warn` | Comma-separated console levels to capture. `info`, `log` and `debug` are opt-in. |
| `data-release` | none | Version string attached to every event. **Required for source maps** — maps are matched to stack frames by release, so without it a minified stack stays minified. |
| `data-sample` | `1.0` | Fraction of **non-error** events kept. Errors are never sampled away. |
| `data-endpoint` | script origin | Override the ingest host when self-hosting. |

A fully configured tag:

```html
<script
  src="https://your-apexops-host/sdk/v1.js"
  data-project="pk_your_ingest_key"
  data-levels="error,warn"
  data-release="storefront@2.4.1"
  data-sample="0.25"
  defer
></script>
```

:::callout{title="Configuration is read from the tag, not from globals"}
Earlier versions read `window.BUG_TRACKER_*`, which had to be set before the script loaded — a foot-gun with `defer` and `async` that silently reported everything under the wrong name.
:::

## What is captured

- Console calls at the levels named in `data-levels`.
- Uncaught exceptions, via `window.onerror`.
- Unhandled promise rejections, via `unhandledrejection`.

The last two are always on regardless of `data-levels` — an uncaught exception is the event the product exists to capture.

Each event carries the message, stack, page URL, user agent, and the release string if set. The host page's own console output is never suppressed: the original console method is called first, unconditionally.

## Batching and delivery

Events queue in memory and flush every 5 seconds, or immediately when a batch reaches 100 events.

- **Repeats are collapsed.** Identical message and stack inside a 5-second window increment a local counter instead of queueing again, so a tight error loop costs one request rather than five hundred.
- **The final batch survives unload.** On `pagehide`, `visibilitychange` and `beforeunload` the queue is sent with `navigator.sendBeacon`, which the browser delivers during teardown — a `fetch` there is cancelled, and that batch is usually the one containing the crash.
- **A dead server is not retried forever.** After three consecutive failures the SDK backs off exponentially, up to five minutes.

## Source maps

A production bundle throws from `index-BwlN_KfP.js:48:12934`, which is a fact about your bundler and not about your code. Upload the `.map` files your build produced and ApexOps resolves each frame back to the original file, line and function on the issue detail.

:::endpoint{method=POST path="/api/projects/:slug/sourcemaps?release=&file="}

The request body *is* the map file — no multipart, no envelope. One upload per generated file, per release:

```bash
# One file
curl -X POST \
  "$APEXOPS_URL/api/projects/$PROJECT_SLUG/sourcemaps?release=$RELEASE&file=index-BwlN_KfP.js" \
  -H "Authorization: Bearer $APEXOPS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @dist/assets/index-BwlN_KfP.js.map

# Every map Vite emitted, with the file name taken from the map itself
for map in dist/assets/*.js.map; do
  name=$(basename "$map" .map)
  curl -sS -X POST \
    "$APEXOPS_URL/api/projects/$PROJECT_SLUG/sourcemaps?release=$RELEASE&file=$name" \
    -H "Authorization: Bearer $APEXOPS_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @"$map"
done
```

As an npm script:

```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "./scripts/upload-sourcemaps.sh"
  }
}
```

:::callout{title="The release string has to match exactly"}
The `release` you upload under and the `data-release` on the script tag are compared verbatim. Deriving both from the same variable — a git SHA, a package version — is the whole trick. A map uploaded under the wrong release is indistinguishable from no map at all.
:::

| Rule {w-64} | Detail |
| --- | --- |
| Authentication | Your **JWT session token**, and an owner or admin of the project. The public ingest key cannot reach this endpoint. |
| File name | The bare generated file name, e.g. `index-BwlN_KfP.js` — not a path and not a URL, so one upload works from any host or CDN. |
| Size limit | `12 MB` |
| Re-uploading | Same release + file replaces the previous map rather than adding a second. |
| When to upload | Any time. Resolution happens when an issue is read, so a map uploaded after a crash fixes the stack that is already stored. |

:::callout{title="Your source is never served back"}
Uploaded maps are stored privately and no endpoint returns their contents — not to you, not to your teammates, not with the ingest key. What reaches the browser is the resolved position: file, line, column and function name. Original source text stays on the server.
:::

Frames with no matching map render exactly as they arrived, so a stack that mixes your code with a vendor bundle resolves the half it can. Uploads are listed on the project’s settings screen, which is where to look when a stack you expected to resolve did not.

## Limits

| Limit {w-64} | Value |
| --- | --- |
| Message length | `8 KB` |
| Stack length | `16 KB` |
| Batch size | 64 KB, or 100 events |
| In-memory queue | 200 events (oldest dropped first) |
| Client dedupe window | `5s` |

Oversized values are truncated client-side rather than rejected server-side: a rejected batch loses the crash, a truncated one still reports it.

## Running on someone else’s page

The worst possible failure for an embedded script is taking down the page that embeds it. Three properties guard against that:

- All SDK-internal logging goes through the *captured* console methods, never the patched ones, and a re-entrancy flag prevents recursion.
- Every capture path is wrapped so an internal error can never propagate into host-page code.
- No global is exposed. There is no `window.__BugTracker` for a host page or a third-party script to tamper with.
