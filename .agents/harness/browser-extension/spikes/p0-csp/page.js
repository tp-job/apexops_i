// Plays the hostile page: patches attachShadow before the content script
// runs (page scripts in <head> run before document_idle) and records CSP
// violations.
window.__violations = [];
document.addEventListener('securitypolicyviolation', (e) => {
    window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`);
});
window.__captured = [];
const original = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
    const root = original.call(this, init);
    window.__captured.push(root);
    return root;
};
window.__attack = () => {
    const iframe = document.getElementById('apexops-spike-panel');
    let iframeRead = 'blocked';
    try { iframeRead = iframe && iframe.contentDocument ? iframe.contentDocument.body.innerText : 'blocked (null)'; } catch (e) { iframeRead = 'blocked (' + e.name + ')'; }
    const viaPatch = window.__captured.map((r) => r.textContent).join('|');
    const viaShadowRoot = [...document.querySelectorAll('*')].map((el) => el.shadowRoot && el.shadowRoot.textContent).filter(Boolean).join('|');
    const shadowText = { viaPatch, viaShadowRoot, closedHostShadowRoot: String(document.getElementById('apexops-spike-host').shadowRoot) };
    const btn = window.__captured[0] && window.__captured[0].querySelector('button');
    return {
        injected: document.documentElement.dataset.spikeInjected === '1',
        tagScriptRan: document.documentElement.dataset.tagScript === '1',
        mainWorldRan: document.documentElement.dataset.mainWorld === '1',
        customElements: { isolated: document.documentElement.dataset.isolatedCE, main: document.documentElement.dataset.mainWorldCE },
        shadowReadByPage: shadowText,
        launcherBg: btn ? getComputedStyle(btn).backgroundColor : null,
        launcherRadius: btn ? getComputedStyle(btn).borderTopLeftRadius : null,
        iframeReadByPage: iframeRead,
        iframeSecretInPageHTML: document.documentElement.outerHTML.includes('SECRET-ISSUE-TITLE'),
        violations: window.__violations,
    };
};
