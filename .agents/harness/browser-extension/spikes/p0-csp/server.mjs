import http from 'node:http';
import { readFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const policies = {
    '/none': null,
    '/strict': "default-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'; connect-src 'self'",
    '/frame-none': "default-src 'none'; script-src 'self'; frame-src 'none'; child-src 'none'",
    '/sandboxless-strictest': "default-src 'none'; script-src 'self'; style-src 'none'; frame-src 'none'; img-src 'none'",
};

export const start = () => http.createServer((req, res) => {
    if (req.url === '/page.js') {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        return res.end(readFileSync(new URL('page.js', here)));
    }
    if (!(req.url in policies)) { res.writeHead(404); return res.end(); }
    const headers = { 'content-type': 'text/html' };
    if (policies[req.url]) headers['content-security-policy'] = policies[req.url];
    res.writeHead(200, headers);
    res.end('<!doctype html><html><head><script src="/page.js"></script></head><body><h1>test page</h1></body></html>');
}).listen(8799, '127.0.0.1');

export const variants = Object.keys(policies);
