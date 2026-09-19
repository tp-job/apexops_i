/**
 * ApexOps browser SDK v1 — GENERATED FILE, do not edit.
 * Source: packages/shared/src/sdk-core (capture.ts + v1-entry.ts)
 * Rebuild: npm run build:sdk --workspace packages/shared
 *
 *   <script src="https://your-apexops/sdk/v1.js" data-project="pk_..." defer></script>
 */
"use strict";
(() => {
  // src/sdk-core/capture.ts
  var MAX_MESSAGE = 8 * 1024;
  var MAX_STACK = 16 * 1024;
  var MAX_BATCH_BYTES = 64 * 1024;
  var MAX_BATCH_EVENTS = 100;
  var DEDUPE_WINDOW_MS = 5e3;
  var FLUSH_INTERVAL_MS = 5e3;
  var QUEUE_CAP = 200;
  var MAX_BACKOFF_MS = 5 * 60 * 1e3;
  var PATCHABLE = ["error", "warn", "info", "log", "debug"];
  function truncate(s, max) {
    if (typeof s !== "string") return "";
    return s.length > max ? `${s.slice(0, max)}
…[truncated]` : s;
  }
  function stringify(arg) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.message || String(arg);
    if (arg === null) return "null";
    if (arg === void 0) return "undefined";
    try {
      const seen = [];
      return JSON.stringify(arg, (_k, v) => {
        if (typeof v === "object" && v !== null) {
          if (seen.indexOf(v) !== -1) return "[Circular]";
          seen.push(v);
        }
        return v;
      }) || String(arg);
    } catch (e) {
      return String(arg);
    }
  }
  function startCapture(config, transport, host = window) {
    const hostConsole = host.console;
    const nativeError = hostConsole && hostConsole.error ? hostConsole.error.bind(hostConsole) : () => {
    };
    let inside = false;
    function safely(fn) {
      return (...args) => {
        if (inside) return;
        inside = true;
        try {
          fn(...args);
        } catch (e) {
          try {
            nativeError("[apexops] internal error", e);
          } catch (e2) {
          }
        } finally {
          inside = false;
        }
      };
    }
    const queue = [];
    const recent = /* @__PURE__ */ Object.create(null);
    const signature = (ev) => `${ev.level} ${ev.message} ${ev.stack || ""}`;
    function enqueue(ev) {
      const now = Date.now();
      const sig = signature(ev);
      const hit = recent[sig];
      if (hit && now - hit.at < DEDUPE_WINDOW_MS) {
        hit.event.count += 1;
        return;
      }
      if (ev.level !== "error" && config.sample < 1 && Math.random() > config.sample) return;
      ev.count = 1;
      recent[sig] = { event: ev, at: now };
      if (queue.length >= QUEUE_CAP) queue.shift();
      queue.push(ev);
      if (queue.length >= MAX_BATCH_EVENTS) flush(false);
    }
    function makeEvent(level, message, stack) {
      const href = config.mapUrl ? config.mapUrl(host.location.href) : host.location.href;
      return {
        level,
        message: truncate(message, MAX_MESSAGE),
        stack: stack ? truncate(stack, MAX_STACK) : null,
        url: href.slice(0, 2048),
        userAgent: host.navigator.userAgent.slice(0, 512),
        release: config.release,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        context: { ...config.context },
        count: 1
      };
    }
    let failures = 0;
    let blockedUntil = 0;
    function onSendFailure() {
      failures += 1;
      if (failures >= 3) {
        const backoff = Math.min(MAX_BACKOFF_MS, 1e3 * Math.pow(2, failures - 3));
        blockedUntil = Date.now() + backoff;
      }
    }
    function onSendSuccess() {
      failures = 0;
      blockedUntil = 0;
    }
    function buildBatch() {
      const taken = queue.splice(0, MAX_BATCH_EVENTS);
      if (!taken.length) return null;
      let batch = taken;
      let body = JSON.stringify({ key: config.key, events: batch });
      while (body.length > MAX_BATCH_BYTES && batch.length > 1) {
        batch = batch.slice(0, Math.ceil(batch.length / 2));
        body = JSON.stringify({ key: config.key, events: batch });
      }
      if (batch.length < taken.length) queue.unshift(...taken.slice(batch.length));
      return body;
    }
    const flush = safely((isUnload) => {
      if (!queue.length) return;
      if (!isUnload && Date.now() < blockedUntil) return;
      const body = buildBatch();
      if (!body) return;
      if (isUnload && transport.sendOnUnload) {
        try {
          transport.sendOnUnload(body);
        } catch (e) {
        }
        return;
      }
      try {
        transport.send(body).then(
          (outcome) => outcome === "failure" ? onSendFailure() : onSendSuccess(),
          () => onSendFailure()
        );
      } catch (e) {
        onSendFailure();
      }
    });
    PATCHABLE.forEach((level) => {
      if (config.levels.indexOf(level) === -1) return;
      const original = hostConsole[level];
      if (typeof original !== "function") return;
      hostConsole[level] = function(...args) {
        try {
          original.apply(hostConsole, args);
        } catch (e) {
        }
        if (inside) return;
        inside = true;
        try {
          let stack = null;
          for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg instanceof Error && arg.stack) {
              stack = arg.stack;
              break;
            }
          }
          enqueue(makeEvent(level, args.map(stringify).join(" "), stack));
        } catch (e) {
        } finally {
          inside = false;
        }
      };
    });
    host.addEventListener(
      "error",
      safely((e) => {
        if (!e) return;
        const msg = e.message || e.error && e.error.message || "Uncaught error";
        let stack = e.error && e.error.stack ? e.error.stack : null;
        if (!stack && e.filename) stack = `${e.filename}:${e.lineno}:${e.colno}`;
        enqueue(makeEvent("error", msg, stack));
      })
    );
    host.addEventListener(
      "unhandledrejection",
      safely((e) => {
        const reason = e ? e.reason : null;
        const msg = reason && reason.message ? reason.message : stringify(reason);
        const stack = reason && reason.stack ? reason.stack : null;
        enqueue(makeEvent("error", `Unhandled promise rejection: ${msg}`, stack));
      })
    );
    const timer = host.setInterval(() => flush(false), FLUSH_INTERVAL_MS);
    if (timer && typeof timer === "object" && timer.unref) timer.unref();
    host.addEventListener("pagehide", () => flush(true));
    host.document.addEventListener("visibilitychange", () => {
      if (host.document.visibilityState === "hidden") flush(true);
    });
    host.addEventListener("beforeunload", () => flush(true));
    return { flush };
  }

  // src/sdk-core/v1-entry.ts
  function findOwnScript() {
    const current = document.currentScript;
    if (current) return current;
    const all = document.getElementsByTagName("script");
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("/sdk/v1.js") !== -1) return all[i];
    }
    return null;
  }
  function boot() {
    const script = findOwnScript();
    if (!script) return;
    const d = script.dataset || {};
    const key = d.project || "";
    if (!key) return;
    const origin = (() => {
      if (d.endpoint) return d.endpoint.replace(/\/$/, "");
      try {
        return new URL(script.src).origin;
      } catch (e) {
        return "";
      }
    })();
    const endpoint = `${origin}/api/ingest`;
    const levels = (d.levels || "error,warn").split(",").map((s) => s.trim()).filter(Boolean);
    let sample = d.sample !== void 0 ? parseFloat(d.sample) : 1;
    if (isNaN(sample) || sample < 0 || sample > 1) sample = 1;
    const transport = {
      send: (body) => fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Apexops-Key": key },
        body,
        keepalive: true,
        mode: "cors",
        credentials: "omit"
      }).then((res) => res && (res.status === 429 || res.status >= 500) ? "failure" : "ok")
    };
    if (navigator.sendBeacon) {
      transport.sendOnUnload = (body) => {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      };
    }
    startCapture({ key, levels, release: d.release || null, sample }, transport);
  }
  boot();
})();
