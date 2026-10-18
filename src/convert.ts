import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html ?? '').trim();
}

// .docx e .pptx viram .md ao lado do original, para dar para buscar (grep) e ler sem ferramenta extra.
// PDF fica como está: o Claude Code lê PDF direto.
export async function extractText(path: string): Promise<string | null> {
  const ext = path.toLowerCase().split('.').pop();
  if (ext === 'docx') {
    const { value } = await mammoth.convertToHtml({ path });
    return htmlToMarkdown(value);
  }
  if (ext === 'pptx') {
    const zip = await JSZip.loadAsync(await readFile(path));
    const slideNo = (n: string) => Number(n.match(/(\d+)\.xml$/)?.[1] ?? 0);
    const slides = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => slideNo(a) - slideNo(b));
    const out: string[] = [];
    for (const name of slides) {
      const xml = await zip.file(name)!.async('string');
      // Cada <a:p> é um parágrafo; os <a:t> dentro dele são os trechos de texto
      const paras = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
        .map((p) => [...p[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => decodeXml(t[1])).join(''))
        .filter((t) => t.trim());
      out.push(`## Slide ${slideNo(name)}\n\n${paras.join('\n')}`);
    }
    return out.join('\n\n');
  }
  return null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
