import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { APIRequestContext } from 'playwright';
import { config } from './config.js';
import { extractText, htmlToMarkdown } from './convert.js';
import { onLoginScreen, sessionFileUrl, type ModContent } from './moodle.js';
import { asFile, SessionExpired } from './web.js';

// Pasta materias/: manifesto, downloads e troca de links. Usado pelo sync e pela busca de uma atividade só.

// icon: imagem decorativa (pequena ou repetida em vários textos), não é salva e não é baixada de novo
// hash: conteúdo das imagens citadas em textos, para reconhecer a mesma imagem em vários lugares
type ManifestEntry = { timemodified: number; filesize: number; path: string; icon?: boolean; hash?: string };
const manifestFile = join(config.outDir, '.manifest.json');
const manifest: Record<string, ManifestEntry> = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
export const stats = { downloaded: 0, unchanged: 0, skipped: 0, icons: 0, failed: 0 };
// URL do Moodle → arquivo local, para trocar links dentro das páginas pelos arquivos baixados
const localFile = new Map<string, string>();
const fileKey = (url: string) => sessionFileUrl(url).replace(/[?&]forcedownload=1/, '');

// Imagens decorativas: a mesma imagem (mesmo conteúdo) citada em mais de um texto, como o ícone de "slides"
// que um professor repete ao lado de cada vídeo. Os hashes ficam salvos para as próximas execuções.
const decorativeFile = join(config.outDir, '.decorativas.json');
const decorative = new Set<string>(existsSync(decorativeFile) ? JSON.parse(readFileSync(decorativeFile, 'utf8')) : []);
const seenImage = new Map<string, string>(); // hash → chave do manifesto da primeira vez que apareceu

// Marca a imagem como ícone (sem arquivo local, o link continua apontando para o Moodle)
function markIcon(key: string) {
  const entry = manifest[key];
  // unlinkSync e não rmSync: neste Windows o rmSync({ force }) não apaga caminhos com acento e não avisa
  if (entry?.path && existsSync(join(config.outDir, entry.path))) unlinkSync(join(config.outDir, entry.path));
  if (entry) Object.assign(entry, { path: '', icon: true });
  localFile.delete(key);
}

// true se a imagem é decorativa; na segunda aparição do mesmo conteúdo, a primeira também vira ícone
function isDecorative(key: string, hash: string): boolean {
  if (decorative.has(hash)) return true;
  const first = seenImage.get(hash);
  if (first && first !== key) {
    decorative.add(hash);
    markIcon(first);
    return true;
  }
  seenImage.set(hash, key);
  return false;
}

export const IMAGE = /\.(png|jpe?g|gif|svg|webp|bmp)$/i;

export function saveManifest() {
  mkdirSync(config.outDir, { recursive: true });
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  writeFileSync(decorativeFile, JSON.stringify([...decorative]));
}

