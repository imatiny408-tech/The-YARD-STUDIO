// Builds a single self-contained preview.html (inline CSS + JS) of the whole app.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "preview/dist");
mkdirSync(out, { recursive: true });

execSync(`npx @tailwindcss/cli -i app/globals.css -o preview/dist/app.css --minify`, { cwd: root, stdio: "inherit" });

const res = await build({
  entryPoints: [path.join(root, "preview/entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  charset: "ascii",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": path.join(root, "preview/shims/link.tsx"),
    "next/navigation": path.join(root, "preview/shims/navigation.tsx"),
    "@": root,
  },
  logLevel: "warning",
});

const css = readFileSync(path.join(out, "app.css"), "utf8");
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>The Yard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--font-inter:"Inter Tight";--font-bubble-face:"Bagel Fat One";--font-mono:"JetBrains Mono";color-scheme:dark;padding:0!important}
html,body{background:#070707;color:#fff;margin:0}
${css}
</style>
<div id="yard" class="font-sans"></div>
<script>${js}</script>
`;
writeFileSync(path.join(out, "preview.html"), html);
console.log("preview.html", (html.length / 1024).toFixed(0), "KB");
