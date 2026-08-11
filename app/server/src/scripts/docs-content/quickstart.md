From zero to a grouped issue in three steps.

## 1. Create a project

Go to [Projects](/projects) and choose **New project**. The slug is derived from the name and becomes part of every URL for that workspace.

You land on the project's settings page, which is where the snippet lives — already filled in with the real key.

## 2. Install the snippet

Paste this into the `<head>` of the app you want to monitor, replacing the key with your own:

```html
<script
  src="https://your-apexops-host/sdk/v1.js"
  data-project="pk_your_ingest_key"
  defer
></script>
```

That is the whole integration. The script patches `console.error` and `console.warn`, listens for uncaught errors and unhandled promise rejections, and batches what it captures to the ingest endpoint.

:::callout{title="The key is public on purpose"}
It ships inside a script tag on a page you do not control, so it can never be a secret. It is **write-only** — it can report events to exactly one project and can never read anything. Reads use your signed-in session.
:::

## 3. Verify it works

The project settings page shows **Waiting for first event…** until something arrives, then flips to **Receiving events** on its own. You do not need to refresh.

To force an error from the browser console of the monitored page:

```js
console.error(new Error('ApexOps test error'));
```

Events are batched and flush every 5 seconds, so allow a moment. Then open the project's **Issues** tab.

## 4. Turn an issue into work

On any issue row, choose **Create ticket**. That opens a ticket on the project's board, pre-filled with the issue title, culprit, occurrence count and the latest stack trace.

An issue can only be promoted once. Afterwards the row links to the ticket instead of offering to create a second one.
