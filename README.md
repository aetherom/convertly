# Fileverse

Free, private file editors & converters. Everything runs 100% locally in your browser — nothing ever uploads.

## Develop
npm install
npm run dev

## Build
npm run build       # outputs to dist/

## Deploy
Cloudflare Pages: build command `npm run build`, output dir `dist`.
The included `public/_redirects` makes SPA deep-links work.

## Stack
React 18 · TypeScript · Vite · Tailwind · TipTap (rich text) ·
pdf.js (render) · pdf-lib (edit) · SheetJS (spreadsheets) · JSZip · WebCrypto.
