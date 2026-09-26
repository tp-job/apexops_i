// Generates the toolbar icons into public/icon/<size>.png (WXT picks them up).
//
//   npm run icons --workspace app/extension
//
// Written rather than drawn so the mark can be regenerated at any size and
// stays the web app's: the lime accent (#C5F43A) with the dark "activity"
// pulse the sidebar uses. Lime is the background, not the glyph, because a
// dark-on-dark icon disappears in a dark browser toolbar.
//
// No image library: a PNG is a zlib stream of filtered scanlines plus three
// chunks, which is less code than a dependency. Shapes are drawn by distance
// field at 4x and averaged down, which is where the smooth edges come from.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BG = [0xc5, 0xf4, 0x3a]; // --color-brand-accent
const FG = [0x22, 0x22, 0x22]; // --color-brand-dark
const SS = 4; // supersampling factor

/** feather "activity", in its 24x24 box: M22 12h-4l-3 9L9 3l-3 9H2 */
const GLYPH = [
    [22, 12],
    [18, 12],
    [15, 21],
    [9, 3],
    [6, 12],
    [2, 12],
];

const distanceToSegment = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

function render(size) {
    const n = size * SS;
    const radius = n * 0.22;
    const pad = n * 0.17;
    const scale = (n - pad * 2) / 24;
    // Thicker at small sizes: a 2/24 stroke is under one pixel on a 16px icon.
    const stroke = (size <= 32 ? 2.9 : 2.3) * scale;
    const pts = GLYPH.map(([x, y]) => [pad + x * scale, pad + y * scale]);

    // coverage[i] = how much of pixel i is glyph (0..1), and inside[i] the square.
    const rgba = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let bg = 0;
            let fg = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const px = x * SS + sx + 0.5;
                    const py = y * SS + sy + 0.5;
                    // Rounded square: distance to the inner rect, clamped corners.
                    const cx = Math.min(Math.max(px, radius), n - radius);
                    const cy = Math.min(Math.max(py, radius), n - radius);
                    if (Math.hypot(px - cx, py - cy) <= radius) bg += 1;
                    let d = Infinity;
                    for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distanceToSegment(px, py, pts[i], pts[i + 1]));
                    if (d <= stroke / 2) fg += 1;
                }
            }
            const total = SS * SS;
            const a = bg / total;
            const g = Math.min(fg / total, a);
            const mix = (i) => Math.round((BG[i] * (a - g) + FG[i] * g) / (a || 1));
            const o = (y * size + x) * 4;
            rgba[o] = mix(0);
            rgba[o + 1] = mix(1);
            rgba[o + 2] = mix(2);
            rgba[o + 3] = Math.round(a * 255);
        }
    }
    return rgba;
}

const crcTable = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
};

function png(size, rgba) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // truecolour + alpha
    // Each scanline is prefixed with filter type 0 (none).
    const raw = Buffer.alloc(size * (size * 4 + 1));
    for (let y = 0; y < size; y++) {
        raw[y * (size * 4 + 1)] = 0;
        rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const outDir = fileURLToPath(new URL('../public/icon/', import.meta.url));
mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 96, 128]) {
    writeFileSync(`${outDir}${size}.png`, png(size, render(size)));
    console.log(`wrote public/icon/${size}.png`);
}
