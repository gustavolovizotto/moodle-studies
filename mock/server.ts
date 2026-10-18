// Moodle de mentira para ensaiar a sincronização sem a UTFPR. Imita o login por cookie, os web services usados e o pluginfile.php.
// Só prova que o sync funciona contra ESTA imitação; o Moodle real se confirma com `npm run check`.
//   npm run mock
//   MOODLE_URL=http://localhost:4748 PROFILE_DIR=.mock-profile OUT_DIR=debug/materias npm run sync
import { createServer, type IncomingMessage } from 'node:http';
import { deflateSync } from 'node:zlib';
import JSZip from 'jszip';

const PORT = Number(process.env.MOCK_PORT ?? 4748);
const BASE = `http://localhost:${PORT}`;
const ME = 2;

// Arquivos servidos em /pluginfile.php/<caminho>
async function pptx(slides: string[][]) {
  const zip = new JSZip();
  slides.forEach((paras, i) =>
    zip.file(`ppt/slides/slide${i + 1}.xml`, `<p:sld><p:cSld>${paras.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join('')}</p:cSld></p:sld>`),
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}
const files: Record<string, Buffer> = {
  '/10/mod_resource/content/1/Aula 1 - Introdução.pdf': Buffer.from('%PDF-1.4 mock'),
  '/11/mod_folder/content/0/lista1.txt': Buffer.from('1) Calcule 2+2.\n2) Derive x^2.'),
  '/11/mod_folder/content/0/sub/gabarito.txt': Buffer.from('1) 4\n2) 2x'),
  '/12/mod_page/content/3/index.html': Buffer.from('<h2>Conceitos</h2><p>Um <b>limite</b> descreve...</p><ul><li>item A</li><li>item B</li></ul>'),
  '/13/mod_assign/introattachment/0/enunciado.txt': Buffer.from('Resolva os exercícios 1 a 5.'),
};
const wsUrl = (path: string) => `${BASE}/webservice/pluginfile.php${encodeURI(path)}?forcedownload=1`;
const file = (path: string, timemodified = 1700000000) => ({
  type: 'file',
  filename: path.split('/').pop()!,
  filepath: path.includes('/sub/') ? '/sub/' : '/',
  filesize: files[path].length,
  fileurl: wsUrl(path),
  timemodified,
});

function service(methodname: string, args: any): unknown {
  switch (methodname) {
    case 'core_course_get_enrolled_courses_by_timeline_classification':
      return { courses: [{ id: 7, fullname: 'Cálculo 1: Turma A', shortname: 'CAL1' }], nextoffset: 1 };
    case 'core_courseformat_get_state':
      return JSON.stringify(STATE);
    case 'core_course_get_contents':
      // MOCK_WEB=1 imita a UTFPR, que não libera este web service por AJAX
      if (WEB_ONLY) throw new Error('Web service não disponível');
      if (args.courseid !== 7) throw new Error('curso inexistente');
      return [
        {
          id: 1, section: 0, name: '', summary: '<p>Bem-vindos à disciplina.</p>', modules: [
            { id: 20, name: 'Aviso', modname: 'label', description: '<p><b>Prova 1</b> dia 20/10.</p>' },
            { id: 21, name: 'Fórum de avisos', modname: 'forum', url: `${BASE}/mod/forum/view.php?id=21` },
          ],
        },
        {
          id: 2, section: 1, name: 'Limites', summary: '', modules: [
            { id: 10, name: 'Aula 1', modname: 'resource', url: `${BASE}/mod/resource/view.php?id=10`, contents: [file('/10/mod_resource/content/1/Aula 1 - Introdução.pdf')] },
            { id: 11, name: 'Lista 1', modname: 'folder', contents: [file('/11/mod_folder/content/0/lista1.txt'), file('/11/mod_folder/content/0/sub/gabarito.txt')] },
            { id: 12, name: 'Resumo da aula', modname: 'page', contents: [file('/12/mod_page/content/3/index.html')] },
            { id: 14, name: 'Slides', modname: 'resource', contents: [file('/14/mod_resource/content/1/slides.pptx')] },
            { id: 15, name: 'Vídeo', modname: 'url', contents: [{ type: 'url', filename: 'Vídeo', fileurl: 'https://youtube.com/watch?v=x' }] },
            { id: 13, name: 'Trabalho 1', modname: 'assign', url: `${BASE}/mod/assign/view.php?id=13` },
            { id: 16, name: 'Quiz 1', modname: 'quiz', url: `${BASE}/mod/quiz/view.php?id=16` },
            { id: 17, name: 'Oculto', modname: 'resource', uservisible: false, contents: [] },
          ],
        },
      ];
    case 'mod_assign_get_assignments':
      if (WEB_ONLY) throw new Error('Web service não disponível');
      return {
        courses: [{ id: 7, assignments: [{ cmid: 13, name: 'Trabalho 1', intro: '<p>Entregue em PDF.</p>', duedate: 1760000000, introattachments: [file('/13/mod_assign/introattachment/0/enunciado.txt')] }] }],
      };
    default:
      throw new Error(`método desconhecido: ${methodname}`);
  }
}

// ---------- Modo web (formato em blocos da UTFPR) ----------
const WEB_ONLY = process.env.MOCK_WEB === '1';
const pf = (path: string) => `${BASE}/pluginfile.php${encodeURI(path)}`;
const view = (mod: string, id: number) => `${BASE}/mod/${mod}/view.php?id=${id}`;
// O estado corta nomes longos com "...", como o Moodle real
const STATE = {
  course: { id: '7' },
  section: [
    { id: '1', number: 0, title: 'Geral', visible: true, cmlist: ['20', '21'], sectionurl: `${BASE}/course/view.php?id=7&section=0` },
    { id: '2', number: 1, title: 'Limites', visible: true, cmlist: ['10', '11', '12', '14', '15', '13', '16', '17', '18'], sectionurl: `${BASE}/course/view.php?id=7&section=1` },
    { id: '3', number: 2, title: 'Oculta', visible: false, cmlist: ['19'], sectionurl: `${BASE}/course/view.php?id=7&section=2` },
  ],
  cm: [
    { id: '20', name: 'Aviso', module: 'label', uservisible: true },
    { id: '21', name: 'Fórum de avisos', module: 'forum', url: view('forum', 21), uservisible: true },
    { id: '10', name: 'Aula 1', module: 'resource', url: view('resource', 10), uservisible: true },
    { id: '11', name: 'Lista 1', module: 'folder', url: view('folder', 11), uservisible: true },
    { id: '12', name: 'Resumo da...', module: 'page', url: view('page', 12), uservisible: true },
    { id: '14', name: 'Slides', module: 'resource', url: view('resource', 14), uservisible: true },
    { id: '15', name: 'Vídeo', module: 'url', url: view('url', 15), uservisible: true },
    { id: '13', name: 'Trabalho 1', module: 'assign', url: view('assign', 13), uservisible: true },
    { id: '16', name: 'Quiz 1', module: 'quiz', url: view('quiz', 16), uservisible: true },
    { id: '17', name: 'Oculto', module: 'resource', url: view('resource', 17), uservisible: false },
    { id: '18', name: 'Semana 1', module: 'subsection', uservisible: true },
    { id: '19', name: 'Escondido', module: 'resource', url: view('resource', 19), uservisible: true },
  ],
};
const html = (body: string) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
const cmItem = (id: number, type: string, name: string, alt = '') =>
  `<li class="activity modtype_${type}" id="module-${id}" data-for="cmitem" data-id="${id}" data-title="${name}"><div class="activity-item" data-activityname="${name}">${alt ? `<div class="activity-altcontent">${alt}</div>` : ''}</div></li>`;
const SECTION_PAGES: Record<string, string> = {
  '0': html(`<ul><li id="section-0" data-for="section">${cmItem(20, 'label', 'Aviso', `<p><b>Prova 1</b> dia 20/10. <a href="${pf('/20/mod_label/intro/Lista extra.pdf')}">Lista extra</a></p><p><img src="${pf('/20/mod_label/intro/icone.png')}"> <img src="${pf('/20/mod_label/intro/diagrama.png')}" alt="diagrama"></p>`)}${cmItem(21, 'forum', 'Fórum de avisos')}</li></ul>`),
  '1': html(
    `<ul><li id="section-1" data-for="section"><div class="summarytext"><p>Unidade de limites. <img src="${pf('/2/course/section/1/slides-a.png')}"></p></div>` +
      [cmItem(10, 'resource', 'Aula 1'), cmItem(11, 'folder', 'Lista 1'), cmItem(12, 'page', 'Resumo da aula'), cmItem(14, 'resource', 'Slides'),
        cmItem(15, 'url', 'Vídeo'), cmItem(13, 'assign', 'Trabalho 1'), cmItem(16, 'quiz', 'Quiz 1', `<p>Vale 1 ponto. <img src="${pf('/16/mod_quiz/intro/slides-b.png')}"></p>`)].join('') +
      `</li></ul>`,
  ),
};
const ACTIVITY_PAGES: Record<string, string> = {
  'folder/11': html(`<div role="main"><a href="${pf('/11/mod_folder/content/0/lista1.txt')}?forcedownload=1">lista1.txt</a>
    <a href="${pf('/11/mod_folder/content/0/sub/gabarito.txt')}?forcedownload=1">gabarito.txt</a></div>`),
  'page/12': html(`<div class="activity-header"></div><div role="main"><div class="box generalbox"><h2>Conceitos</h2><p>Um <b>limite</b> descreve...</p>
    <ul><li>item A</li><li>item B</li></ul><img src="${pf('/12/mod_page/content/3/grafico.png')}" alt="gráfico"></div></div>`),
  'quiz/16': html(`<div class="activity-header"><div data-region="activity-dates"><strong>Abre:</strong> 10 out. 2026 <strong>Fecha:</strong> 30 out. 2026</div>
    <div class="activity-description" id="intro"><p>Questionário sobre limites. Consulte a Aula 1.</p></div></div>
    <div role="main"><div class="quizinfo"><p>Tentativas permitidas: 2</p><p>Limite de tempo: 30 minutos</p></div>
    <form method="post" action="${BASE}/mod/quiz/startattempt.php"><input type="hidden" name="cmid" value="16"><button type="submit">Tentar responder o questionário agora</button></form></div>`),
  'assign/13': html(`<div class="activity-header"><div data-region="activity-dates"><strong>Vencimento:</strong> sexta, 20 out. 2026</div>
    <div class="activity-description" id="intro"><p>Entregue em PDF.</p><a href="${pf('/13/mod_assign/introattachment/0/enunciado.txt')}?forcedownload=1">enunciado.txt</a></div></div>
    <div role="main"><table><tr><td>Status de envio</td><td><a href="${pf('/99/assignsubmission_file/submission_files/1/minha-entrega.pdf')}">minha-entrega.pdf</a></td></tr></table></div>`),
};
const QUIZ_PAGE = (review: boolean) =>
  html(`<div id="page-header"><h1>Quiz 1</h1></div><form id="responseform" action="${BASE}/mod/quiz/processattempt.php" method="post">
  <input type="hidden" name="sesskey" value="mock">
  <div class="que multichoice"><div class="info"><h3 class="no">Questão <span class="qno">2</span></h3><div class="questionflag">Marcar</div></div>
    <div class="content"><div class="formulation clearfix"><div class="qtext"><p>Observe o gráfico e calcule o limite de f(x) quando x tende a 2.</p>
      <p><img src="${pf('/30/question/questiontext/900/2/77/grafico-limite.png')}" alt="gráfico"></p></div>
      <div class="answer"><div class="r0"><input type="radio" name="q900:2_answer" value="0"><div><span class="answernumber">a. </span>3</div></div>
      <div class="r1"><input type="radio" name="q900:2_answer" value="1" checked><div><span class="answernumber">b. </span>4</div></div>
      <div class="r0"><input type="radio" name="q900:2_answer" value="2"><div><span class="answernumber">c. </span>Não existe</div></div></div></div>
      ${review ? '<div class="outcome"><div class="feedback"><div class="rightanswer">A resposta correta é: 4</div></div></div>' : ''}</div></div>
  <button type="submit" name="next">Próxima página</button></form>`);
files['/30/question/questiontext/900/2/77/grafico-limite.png'] = graficoPng();

// PNG de verdade (o Claude recusa bytes que não são imagem): eixos e a parábola y = x², com um ponto em x = 2
function graficoPng(): Buffer {
  const w = 240, h = 240;
  const px = Buffer.alloc((w * 3 + 1) * h, 255);
  const dot = (x: number, y: number, rgb: number[], r = 1) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const i = Y * (w * 3 + 1) + 1 + X * 3;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
    }
  };
  for (let y = 0; y < h; y++) px[y * (w * 3 + 1)] = 0;
  for (let i = 0; i < w; i++) { dot(i, 200, [0, 0, 0], 0); dot(40, i, [0, 0, 0], 0); }
  for (let x = 0; x <= 3.4; x += 0.005) dot(Math.round(40 + x * 50), Math.round(200 - x * x * 15), [0, 0, 255]);
  dot(140, 140, [255, 0, 0], 4);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))]);
}

