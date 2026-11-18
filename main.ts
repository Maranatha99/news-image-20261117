// THE WORLD — Tuesday 17 November 2026
// A one-day newspaper front page, drawn pixel by pixel in pure Node.js stdlib.
// No network, no dependencies, deterministic output: the same bytes every run.
//
// Writes one 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png).

import * as fs from "node:fs";
import * as path from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette ---
type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 233];
const INK: RGB = [25, 25, 25];
const RED: RGB = [155, 27, 27];
const BLUE: RGB = [31, 78, 121];
const SEA: RGB = [46, 110, 158];
const SKY: RGB = [174, 205, 226];
const GREY: RGB = [110, 110, 110];
const LIGHTGREY: RGB = [185, 185, 178];
const ORANGE: RGB = [214, 106, 24];
const YELLOW: RGB = [232, 183, 40];
const GOLD: RGB = [184, 134, 11];
const OLIVE: RGB = [90, 107, 58];
const TAN: RGB = [196, 164, 120];
const BROWN: RGB = [139, 58, 42];
const WHITE: RGB = [255, 255, 255];

// ---------------------------------------------------------------- PNG ------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width: number, height: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------- 5x7 bitmap font ---
// Each glyph is 7 rows of 5 bits ("1" = ink). Uppercase A-Z, digits, punctuation.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
};

function glyph(ch: string): string[] {
  return FONT[ch] ?? FONT[" "];
}

