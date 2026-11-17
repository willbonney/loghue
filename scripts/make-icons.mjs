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

function inRoundRect(x, y, size, radius) {
  const pad = size * 0.08;
  const left = pad;
  const top = pad;
  const right = size - pad;
  const bottom = size - pad;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius && x >= left && x < right && y >= top && y < bottom;
}

function paint(x, y, size) {
  if (!inRoundRect(x + 0.5, y + 0.5, size, size * 0.22)) return [0, 0, 0, 0];
  const lines = [
    { y: 0.34, x1: 0.58, color: [255, 123, 114, 255] },
    { y: 0.5, x1: 0.78, color: [227, 179, 65, 255] },
    { y: 0.66, x1: 0.68, color: [63, 185, 80, 255] },
  ];
  const px = (x + 0.5) / size;
  const py = (y + 0.5) / size;
  const thickness = Math.max(0.045, 1.2 / size);
  for (const line of lines) {
    if (Math.abs(py - line.y) <= thickness / 2 && px >= 0.24 && px <= line.x1) return line.color;
  }
  return [28, 33, 40, 255];
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
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
for (const size of [16, 48, 128]) writeFileSync(path.join(outDir, `icon-${size}.png`), png(size));