// Nomes válidos no Windows e curtos o bastante para o limite de caminho
export function safe(name: string, max = 80): string {
  const s = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .replace(/[. ]+$/, '');
  return s || 'sem-nome';
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const rel = (p: string) => relative(config.outDir, p).replaceAll('\\', '/');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function write(path: string, data: string | Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

type DownloadOptions = { skipIcons?: boolean };

// Baixa um arquivo do Moodle pela sessão do navegador; devolve o caminho local ou null se ficou de fora
async function download(request: APIRequestContext, file: ModContent, dest: string, opts: DownloadOptions = {}): Promise<string | null> {
  if (!file.fileurl) return null;
  const url = sessionFileUrl(file.fileurl);
  const key = fileKey(file.fileurl);
  if ((file.filesize ?? 0) > config.maxFileMb * 1024 * 1024) {
    stats.skipped++;
    console.log(`   - grande demais, só link: ${file.filename}`);
    return null;
  }
  const known = manifest[key];
  const same = known && known.timemodified === (file.timemodified ?? 0) && known.filesize === (file.filesize ?? 0);
  if (same && known.icon && opts.skipIcons) {
    stats.icons++;
    return null;
  }
  if (same && !known.icon && known.hash && opts.skipIcons && isDecorative(key, known.hash)) {
    markIcon(key);
    stats.icons++;
    return null;
  }
  if (same && !known.icon && existsSync(join(config.outDir, known.path))) {
    stats.unchanged++;
    localFile.set(key, join(config.outDir, known.path));
    return join(config.outDir, known.path);
  }
  // Dois módulos da mesma seção com o mesmo nome de arquivo: o segundo ganha " (2)", em vez de sobrescrever o primeiro
  const taken = (p: string) => [...localFile.entries()].some(([k, v]) => v === p && k !== key);
  for (let n = 2; taken(dest); n++) dest = dest.replace(/( \(\d+\))?(\.[^./\\]*)?$/, ` (${n})$2`);
  try {
    const res = await request.get(url, { timeout: 120_000 });
    if (onLoginScreen(res.url())) throw new SessionExpired();
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const body = await res.body();
    await sleep(config.delayMs);
    // Imagens em textos: pequenas ou repetidas são ícones; o link fica apontando para o Moodle
    const hash = opts.skipIcons && IMAGE.test(file.filename) ? createHash('sha1').update(body).digest('hex') : undefined;
    if (hash && (body.length < config.iconMaxKb * 1024 || isDecorative(key, hash))) {
      manifest[key] = { timemodified: file.timemodified ?? 0, filesize: file.filesize ?? 0, path: '', icon: true, hash };
      stats.icons++;
      return null;
    }
    write(dest, body);
    const text = await extractText(dest).catch(() => null);
    if (text) write(`${dest}.md`, text);
    localFile.set(key, dest);
    manifest[key] = { timemodified: file.timemodified ?? 0, filesize: file.filesize ?? 0, path: rel(dest), hash };
    stats.downloaded++;
    console.log(`   + ${rel(dest)}`);
    return dest;
  } catch (err) {
    if (err instanceof SessionExpired) throw err;
    stats.failed++;
    console.warn(`   ! falhou ${file.filename}: ${(err as Error).message}`);
    return null;
  }
}

// Baixa os arquivos de um módulo; os .html (Página, Livro) viram .md
export async function downloadContents(
  request: APIRequestContext,
  files: ModContent[],
  dir: string,
  opts: DownloadOptions = {},
): Promise<string[]> {
  const saved: string[] = [];
  for (const f of files.filter((c) => c.type === 'file')) {
    const sub = (f.filepath ?? '/').split('/').filter(Boolean).map((p) => safe(p));
    const path = await download(request, f, join(dir, ...sub, safe(f.filename, 120)), opts);
    if (!path) continue;
    if (/\.html?$/i.test(path)) {
      const md = path.replace(/\.html?$/i, '.md');
      write(md, htmlToMarkdown(readFileSync(path, 'utf8')));
      saved.push(md);
    } else saved.push(path);
  }
  // Uma imagem baixada pode ter virado ícone ao aparecer de novo no mesmo lote
  return saved.filter((p) => existsSync(p));
}

// Troca links do Moodle para arquivos já baixados pelo caminho local (imagens e anexos dentro de páginas)
export function relink(md: string, fromDir: string): string {
  return md.replace(/https?:\/\/[^\s)"'<>]+\/pluginfile\.php\/[^\s)"'<>]+/g, (url) => {
    const local = localFile.get(fileKey(url.replace(/&amp;/g, '&')));
    // Parênteses também, senão "arquivo (2).pdf" fecha o link do Markdown no meio
    return local ? encodeURI(relative(fromDir, local).replaceAll('\\', '/')).replace(/\(/g, '%28').replace(/\)/g, '%29') : url;
  });
}

// Arquivos do Moodle citados num texto (só os das atividades e seções, não logotipos do tema).
// Baixe com { skipIcons: true }: imagens pequenas ficam como link, as maiores (diagramas, prints) são salvas.
export function embeddedFiles(md: string): ModContent[] {
  const urls = md.match(/https?:\/\/[^\s)"'<>]+\/pluginfile\.php\/\d+\/(mod_|course\/|question\/)[^\s)"'<>]+/g) ?? [];
  const byUrl = new Map(urls.map((u) => asFile(u.replace(/&amp;/g, '&'))).map((f) => [f.fileurl, f]));
  return [...byUrl.values()].filter((f) => !localFile.has(fileKey(f.fileurl!)));
}
