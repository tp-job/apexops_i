// Spike: the launcher lives in a CLOSED shadow root with a <style> and an
// adopted sheet. The data panel is an extension-origin iframe. Nothing
// sensitive is put in the shadow root except a decoy string, so we can see
// whether page script can reach it.
(() => {
    const host = document.createElement('div');
    host.id = 'apexops-spike-host';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = 'button { background: rgb(124, 58, 237); color: white; }';
    root.append(style);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('button { border-radius: 9px; }');
    root.adoptedStyleSheets = [sheet];
    const button = document.createElement('button');
    button.textContent = 'DECOY-IN-SHADOW';
    root.append(button);

    const frame = document.createElement('iframe');
    frame.id = 'apexops-spike-panel';
    frame.src = chrome.runtime.getURL('panel.html');
    frame.style.cssText = 'position:fixed;right:16px;bottom:16px;width:280px;height:200px;border:0;z-index:2147483647';

    // Control: an OPEN root. If the page cannot read this one either, the
    // attack instrument is broken and the closed-root result means nothing.
    const openHost = document.createElement('div');
    openHost.id = 'apexops-spike-open';
    openHost.attachShadow({ mode: 'open' }).textContent = 'DECOY-OPEN';

    document.documentElement.append(host, openHost, frame);
    document.documentElement.dataset.spikeInjected = '1';
    // VisBug's own path: a <script> tag pointing at a web-accessible file.
    const tag = document.createElement('script');
    tag.src = chrome.runtime.getURL('tag.js');
    document.documentElement.append(tag);
    document.documentElement.dataset.isolatedCE = String(!!window.customElements);
})();