const REDIRECTS: Record<string, string> = {
  'resource/10': pf('/10/mod_resource/content/1/Aula 1 - Introdução.pdf'),
  'resource/14': pf('/14/mod_resource/content/1/slides.pptx'),
  'url/15': 'https://youtube.com/watch?v=x',
};
files['/12/mod_page/content/3/grafico.png'] = Buffer.from('PNGmock');
files['/20/mod_label/intro/Lista extra.pdf'] = Buffer.from('%PDF-1.4 extra');
// Ícone decorativo (pequeno, não deve ser salvo) e diagrama (grande, deve ser salvo)
files['/20/mod_label/intro/icone.png'] = Buffer.alloc(2_000, 1);
files['/20/mod_label/intro/diagrama.png'] = Buffer.alloc(40_000, 2);
// O mesmo ícone grande repetido em dois textos: decorativo, nenhuma cópia deve ser salva
files['/2/course/section/1/slides-a.png'] = Buffer.alloc(50_000, 3);
files['/16/mod_quiz/intro/slides-b.png'] = Buffer.alloc(50_000, 3);

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Painel (mock)</title>
<script>
  window.M = { cfg: { wwwroot: location.origin, sesskey: 'mock', userId: ${ME}, theme: 'mock' } };
  // Imita o RequireJS do Moodle só para o módulo core/ajax
  window.require = (deps, ok) => ok({
    call: (reqs) => reqs.map((r) =>
      fetch('/lib/ajax/service.php?sesskey=mock&info=' + r.methodname, { method: 'POST', body: JSON.stringify([{ index: 0, methodname: r.methodname, args: r.args }]) })
        .then((res) => res.json())
        .then(([first]) => { if (first.error) throw first.exception; return first.data; })),
  });
