import { config } from './config.js';
import { assignments, courseContents, enrolledCourses, moodleAjax, onLoginScreen, openBrowser, openMoodle, sessionFileUrl } from './moodle.js';

// Diagnóstico somente leitura: confere login, quais web services respondem e se o download pela sessão funciona.
// Não grava conteúdo nenhum.

function ok(label: string, detail = '') {
  console.log(`  [ok]    ${label}${detail ? `: ${detail}` : ''}`);
}
function fail(label: string, err: unknown) {
  console.log(`  [falha] ${label}: ${(err as Error).message ?? err}`);
}

const { context, page } = await openBrowser();
try {
  await openMoodle(page);
  const userId = await page.evaluate(() => (window as any).M?.cfg?.userId ?? null);
  ok('login', `M.cfg.userId = ${userId}`);

  let courses;
  try {
    courses = await enrolledCourses(page);
    ok('core_course_get_enrolled_courses_by_timeline_classification', `${courses.length} disciplina(s) (${config.scope})`);
    for (const c of courses) console.log(`          id ${c.id}  ${c.fullname}`);
  } catch (err) {
    fail('core_course_get_enrolled_courses_by_timeline_classification', err);
    process.exit(1);
  }
  if (config.courseIds.length) courses = courses.filter((c) => config.courseIds.includes(c.id));
  const course = courses[0];
  if (!course) throw new Error('nenhuma disciplina para testar');

  console.log(`\n  Testando com: ${course.fullname}`);
  try {
    const sections = await courseContents(page, course.id);
    const mods = sections.flatMap((s) => s.modules);
    const byType: Record<string, number> = {};
    for (const m of mods) byType[m.modname] = (byType[m.modname] ?? 0) + 1;
    ok('core_course_get_contents', `${sections.length} seções, ${mods.length} módulos ${JSON.stringify(byType)}`);

    const file = mods.flatMap((m) => m.contents ?? []).find((c) => c.type === 'file' && c.fileurl);
    if (file) {
      const res = await context.request.get(sessionFileUrl(file.fileurl!));
      if (onLoginScreen(res.url())) fail('download pela sessão', 'redirecionou para o login');
      else if (res.ok()) ok('download pela sessão', `${file.filename} (${(await res.body()).length} bytes, não salvo)`);
      else fail('download pela sessão', new Error(`HTTP ${res.status()}`));
    } else console.log('  [--]    download pela sessão: a disciplina não tem arquivo para testar');
  } catch (err) {
    fail('core_course_get_contents', err);
    // Sem ele, o sync usa o modo web: estrutura pelo estado da tela e conteúdo pelas páginas
    try {
      const state = JSON.parse(await moodleAjax<string>(page, 'core_courseformat_get_state', { courseid: course.id }));
      const byType: Record<string, number> = {};
      for (const c of state.cm) byType[c.module] = (byType[c.module] ?? 0) + 1;
      ok('core_courseformat_get_state (modo web)', `${state.section.length} seções, ${state.cm.length} módulos ${JSON.stringify(byType)}`);
    } catch (err2) {
      fail('core_courseformat_get_state (modo web)', err2);
    }
  }

  try {
    const list = await assignments(page, course.id);
    ok('mod_assign_get_assignments', `${list.length} tarefa(s)`);
  } catch (err) {
    fail('mod_assign_get_assignments (opcional: sem ele, só aparecem as descrições exibidas na página)', err);
  }
} finally {
  await context.close();
}
