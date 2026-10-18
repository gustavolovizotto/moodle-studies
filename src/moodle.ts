import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { config } from './config.js';

// O cookie MoodleSession não tem validade e o Chromium o apaga ao fechar; guardamos à parte para não pedir login sempre
const cookiesFile = join(config.profileDir, 'moodle-cookies.json');

export async function openBrowser() {
  const context = await chromium.launchPersistentContext(config.profileDir, {
    headless: config.headless,
    channel: config.browserChannel,
    viewport: null,
  });
  if (existsSync(cookiesFile)) await context.addCookies(JSON.parse(readFileSync(cookiesFile, 'utf8'))).catch(() => {});
  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

export async function saveSession(context: BrowserContext) {
  writeFileSync(cookiesFile, JSON.stringify(await context.cookies(config.origin)));
}

export function onLoginScreen(url: string): boolean {
  const u = new URL(url);
  return (
    u.origin !== config.origin ||
    u.pathname.startsWith('/login/') ||
    u.pathname.startsWith('/auth/') ||
    u.pathname.startsWith('/admin/oauth2callback')
  );
}

// Abre o painel do Moodle; se cair no login, espera o login manual na janela
export async function openMoodle(page: Page) {
  const home = `${config.origin}/my/`;
  await page.goto(home, { waitUntil: 'domcontentloaded' });
  if (!onLoginScreen(page.url())) return saveSession(page.context());
  if (config.headless) throw new Error('Sessão do Moodle expirada: rode com HEADLESS=false e faça login na janela.');
  console.log('>> Faça login no Moodle na janela do navegador. Aguardando...');
  console.log('   (prefira usuário e senha: o botão do Google costuma recusar navegador automatizado)');
  await page.waitForURL((u) => !onLoginScreen(u.href), { timeout: 0 });
  await saveSession(page.context());
  await page.goto(home, { waitUntil: 'domcontentloaded' });
}

// Chama um web service AJAX do próprio Moodle de dentro da página logada (usa a sessão e o sesskey do navegador)
export async function moodleAjax<T>(page: Page, methodname: string, args: object): Promise<T> {
  return page.evaluate(
    async ({ methodname, args }) => {
      const w = window as any;
      const ajax: any = await new Promise((ok, fail) => w.require(['core/ajax'], ok, fail));
      try {
        return await ajax.call([{ methodname, args }])[0];
      } catch (e: any) {
        throw new Error(`${methodname}: ${e?.message ?? e?.errorcode ?? JSON.stringify(e)}`);
      }
    },
    { methodname, args },
  );
}

// ---------- Tipos dos web services usados ----------
export type Course = { id: number; fullname: string; shortname: string; viewurl?: string };

export type ModContent = {
  type: 'file' | 'url' | 'content' | string;
  filename: string;
  filepath?: string;
  filesize?: number;
  fileurl?: string;
  timemodified?: number;
  mimetype?: string;
  content?: string;
};

export type Module = {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
  uservisible?: boolean;
  contents?: ModContent[];
  // Só no modo web: corpo da Página/Livro ou enunciado da Tarefa, já em HTML, e o texto das datas
  bodyHtml?: string;
  datesText?: string;
};

export type Section = { id: number; section: number; name: string; summary: string; uservisible?: boolean; modules: Module[] };

export async function enrolledCourses(page: Page): Promise<Course[]> {
  const res = await moodleAjax<{ courses: Course[] }>(page, 'core_course_get_enrolled_courses_by_timeline_classification', {
    classification: config.scope,
    limit: 0,
    offset: 0,
    sort: 'fullname',
  });
  return res.courses;
}

export async function courseContents(page: Page, courseid: number): Promise<Section[]> {
  return moodleAjax<Section[]>(page, 'core_course_get_contents', { courseid, options: [] });
}

// Enunciados das tarefas (o core_course_get_contents só traz a descrição quando o professor marca "exibir na página")
export type Assignment = {
  cmid: number;
  name: string;
  intro?: string;
  duedate?: number;
  introattachments?: ModContent[];
};

export async function assignments(page: Page, courseid: number): Promise<Assignment[]> {
  const res = await moodleAjax<{ courses: { id: number; assignments: Assignment[] }[] }>(page, 'mod_assign_get_assignments', {
    courseids: [courseid],
    capabilities: [],
    includenotenrolledcourses: false,
  });
  return res.courses.flatMap((c) => c.assignments);
}

// Os links dos web services apontam para webservice/pluginfile.php (exige token); a versão sem token usa o cookie da sessão
export function sessionFileUrl(fileurl: string): string {
  const u = new URL(fileurl);
  u.pathname = u.pathname.replace('/webservice/pluginfile.php', '/pluginfile.php');
  u.searchParams.delete('token');
  return u.href;
}
