import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons');

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function geometry(size) {
  const pad = Math.round(size * 0.08);
  const radius = Math.round(size * 0.22);
  const thickness = Math.max(1, Math.round(size * 0.055));
  const lines = [
    { y: 0.34, x1: 0.58, color: [255, 123, 114, 255] },
    { y: 0.5, x1: 0.78, color: [227, 179, 65, 255] },
    { y: 0.66, x1: 0.68, color: [63, 185, 80, 255] },
  ].map((line) => {
    const mid = Math.round(line.y * size);
    return {
      y0: mid - thickness / 2,
      y1: mid + thickness / 2,
      x0: Math.round(size * 0.24),
      x1: Math.round(size * line.x1),
      color: line.color,
    };
  });
  return { left: pad, top: pad, right: size - pad, bottom: size - pad, radius, lines };
}

function insideRoundRect(px, py, geom) {
  const { left, top, right, bottom, radius } = geom;
  if (px < left || py < top || px >= right || py >= bottom) return false;
  const cx = Math.min(Math.max(px, left + radius), right - radius);
  const cy = Math.min(Math.max(py, top + radius), bottom - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function sample(px, py, geom) {
  if (!insideRoundRect(px, py, geom)) return [0, 0, 0, 0];
  for (const line of geom.lines) {
    if (py >= line.y0 && py < line.y1 && px >= line.x0 && px < line.x1) return line.color;
  }
  return [28, 33, 40, 255];
}

function paint(x, y, geom) {
  const samples = 4;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let sy = 0; sy < samples; sy += 1) {
    for (let sx = 0; sx < samples; sx += 1) {
      const [pr, pg, pb, pa] = sample(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples, geom);
      r += pr * pa;
      g += pg * pa;
      b += pb * pa;
      a += pa;
    }
  }
  if (a === 0) return [0, 0, 0, 0];
  const count = samples * samples;
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / count)];
}

function png(size) {
  const geom = geometry(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, geom);
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128, 512]) writeFileSync(path.join(outDir, `icon-${size}.png`), png(size));