</script></head><body><h3>Painel (mock)</h3></body></html>`;

const LOGIN = `<!doctype html><html><body><h3>Login (mock)</h3>
<button onclick="document.cookie='MoodleSession=ok; path=/'; location.href='/my/'">Entrar</button></body></html>`;

const body = (req: IncomingMessage) =>
  new Promise<string>((ok) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => ok(data));
  });

files['/14/mod_resource/content/1/slides.pptx'] = await pptx([
  ['Limites', 'Definição intuitiva'],
  ['Exemplo: lim x→2 de x² = 4'],
]);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  const logged = /MoodleSession=ok/.test(req.headers.cookie ?? '');
  const json = (data: unknown) => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  if (url.pathname === '/login/index.php') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(LOGIN);
  }
  if (!logged) {
    res.writeHead(303, { location: '/login/index.php' });
    return res.end();
  }
  if (url.pathname === '/my/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  if (url.pathname === '/course/view.php') {
    const page = SECTION_PAGES[url.searchParams.get('section') ?? ''];
    if (!page) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(page);
  }
  // Iniciar tentativa é a única coisa que o sync e o comando atividade nunca podem fazer
  if (['/mod/quiz/startattempt.php', '/mod/quiz/processattempt.php', '/mod/quiz/summary.php'].includes(url.pathname)) {
    console.error(`[mock] ERRO: ${url.pathname} foi chamado (iniciar, enviar ou finalizar tentativa)`);
    return res.writeHead(500).end();
  }
  // Página de uma tentativa que o aluno já abriu (e a revisão de uma terminada); só a página pedida
  if (url.pathname === '/mod/quiz/attempt.php' || url.pathname === '/mod/quiz/review.php') {
    if (url.searchParams.get('attempt') !== '900') return res.writeHead(404).end();
    if (url.pathname === '/mod/quiz/attempt.php' && url.searchParams.get('page') !== '1') console.error('[mock] ERRO: tentativa acessada em outra página');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(QUIZ_PAGE(url.pathname.endsWith('review.php')));
  }
  const mod = url.pathname.match(/^\/mod\/(\w+)\/view\.php$/);
  if (mod) {
    const key = `${mod[1]}/${url.searchParams.get('id')}`;
    if (url.searchParams.get('redirect') === '1' && REDIRECTS[key]) {
      res.writeHead(303, { location: REDIRECTS[key] });
      return res.end();
    }
    if (!ACTIVITY_PAGES[key]) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(ACTIVITY_PAGES[key]);
  }
  if (url.pathname.startsWith('/pluginfile.php/')) {
    if (url.searchParams.has('token')) return res.writeHead(403).end();
    const data = files[decodeURIComponent(url.pathname.slice('/pluginfile.php'.length))];
    if (!data) return res.writeHead(404).end();
    res.writeHead(200);
    return res.end(data);
  }
  if (req.method === 'POST' && url.pathname === '/lib/ajax/service.php') {
    const [call] = JSON.parse(await body(req));
    try {
      return json([{ error: false, data: service(call.methodname, call.args) }]);
    } catch (err) {
      return json([{ error: true, exception: { message: (err as Error).message, errorcode: 'mock' } }]);
    }
  }
  res.writeHead(404).end();
}).listen(PORT, () => console.log(`[mock] Moodle falso em ${BASE}/my/`));
