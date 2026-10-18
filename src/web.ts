import type { APIRequestContext, Page } from 'playwright';
import { config } from './config.js';
import { moodleAjax, onLoginScreen, type ModContent, type Module, type Section } from './moodle.js';

// Modo web: para Moodles que não liberam core_course_get_contents por AJAX (caso da UTFPR).
// A estrutura vem de core_courseformat_get_state (o mesmo que a tela da disciplina usa) e o conteúdo,
// das páginas de cada seção e atividade. Devolve o mesmo formato do modo api, para o sync tratar os dois igual.

export class SessionExpired extends Error {
  constructor() {
    super('sessão do Moodle expirou (redirecionou para o login)');
  }
}

export type StateSection = { id: string; number: number; title: string; visible: boolean; cmlist: string[]; sectionurl: string };
export type StateCm = { id: string; name: string; module: string; url?: string; uservisible: boolean };
export type CourseState = { section: StateSection[]; cm: StateCm[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Falhas e conteúdos vazios do modo web, para o resumo final não dizer "0 falhas" com módulos em branco
export const webStats = { failed: 0, empty: 0 };
const PLUGINFILE = /\/pluginfile\.php\//;

// Transforma um link do pluginfile num "arquivo" no formato do web service
export function asFile(url: string): ModContent {
  const u = new URL(url);
  // Pastas mostram miniaturas (?preview=tinyicon&oid=...) ao lado do link; sem esses parâmetros vem o arquivo inteiro
  for (const p of ['forcedownload', 'preview', 'oid']) u.searchParams.delete(p);
  const parts = u.pathname.split('/').map(decodeURIComponent);
  const filename = parts.pop()!;
  // /pluginfile.php/<ctx>/mod_folder/content/<rev>/sub/pasta/arquivo → filepath /sub/pasta/
  const i = parts.indexOf('content');
  const filepath = u.pathname.includes('/mod_folder/') && i >= 0 ? `/${parts.slice(i + 2).join('/')}${parts.length > i + 2 ? '/' : ''}` : '/';
  // A revisão no caminho muda quando o professor troca o arquivo, então a URL basta como chave do manifesto
  return { type: 'file', filename, filepath, fileurl: u.href, timemodified: 0, filesize: 0 };
}

async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (onLoginScreen(page.url())) throw new SessionExpired();
  await sleep(config.delayMs);
}

// Dados da página de uma atividade: descrição/enunciado, datas, conteúdo principal e links de arquivos
async function scrapeActivity(page: Page, url: string, withMain: boolean, mainLinks: boolean) {
  await visit(page, url);
  return page.evaluate(
    // Sem funções nomeadas aqui dentro: o tsx injeta um helper __name que não existe no navegador
    ({ withMain, mainLinks }) => {
      const intro = (document.querySelector('.activity-description') ?? document.querySelector('#intro'))?.innerHTML ?? '';
      // A versão de impressão do Livro pode não ter [role="main"]
      const mainEl = document.querySelector('[role="main"]') ?? document.querySelector('#region-main') ?? document.body;
      // Botões e formulários (ex.: "Tentar responder o questionário agora") não interessam e nunca são acionados
      const clean = mainEl.cloneNode(true) as HTMLElement;
      clean.querySelectorAll('form, button, script, style, .singlebutton').forEach((el) => el.remove());
      const main = withMain ? clean.innerHTML : '';
      const scopes = ['.activity-header', '#intro', ...(mainLinks ? ['[role="main"]'] : [])];
      const links = scopes.flatMap((s) =>
        [...document.querySelectorAll<HTMLAnchorElement | HTMLImageElement>(`${s} a[href*="/pluginfile.php/"], ${s} img[src*="/pluginfile.php/"]`)].map(
          (el) => ('href' in el ? el.href : el.src),
        ),
      );
      return {
        intro,
        main,
        dates: (document.querySelector('[data-region="activity-dates"]') as HTMLElement | null)?.innerText.trim() ?? '',
        links: [...new Set(links)],
      };
    },
    { withMain, mainLinks },
  );
}

// view.php?redirect=1 responde com redirecionamento para o arquivo (Arquivo) ou para o site (URL)
async function redirectTarget(request: APIRequestContext, url: string): Promise<{ location?: string; html?: string }> {
  const res = await request.get(`${url}&redirect=1`, { maxRedirects: 0 });
  await sleep(config.delayMs);
  const location = res.headers()['location'];
  if (location && onLoginScreen(new URL(location, url).href) && new URL(location, url).origin === config.origin) throw new SessionExpired();
  if (location) return { location: new URL(location, url).href };
  return { html: res.ok() ? await res.text() : undefined };
}

export async function courseState(page: Page, courseid: number): Promise<CourseState> {
  return JSON.parse(await moodleAjax<string>(page, 'core_courseformat_get_state', { courseid }));
}

// A página da seção traz o nome completo das atividades (o estado corta) e o texto dos rótulos e descrições
export async function readSectionPage(page: Page, s: StateSection) {
  await visit(page, s.sectionurl);
  // O formato em blocos pode montar a seção por JS depois do carregamento
  await page.locator('[data-for="cmitem"]').first().waitFor({ timeout: 10_000 }).catch(() => {});
  const onPage = await page.evaluate((num) => {
    const items = [...document.querySelectorAll<HTMLElement>('[data-for="cmitem"]')].map((el) => ({
      id: el.dataset.id ?? '',
      name: el.querySelector('[data-activityname]')?.getAttribute('data-activityname') ?? el.dataset.title ?? '',
      alt: el.querySelector('.activity-altcontent')?.innerHTML ?? '',
    }));
    const summary = document.querySelector(
      `#section-${num} .summarytext, #section-${num} [data-for="sectioninfo"], #section-${num} .section_summary`,
    )?.innerHTML;
    return { items, summary: summary ?? '' };
  }, s.number);
  return { summary: onPage.summary, byId: new Map(onPage.items.map((i) => [i.id, { ...i, name: decodeEntities(i.name) }])) };
}

export async function webCourseContents(page: Page, request: APIRequestContext, courseid: number): Promise<Section[]> {
  const state = await courseState(page, courseid);
  const cms = new Map(state.cm.map((c) => [c.id, c]));
  const sections: Section[] = [];

  for (const s of [...state.section].sort((a, b) => a.number - b.number)) {
    if (!s.visible || !s.cmlist.length) continue;

    const { summary, byId } = await readSectionPage(page, s);
    if (!byId.size) {
      webStats.empty++;
      console.warn(`   ! seção "${s.title}": nenhuma atividade na página (nomes podem vir cortados e rótulos vazios)`);
    }

    const modules: Module[] = [];
    for (const cmid of s.cmlist) {
      const cm = cms.get(cmid);
      if (!cm || !cm.uservisible || cm.module === 'subsection') continue;
      const shown = byId.get(cmid);
      const mod: Module = {
        id: Number(cm.id),
        name: shown?.name || decodeEntities(cm.name),
        modname: cm.module,
        url: cm.url,
        description: shown?.alt ?? '',
        contents: [],
      };
      try {
        await fillModule(page, request, mod);
        const expectsBody = ['page', 'book', 'assign', 'quiz'].includes(mod.modname);
        const expectsFile = ['resource', 'url', 'folder'].includes(mod.modname);
        if ((expectsBody && !mod.bodyHtml?.trim()) || (expectsFile && !mod.contents?.length)) {
          webStats.empty++;
          console.warn(`   ! ${mod.name}: veio vazio da página do Moodle`);
        }
      } catch (err) {
        if (err instanceof SessionExpired) throw err;
        webStats.failed++;
        console.warn(`   ! ${mod.name}: ${(err as Error).message.split('\n')[0]}`);
      }
      modules.push(mod);
    }
    sections.push({ id: Number(s.id), section: s.number, name: s.title, summary, modules });
  }
  return sections;
}

export async function fillModule(page: Page, request: APIRequestContext, mod: Module) {
  if (!mod.url) return;
  switch (mod.modname) {
    case 'resource': {
      const { location, html } = await redirectTarget(request, mod.url);
      const fileUrl = location && PLUGINFILE.test(location) ? location : html?.match(/https?:\/\/[^"'\s<>]+\/pluginfile\.php\/[^"'\s<>]+/)?.[0];
      if (fileUrl) mod.contents = [asFile(fileUrl.replace(/&amp;/g, '&'))];
      return;
    }
    case 'url': {
      const { location } = await redirectTarget(request, mod.url);
      if (location) mod.contents = [{ type: 'url', filename: mod.name, fileurl: location }];
      return;
    }
    case 'folder': {
      const a = await scrapeActivity(page, mod.url, false, true);
      mod.contents = uniqueFiles(a.links);
      return;
    }
    case 'page':
    case 'book': {
      // Livro: a versão de impressão traz todos os capítulos numa página só
      const url = mod.modname === 'book' ? `${config.origin}/mod/book/tool/print/index.php?id=${mod.id}` : mod.url;
      const a = await scrapeActivity(page, url, true, true);
      mod.bodyHtml = [a.intro, a.main].filter(Boolean).join('\n');
      mod.contents = uniqueFiles(a.links);
      return;
    }
    case 'assign': {
      // Só o cabeçalho (enunciado, datas, anexos do professor); o quadro de envio fica de fora
      const a = await scrapeActivity(page, mod.url, false, false);
      mod.bodyHtml = a.intro;
      mod.datesText = a.dates;
      mod.contents = uniqueFiles(a.links);
      return;
    }
    case 'quiz': {
      // Só a página inicial (instruções, prazos, limite de tempo, tentativas já feitas). Abrir view.php não cria tentativa;
      // quem cria é startattempt.php, que nunca é chamado. As questões só aparecem dentro de uma tentativa.
      const a = await scrapeActivity(page, mod.url, true, false);
      mod.bodyHtml = [a.intro, a.main].filter(Boolean).join('\n');
      mod.datesText = a.dates;
      mod.contents = uniqueFiles(a.links);
      return;
    }
    default:
      // Fórum, escolha etc.: não abre
      return;
  }
}

// Miniatura e link do mesmo arquivo viram uma entrada só
function uniqueFiles(links: string[]): ModContent[] {
  const byUrl = new Map(links.map(asFile).map((f) => [f.fileurl, f]));
  return [...byUrl.values()];
}

// O Moodle escapa duas vezes alguns nomes no data-activityname ("--&gt;" em vez de "-->")
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Página de uma tentativa de questionário que o aluno já iniciou (attempt.php) ou terminou (review.php).
// Só essas duas, só no Moodle configurado, e só a URL exata que o aluno colou: trocar o "page" pode avançar
// a tentativa em questionários de navegação sequencial. startattempt/processattempt/summary nunca são chamados.
const QUIZ_PAGES = ['/mod/quiz/attempt.php', '/mod/quiz/review.php'];

export function isQuizPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.origin === config.origin && QUIZ_PAGES.includes(u.pathname) && !!u.searchParams.get('attempt');
  } catch {
    return false;
  }
}

export async function readQuizPage(page: Page, url: string) {
  if (!isQuizPageUrl(url)) throw new Error('só leio attempt.php ou review.php do próprio Moodle');
  await visit(page, url);
  return page.evaluate(() => {
    const questions = [...document.querySelectorAll<HTMLElement>('.que')].map((q) => {
      const clean = q.cloneNode(true) as HTMLElement;
      // Mantém enunciado, opções, imagens e (na revisão) feedback e resposta correta; tira campos e botões
      clean.querySelectorAll('input[type="hidden"], script, style, button, .questionflag, .im-controls').forEach((el) => el.remove());
      // Marca a opção que está selecionada, que some junto com o <input>
      q.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach((inp) => {
        const twin = clean.querySelector<HTMLInputElement>(`input[name="${inp.name}"][value="${inp.value}"]`);
        twin?.parentElement?.append(' [marcada]');
      });
      clean.querySelectorAll('input').forEach((el) => el.remove());
      return clean.innerHTML;
    });
    const links = [...document.querySelectorAll<HTMLImageElement | HTMLAnchorElement>('.que img[src*="/pluginfile.php/"], .que a[href*="/pluginfile.php/"]')].map(
      (el) => ('href' in el ? el.href : el.src),
    );
    const title = (document.querySelector('.page-header-headings h1, #page-header h1, h1') as HTMLElement | null)?.innerText.trim() ?? document.title;
    const course = /\bcourse-(\d+)\b/.exec(document.body.className)?.[1];
    return { title, questions, links: [...new Set(links)], courseid: course ? Number(course) : undefined };
  });
}