// ---------------------------------------------------------------- canvas ---
class Canvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Buffer;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
    }
  }

  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    for (let yy = y; yy < y + t; yy++) {
      for (let xx = x0; xx <= x1; xx++) this.px(xx, yy, c);
    }
  }

  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    for (let xx = x; xx < x + t; xx++) {
      for (let yy = y0; yy <= y1; yy++) this.px(xx, yy, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Filled circle.
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      const dy = y - cy;
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let x = cx - dx; x <= cx + dx; x++) this.px(x, y, c);
    }
  }

  // Circle outline, stamped as small squares so the stroke has width t.
  circleOutline(cx: number, cy: number, r: number, c: RGB, t = 2): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(cx + r * Math.cos(rad));
      const y = Math.round(cy + r * Math.sin(rad));
      this.rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    }
  }

  // Filled triangle (barycentric, works for either winding).
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.max(0, Math.min(x0, x1, x2));
    const maxX = Math.min(this.w - 1, Math.max(x0, x1, x2));
    const minY = Math.max(0, Math.min(y0, y1, y2));
    const maxY = Math.min(this.h - 1, Math.max(y0, y1, y2));
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        if (a >= 0 && b >= 0 && 1 - a - b >= 0) this.px(x, y, c);
      }
    }
  }

  // Thick polyline: stamp filled circles along the Bresenham path.
  thickLine(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
    const r = Math.max(1, Math.floor(t / 2));
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.circle(x0, y0, r, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

// ------------------------------------------------------------------- text ---
function textWidth(text: string, scale: number): number {
  const t = text.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * 6 * scale - scale;
}

function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, c: RGB): void {
  const t = text.toUpperCase();
  for (let ci = 0; ci < t.length; ci++) {
    const g = glyph(t[ci]);
    const cx = x + ci * 6 * scale;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") cv.rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawTextCentered(cv: Canvas, text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, text, Math.round(cx - textWidth(text, scale) / 2), y, scale, c);
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (textWidth(test, scale) <= maxWidth || !cur) cur = test;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------ illustrations --
// Each draws into the box (x, y, w, h).

// Lead art: the Kerch (Crimean) Bridge, road span collapsed, smoke over the gap.
function drawBridge(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const waterY = y + h - 34;
  const deckY = y + 52;
  const gap = 70;
  const gapL = x + Math.floor(w / 2) - Math.floor(gap / 2);
  const gapR = x + Math.floor(w / 2) + Math.floor(gap / 2);
  // Water.
  cv.rect(x, waterY, w, 34, SEA);
  cv.hline(x + 40, x + 180, waterY + 10, WHITE, 2);
  cv.hline(x + 260, x + 420, waterY + 20, WHITE, 2);
  cv.hline(x + 560, x + 760, waterY + 10, WHITE, 2);
  cv.hline(x + 800, x + 920, waterY + 22, WHITE, 2);
  // Pillars from deck down to the water.
  for (const px of [x + 110, x + 300, x + w - 300, x + w - 110]) {
    cv.rect(px - 3, deckY + 8, 6, waterY - deckY - 8, INK);
  }
  // Deck, in two pieces with the collapsed gap in the middle.
  cv.rect(x, deckY, gapL - x, 8, INK);
  cv.rect(gapR, deckY, x + w - gapR, 8, INK);
  // Jagged broken ends at the gap.
  cv.tri(gapL - 12, deckY + 8, gapL, deckY + 8, gapL - 4, deckY + 22, INK);
  cv.tri(gapR + 12, deckY + 8, gapR, deckY + 8, gapR + 4, deckY + 22, INK);
  // The great arch over the deck.
  for (let i = 0; i < 60; i++) {
    const t0 = i / 60;
    const t1 = (i + 1) / 60;
    const ax0 = Math.round(x + 80 + t0 * (w - 160));
    const ay0 = Math.round(deckY - 44 * Math.sin(Math.PI * t0));
    const ax1 = Math.round(x + 80 + t1 * (w - 160));
    const ay1 = Math.round(deckY - 44 * Math.sin(Math.PI * t1));
    cv.thickLine(ax0, ay0, ax1, ay1, INK, 5);
  }
  // Flame and smoke at the gap.
  cv.tri(gapL + 8, deckY, gapR - 8, deckY, x + Math.floor(w / 2), deckY - 26, ORANGE);
  cv.tri(gapL + 16, deckY, gapR - 16, deckY, x + Math.floor(w / 2), deckY - 14, YELLOW);
  cv.circle(x + Math.floor(w / 2) - 12, deckY - 34, 10, LIGHTGREY);
  cv.circle(x + Math.floor(w / 2) + 14, deckY - 48, 12, LIGHTGREY);
  cv.circle(x + Math.floor(w / 2) + 30, deckY - 62, 9, GREY);
  // A small boat passing under the arch.
  const bx = x + Math.floor(w * 0.72);
  cv.rect(bx, waterY + 8, 46, 8, WHITE);
  cv.tri(bx + 46, waterY + 8, bx + 58, waterY + 16, bx + 46, waterY + 16, WHITE);
  cv.vline(bx + 22, waterY - 8, waterY + 8, INK, 2);
}

// A tanker ablaze in the Strait of Hormuz.
function drawTanker(cv: Canvas, x: number, y: number, _w: number, _h: number): void {
  cv.rect(x, y + 44, 64, 20, SEA);
  cv.hline(x + 4, x + 22, y + 52, WHITE, 2);
  cv.hline(x + 36, x + 58, y + 56, WHITE, 2);
  cv.rect(x + 4, y + 32, 56, 14, BROWN);
  cv.tri(x + 60, y + 32, x + 64, y + 39, x + 60, y + 46, BROWN);
  cv.rect(x + 12, y + 20, 14, 12, WHITE);
  cv.rect(x + 40, y + 22, 8, 10, INK);
  cv.tri(x + 36, y + 22, x + 48, y + 22, x + 42, y + 8, ORANGE);
  cv.tri(x + 39, y + 22, x + 45, y + 22, x + 42, y + 14, YELLOW);
  cv.circle(x + 46, y + 4, 5, LIGHTGREY);
  cv.circle(x + 52, y + 10, 4, GREY);
}

// An aid truck with a red cross on its cargo box.
function drawTruck(cv: Canvas, x: number, y: number, _w: number, _h: number): void {
  cv.hline(x + 2, x + 62, y + 54, GREY, 3);
  cv.rect(x + 6, y + 22, 32, 26, WHITE);
  cv.rect(x + 6, y + 22, 32, 2, INK);
  cv.rect(x + 6, y + 46, 32, 2, INK);
  cv.rect(x + 6, y + 22, 2, 26, INK);
  cv.rect(x + 36, y + 22, 2, 26, INK);
  // Red cross on the cargo box.
  cv.rect(x + 20, y + 28, 4, 14, RED);
  cv.rect(x + 15, y + 33, 14, 4, RED);
  // Cab and window.
  cv.rect(x + 40, y + 30, 14, 18, BLUE);
  cv.rect(x + 44, y + 33, 7, 7, SKY);
  // Wheels.
  cv.circle(x + 14, y + 50, 5, INK);
  cv.circle(x + 46, y + 50, 5, INK);
  cv.circle(x + 14, y + 50, 2, LIGHTGREY);
  cv.circle(x + 46, y + 50, 2, LIGHTGREY);
}

// A fighter jet in side profile, scrambled, with contrail and clouds.
function drawJet(cv: Canvas, x: number, y: number, _w: number, _h: number): void {
  cv.circle(x + 10, y + 10, 7, LIGHTGREY);
  cv.circle(x + 18, y + 8, 6, LIGHTGREY);
  cv.circle(x + 50, y + 54, 7, LIGHTGREY);
  cv.circle(x + 58, y + 52, 6, LIGHTGREY);
  // Contrail behind the jet.
  for (let i = 0; i < 4; i++) cv.hline(x + 2 + i * 3, x + 3 + i * 3, y + 32, GREY, 1);
  // Tail fin, swept back.
  cv.tri(x + 12, y + 30, x + 6, y + 18, x + 18, y + 30, BLUE);
  // Fuselage, nose to the right.
  cv.rect(x + 8, y + 30, 44, 6, BLUE);
  cv.tri(x + 52, y + 30, x + 62, y + 33, x + 52, y + 36, BLUE);
  // Canopy bump near the nose.
  cv.tri(x + 36, y + 30, x + 40, y + 24, x + 46, y + 30, BLUE);
  // Swept main wing, down and back.
  cv.tri(x + 30, y + 36, x + 20, y + 52, x + 40, y + 36, BLUE);
}

// Hills, an advancing arrow and a flag — Yemen.
function drawHills(cv: Canvas, x: number, y: number, _w: number, _h: number): void {
  cv.tri(x, y + 64, x + 30, y + 28, x + 60, y + 64, OLIVE);
  cv.tri(x + 18, y + 64, x + 46, y + 38, x + 64, y + 64, TAN);
  // Advancing arrow, up and to the right.
  cv.thickLine(x + 8, y + 52, x + 50, y + 20, RED, 4);
  cv.thickLine(x + 50, y + 20, x + 38, y + 22, RED, 4);
  cv.thickLine(x + 50, y + 20, x + 46, y + 32, RED, 4);
  // Flag on the high hill.
  cv.vline(x + 30, y + 10, y + 30, INK, 2);
  cv.tri(x + 32, y + 10, x + 48, y + 15, x + 32, y + 20, RED);
}

// The scales of justice — the court story.
function drawScales(cv: Canvas, x: number, y: number, _w: number, _h: number): void {
  cv.circle(x + 32, y + 12, 3, INK);
  cv.vline(x + 31, y + 14, y + 54, INK, 3);
  cv.hline(x + 12, x + 52, y + 16, INK, 3);
  cv.hline(x + 22, x + 42, y + 56, INK, 3);
  // Left pan.
  cv.line(x + 14, y + 18, x + 8, y + 32, INK);
  cv.line(x + 14, y + 18, x + 20, y + 32, INK);
  cv.tri(x + 6, y + 32, x + 22, y + 32, x + 14, y + 40, GOLD);
  // Right pan.
  cv.line(x + 50, y + 18, x + 44, y + 32, INK);
  cv.line(x + 50, y + 18, x + 56, y + 32, INK);
  cv.tri(x + 42, y + 32, x + 58, y + 32, x + 50, y + 40, GOLD);
}

// ------------------------------------------------------------- front page ---
interface Story {
  headline: string;
  subhead: string;
  art: (cv: Canvas, x: number, y: number, w: number, h: number) => void;
}

const STORIES: Story[] = [
  {
    headline: "TANKERS HIT BY MINES IN HORMUZ",
    subhead: "Fourth tanker ablaze as US-Iran tensions escalate; US strikes IRGC launch site",
    art: drawTanker,
  },
  {
    headline: "WEST URGES ISRAEL: OPEN GAZA AID CROSSINGS",
    subhead: "UK, Australia, Canada, Italy call situation catastrophic as strike kills three",
    art: drawTruck,
  },
  {
    headline: "JAPAN SCRAMBLES JETS AS RUSSIAN PLANES ENTER AIRSPACE",
    subhead: "Tokyo protests after two suspected Russian aircraft violate airspace",
    art: drawJet,
  },
  {
    headline: "HOUTHIS ADVANCE IN YEMEN",
    subhead: "Government forces retreat from Red Sea coast to defend Aden",
    art: drawHills,
  },
  {
    headline: "DEPARDIEU ADMITS SEXUAL ASSAULT CHARGE",
    subhead: "French star drops appeal before Paris court",
    art: drawScales,
  },
];

function drawFrontPage(): Canvas {
  const cv = new Canvas(W, H, PAPER);

  // Double frame.
  cv.hline(14, W - 15, 14, INK, 3);
  cv.hline(14, W - 15, H - 17, INK, 3);
  cv.vline(14, 14, H - 15, INK, 3);
  cv.vline(W - 17, 14, H - 15, INK, 3);
  cv.hline(22, W - 23, 22, INK, 1);
  cv.hline(22, W - 23, H - 23, INK, 1);
  cv.vline(22, 22, H - 23, INK, 1);
  cv.vline(W - 23, 22, H - 23, INK, 1);

  // Masthead: globe left, THE WORLD centre, red "17" badge right.
  const gx = 113;
  const gy = 87;
  cv.circle(gx, gy, 35, SKY);
  cv.circleOutline(gx, gy, 35, INK, 2);
  cv.vline(gx, gy - 35, gy + 35, INK, 1);
  cv.hline(gx - 35, gx + 35, gy, INK, 1);
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    cv.px(Math.round(gx + 14 * Math.cos(rad)), Math.round(gy + 35 * Math.sin(rad)), INK);
  }
  drawTextCentered(cv, "THE WORLD", W / 2, 46, 13, INK);
  cv.rect(876, 52, 70, 70, RED);
  drawTextCentered(cv, "17", 911, 76, 5, WHITE);

  // Rules and the date line.
  cv.hline(30, W - 31, 146, INK, 3);
  cv.hline(30, W - 31, 152, INK, 1);
  drawTextCentered(cv, "TUESDAY 17 NOVEMBER 2026", W / 2, 164, 4, INK);
  drawText(cv, "EST. 2026", 30, 171, 2, INK);
  drawText(cv, "NO. 321", W - 30 - textWidth("NO. 321", 2), 171, 2, INK);
  cv.hline(30, W - 31, 200, INK, 2);

  // Lead story.
  drawTextCentered(cv, "UKRAINE HITS", W / 2, 216, 7, INK);
  drawTextCentered(cv, "CRIMEAN BRIDGE", W / 2, 273, 7, INK);
  const leadSub = wrapText(
    "Kerch link to Russia severely damaged, traffic halted; Moscow hits Kyiv bridges in reply",
    900,
    3,
  );
  let sy = 336;
  for (const line of leadSub) {
    drawTextCentered(cv, line, W / 2, sy, 3, INK);
    sy += 25;
  }
  drawBridge(cv, 30, 392, W - 60, 160);

  // Divider.
  cv.hline(30, W - 31, 566, INK, 3);
  cv.hline(30, W - 31, 572, INK, 1);

  // Five more stories, one row each, small illustration on the right.
  const rowY = [580, 658, 736, 814, 892];
  for (let i = 0; i < STORIES.length; i++) {
    const ry = rowY[i];
    const s = STORIES[i];
    drawText(cv, s.headline, 30, ry + 4, 3, INK);
    const sub = wrapText(s.subhead, 840, 2);
    let yy = ry + 30;
    for (const line of sub) {
      drawText(cv, line, 30, yy, 2, INK);
      yy += 16;
    }
    s.art(cv, 930, ry + 5, 64, 64);
    if (i < STORIES.length - 1) cv.hline(30, W - 31, ry + 78, LIGHTGREY, 1);
  }

  // Footer.
  drawTextCentered(cv, "THE WORLD - TUESDAY 17 NOVEMBER 2026 - ONE DAY, ONE IMAGE", W / 2, 978, 2, INK);

  return cv;
}

// ------------------------------------------------------------------- main ---
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  const cv = drawFrontPage();
  const png = encodePNG(W, H, cv.buf);
  fs.writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes, ${W}x${H})`);
}

main();
