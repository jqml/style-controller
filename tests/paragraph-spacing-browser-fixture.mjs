// Run against the active Obsidian runtime CSS and Pro snippets.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const asar = readFileSync(process.env.OBSIDIAN_ASAR_PATH);
const size = asar.readUInt32LE(12), header = JSON.parse(asar.subarray(16, 16 + size));
const cssFile = header.files["app.css"];
const appCss = asar.subarray(16 + size + Number(cssFile.offset), 16 + size + Number(cssFile.offset) + cssFile.size).toString();
const pluginCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const snippetDirectory = process.env.OBSIDIAN_PRO_SNIPPETS;
const appearance = JSON.parse(readFileSync(path.join(snippetDirectory, "..", "appearance.json")));
const snippets = appearance.enabledCssSnippets.map(name => path.join(snippetDirectory, name + ".css")).filter(existsSync).map(p => readFileSync(p, "utf8")).join("\n");
const markup = `<div class="el-h2"><h2>Heading</h2></div><div class="el-p"><p>First paragraph with a soft\nline break.</p></div><div class="el-p"><p>Second paragraph<br>with a hard break.</p></div><div class="el-p"><p>Third paragraph.</p></div><div class="el-h3"><h3>Next heading</h3></div><div class="el-ul"><ul><li><p>List paragraph</p><p>List paragraph two</p></li></ul></div><div class="el-pre"><pre><code>Code</code></pre></div><div class="el-div"><div class="math-block">Equation</div></div><div class="el-table"><table><tbody><tr><td>Cell</td></tr></tbody></table></div><div class="el-div"><div class="callout"><div class="callout-content"><p>Callout paragraph</p><p>Another paragraph</p></div></div></div><div class="el-p"><p>Before image</p></div><div class="el-p"><p><span class="internal-embed image-embed"><img alt="image"></span></p></div><div class="el-p"><p>After image</p></div>`;
const html = `<!doctype html><html><head><style>${appCss}</style><style id="snippets">${snippets}</style><style>${pluginCss}</style></head><body class="theme-light"><script>
const markup=${JSON.stringify(markup)};
const results=[];
const style=e=>{const s=getComputedStyle(e);return [s.marginTop,s.marginBottom,s.padding,s.fontSize,s.lineHeight,s.whiteSpace]};
for(const useSnippets of [true,false])for(const theme of ['theme-light','theme-dark'])for(const lineHeight of [24,32]){
 document.getElementById('snippets').disabled=!useSnippets;
 document.body.className=theme;
 const scope=document.createElement('div');scope.className='osc-style-scope style-controller-field-line-height-active';scope.style.setProperty('--osc-line-height',lineHeight+'px');scope.style.width='700px';scope.style.setProperty('--p-spacing','48px');
 scope.innerHTML='<div class="markdown-preview-view markdown-rendered"><div class="markdown-preview-sizer">'+markup+'</div></div>';document.body.append(scope);
 const paragraphs=[...scope.querySelectorAll('.markdown-preview-sizer > .el-p > p')];
 const other=()=>[...scope.querySelectorAll('h2,h3,li p,pre,table,.math-block,.callout p')].map(style);
 const before=other(),imageBefore=paragraphs.slice(3).map(style),firstStart=getComputedStyle(paragraphs[0]).marginTop,lastEnd=getComputedStyle(paragraphs[2]).marginBottom;
 scope.classList.add('style-controller-match-paragraph-spacing');
 const gaps=[1,2].map(i=>paragraphs[i].getBoundingClientRect().top-paragraphs[i-1].getBoundingClientRect().bottom);
 results.push({useSnippets,theme,lineHeight,gaps,firstEnd:getComputedStyle(paragraphs[0]).marginBottom,othersUnchanged:JSON.stringify(before)===JSON.stringify(other()),imageUnchanged:JSON.stringify(imageBefore)===JSON.stringify(paragraphs.slice(3).map(style)),firstStartUnchanged:firstStart===getComputedStyle(paragraphs[0]).marginTop,lastEndUnchanged:lastEnd===getComputedStyle(paragraphs[2]).marginBottom,softBreaks:paragraphs[0].querySelectorAll('br').length,hardBreaks:paragraphs[1].querySelectorAll('br').length});
 scope.remove();
}
document.documentElement.dataset.result=encodeURIComponent(JSON.stringify(results));
</script></body></html>`;
const directory = mkdtempSync(path.join(tmpdir(), "sc-paragraph-browser-"));
try {
  const file = path.join(directory, "fixture.html"); writeFileSync(file, html);
  const output = execFileSync(process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--dump-dom", `file://${file}`], { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });
  const encoded = output.match(/data-result="([^"]+)"/)?.[1]; assert.ok(encoded);
  const result = JSON.parse(decodeURIComponent(encoded));
  for (const row of result) {
    assert.equal(row.firstEnd, "0px");
    row.gaps.forEach(gap => assert.ok(Math.abs(gap - row.lineHeight) < 0.1, JSON.stringify(row)));
    for (const field of ["othersUnchanged", "imageUnchanged", "firstStartUnchanged", "lastEndUnchanged"]) assert.equal(row[field], true, field);
    assert.equal(row.softBreaks, 0); assert.equal(row.hardBreaks, 1);
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} finally { rmSync(directory, { recursive: true, force: true }); }
