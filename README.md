[![news-image-20261117](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117)
[![rank](https://make.fun/badge/news-image-20261117/Maranatha99/news-image-20261117/rank.svg)](https://make.fun/bounty/news-image-20261117)
[![reward](https://make.fun/badge/news-image-20261117/Maranatha99/news-image-20261117/reward.svg)](https://make.fun/bounty/news-image-20261117)

# THE WORLD — Tuesday 17 November 2026

A newspaper front page that sums up the world news of **Tuesday 17 November 2026** in a single image. Built for the [make.fun](https://make.fun/bounty/news-image-20261117) bounty **news-image-20261117** (referral code: `s11m3687`).

The program draws the whole front page pixel by pixel — masthead, date line, lead story and five more stories, each with a small drawn illustration — using a hand-rolled 5×7 bitmap font and a hand-written PNG encoder. Pure Node.js standard library, no packages, no network, deterministic output.

## The day's news

- **Lead — Ukraine hits Crimean Bridge:** the Kerch road span collapses, traffic halted; Moscow hits Kyiv bridges in reply.
- **Tankers hit by mines in Hormuz:** a fourth tanker ablaze as US–Iran tensions escalate; US strikes an IRGC launch site.
- **West urges Israel: open Gaza aid crossings:** the UK, Australia, Canada and Italy call the situation catastrophic as a strike kills three.
- **Japan scrambles jets as Russian planes enter airspace:** Tokyo protests after two suspected Russian aircraft violate its airspace.
- **Houthis advance in Yemen:** government forces retreat from the Red Sea coast to defend Aden.
- **Depardieu admits sexual assault charge:** the French star drops his appeal before a Paris court.

## How to run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes a 1024×1024 PNG (at most 1 MiB) to `out/entry.png`. Running it twice produces byte-identical files.

Requires Node.js 22 or newer (no dependencies to install).

## How it works

- `main.ts` builds a 1024×1024 RGB pixel buffer, draws the page with a tiny rasterizer (rectangles, lines, circles, triangles, an embedded 5×7 pixel font scaled up for headlines), then encodes it as a PNG with `node:zlib` deflate and hand-built PNG chunks (IHDR / IDAT / IEND with CRC32).
- Everything is fixed at build time: no clock, no randomness, no network, so the output is fully deterministic.
