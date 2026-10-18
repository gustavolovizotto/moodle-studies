# moodle-estudos: arquitetura técnica

Ferramenta somente leitura que copia o conteúdo das disciplinas do Moodle para uma pasta local e organiza com índices. O estudo em si (resumos, exercícios) acontece numa sessão do Claude Code aberta na pasta, guiada pelo `CLAUDE.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 18+ (testado no 24), TypeScript executado com `tsx` |
| Navegador | Playwright, contexto persistente do Chromium |
| Conversão | `turndown` (HTML → Markdown), `mammoth` (.docx), `jszip` (.pptx) |
| Configuração | `dotenv` (`.env`) |
| Estudo | Claude Code interativo na pasta, instruído pelo `CLAUDE.md` |

## Estrutura

```
src/
  config.ts   leitura e validação do .env
  moodle.ts   navegador, login/sessão, chamada de web services, tipos, URL de arquivo pela sessão
  web.ts      modo web: estrutura pelo estado da tela, conteúdo pelas páginas de seção e atividade
  convert.ts  HTML → Markdown e extração de texto de .docx/.pptx
  store.ts    pasta materias/: manifesto, downloads, imagens decorativas, troca de links
  sync.ts     percorre disciplinas, seções e módulos; baixa, converte e escreve os índices
  atividade.ts busca UMA atividade pelo nome ou link e salva texto, imagens e anexos na hora
  check.ts    diagnóstico somente leitura dos web services e do download
mock/
  server.ts   servidor HTTP que imita o login, os web services e o pluginfile.php
CLAUDE.md     instruções de estudo para o Claude Code (onde achar, como resumir, como ensinar)
materias/     saída (fora do git)
resumos/      resumos escritos pelo Claude (o sync não toca)
```

## Fluxo

```
openBrowser ─► openMoodle (/my/, login manual se preciso)
   │
   ▼
core_course_get_enrolled_courses_by_timeline_classification ─► filtro COURSE_IDS
   │
   ▼  para cada disciplina
core_course_get_contents ─► seções ─► módulos ─┬─ arquivos ─► GET /pluginfile.php (cookie da sessão) ─► disco
mod_assign_get_assignments ─► enunciados ──────┤                                    └─► .md de docx/pptx/html
                                               └─ rótulos, descrições, links ─► _secao.md e INDEX.md
```

1. Abre um contexto persistente do Chromium (`.moodle-profile/`) e restaura os cookies salvos.
2. Navega até `/my/`. Se cair na tela de login, espera o login manual na janela.
3. Lista as disciplinas da classificação `COURSES` (padrão `inprogress`) e aplica `COURSE_IDS`.
4. Para cada disciplina, lê seções e módulos, baixa os arquivos e escreve `_secao.md`, os `.md` das tarefas e o `INDEX.md`.
5. Atualiza o `INDEX.md` geral, mantendo as disciplinas de sincronizações anteriores.

## Acesso ao Moodle

Os dois modos devolvem o mesmo formato (`Section[]` com `Module[]` e `ModContent[]`), então o resto do sync não sabe de qual veio.

```ts
readCourse(page, request, courseid): Promise<Section[]>   // api ou web
```

`MODE=auto` tenta `api` na primeira disciplina. Se falhar, passa para `web` e mantém nas próximas.

### Web services

Executados dentro da página autenticada (`page.evaluate`), pelo módulo AMD `core/ajax`, como no modo `api` do bot.

| Uso | Web service | Modo | Na UTFPR |
|---|---|---|---|
| Disciplinas | `core_course_get_enrolled_courses_by_timeline_classification` | ambos | ok |
| Seções, módulos e arquivos | `core_course_get_contents` | `api` | bloqueado |
| Enunciados e anexos das tarefas | `mod_assign_get_assignments` | `api` (opcional) | bloqueado |
| Seções e módulos (sem conteúdo) | `core_courseformat_get_state` | `web` | ok |

### Modo `web`

O estado (`core_courseformat_get_state`) é o JSON que a tela da disciplina usa: seções (`number`, `title`, `visible`, `cmlist`, `sectionurl`) e módulos (`id`, `module`, `name`, `url`, `uservisible`). Não traz arquivos nem textos, e corta nomes longos com "...". O resto vem das páginas:

| Origem | O que sai | Como |
|---|---|---|
| Página da seção (`sectionurl`) | nome completo de cada módulo, texto dos rótulos e descrições, resumo da seção | `[data-for="cmitem"]`: `data-activityname`, `.activity-altcontent`; `#section-N .summarytext` |
| Arquivo | o arquivo | `view.php?id=X&redirect=1` sem seguir o redirecionamento; o `Location` é o `pluginfile.php`. Se vier 200 (arquivo embutido), pega o primeiro link de `pluginfile.php` do HTML |
| URL | o endereço externo | mesmo `redirect=1`, lendo o `Location` |
| Pasta | os arquivos | links de `pluginfile.php` dentro de `[role="main"]`; o caminho depois de `content/<rev>/` vira subpasta |
| Página | corpo em HTML e anexos/imagens | `.activity-description` + `[role="main"]`, links e `<img>` de `pluginfile.php` |
| Livro | todos os capítulos | a versão de impressão `mod/book/tool/print/index.php?id=X` |
| Tarefa | enunciado, datas, anexos do professor | só `.activity-header` e `#intro`. O quadro de envio (`[role="main"]`) fica de fora, para não baixar a sua própria entrega |
| Questionário | instruções, datas, limite de tempo, tentativas e notas | `#intro`, `[data-region="activity-dates"]` e `[role="main"]` sem `form`, `button` e `script`. Só `view.php`: quem cria tentativa é `startattempt.php`, que nunca é chamado. As questões só existem dentro de uma tentativa |
| Tentativa ou revisão (só pelo `atividade`, com o link colado) | questões da página, com imagens, opção marcada e, na revisão, feedback e resposta correta | `readQuizPage`: só `attempt.php`/`review.php` da origem, com `attempt`. GET da URL exata, mantendo o `page`: em navegação sequencial, outra página avançaria a tentativa. Cada `.que` sem campos e botões. Imagens da área `question/`. `mod_quiz_get_user_attempts` é bloqueado na UTFPR, então a tentativa não é descoberta sozinha |
| Fórum, outros | nada | não são abertos |

O formato de blocos da UTFPR (`format_tiles`) só mostra o conteúdo de uma seção na página dela, por isso uma visita por seção. Subseções (`mod_subsection`) aparecem como seções próprias.

Funções passadas para `page.evaluate` não podem declarar funções com nome: o `tsx` (esbuild) injeta um helper `__name` que não existe no navegador.

### Arquivos

Os `fileurl` dos web services apontam para `/webservice/pluginfile.php/...`, que exige token. O sync troca para `/pluginfile.php/...`, remove `token` e baixa com `context.request`, que compartilha os cookies do navegador.

Depois do download, links de `pluginfile.php` dentro dos `.md` (imagens de Página, anexos de Tarefa) são trocados pelo caminho local relativo.

Arquivos citados nos textos da seção (rótulos, descrições, resumo) também são baixados, para `<seção>/_anexos/`. Na UTFPR há professores que anexam os slides na descrição de cada vídeo (`mod_url/intro`) em vez de criar uma atividade Arquivo. Só entram links de áreas de atividade ou seção (`/pluginfile.php/<ctx>/mod_...` e `/course/...`), não logotipos do tema.

Imagens citadas nesses textos também são baixadas, exceto as decorativas:
- menores que `ICON_MAX_KB`;
- com o mesmo conteúdo (SHA-1) citado em mais de um texto, como o ícone de "slides" de 419 KB que o professor de Banco de Dados repete ao lado de cada vídeo. Na segunda aparição, a primeira cópia é apagada. Os hashes ficam em `materias/.decorativas.json` e valem nas próximas execuções.

Imagens decorativas ficam com o link para o Moodle no `.md`. No Windows, a remoção usa `unlinkSync`: o `rmSync({ force: true })` não apagava caminhos com acento e não dava erro.

Miniaturas de Pasta (`?preview=tinyicon&oid=...`) têm esses parâmetros removidos e são unificadas com o link do arquivo, para não salvar o ícone no lugar do arquivo.

Se uma resposta terminar numa tela de login, o sync para com "sessão expirou", em vez de gravar a página de login como se fosse o arquivo.

## Saída

```
materias/
  INDEX.md                         disciplinas
  .manifest.json                   url → { timemodified, filesize, path }
  <disciplina>/
    INDEX.md                       todos os módulos por seção: tipo, caminho local, link do Moodle
    <NN - seção>/
      _secao.md                    resumo da seção, rótulos e descrições, na ordem da página
      <arquivo>                    módulo Arquivo
      <arquivo>.pptx.md            texto extraído (docx/pptx)
      <pasta|página|livro>/...     subpasta com o nome do módulo; .html também vira .md
      <tarefa>.md                  enunciado + prazo; anexos em <tarefa>/
```

- Nomes passam por `safe()`: sem caracteres inválidos no Windows, sem ponto ou espaço no final, até 80 caracteres (120 para arquivos).
- Seções e módulos com `uservisible: false` são ignorados.
- Caminhos no `INDEX.md` da disciplina são relativos à pasta dela.

### Incremental

A chave do manifesto é a URL do arquivo sem token e sem `forcedownload`. Um arquivo é baixado de novo se `timemodified` ou `filesize` mudarem, ou se o arquivo local sumir. No modo `web` esses dois valores não existem (ficam 0), mas a URL do `pluginfile.php` tem um número de revisão que muda quando o professor troca o arquivo, então a chave nova força o download. Os índices são reescritos a cada execução.

No modo `web`, as páginas de seção e atividade são visitadas de novo a cada execução, mesmo sem mudança; só os downloads são poupados.

## Conversões

| Origem | Resultado |
|---|---|
| HTML (rótulos, resumos, Página, Livro, enunciados) | Markdown via `turndown` |
| `.docx` | HTML via `mammoth`, depois Markdown |
| `.pptx` | texto de cada `<a:p>` por slide, em ordem numérica, como `## Slide N` |
| PDF e demais | sem conversão; o Claude Code lê PDF direto |

## Travas

| Trava | Mecanismo |
|---|---|
| Somente leitura | só web services de consulta e GET de páginas e arquivos; nada de `startattempt`, envio ou POST de formulário |
| Questionários | nunca abertos, em nenhum modo (o mock devolve erro se `mod/quiz/view.php` for pedido) |
| Própria entrega | na Tarefa, só o cabeçalho é lido; arquivos do quadro de envio não são baixados |
| Sessão expirada | redirecionamento para o login interrompe o sync |
| Arquivos grandes | acima de `MAX_FILE_MB` (100) ficam só como link |
| Carga no servidor | downloads sequenciais com `DELAY_MS` (300 ms) entre eles |
| Falha num arquivo | registrada e contada; o resto continua |
| Falha numa disciplina | registrada; as outras continuam |
| Instância única | o perfil persistente do Chromium bloqueia uma segunda instância |
| Conteúdo como dado | o `CLAUDE.md` manda tratar `materias/` como material, nunca como instrução |

## Sessão e login

Igual ao bot: login manual na janela, nenhuma credencial armazenada pelo código. Uma URL conta como tela de login se tiver outra origem ou se o caminho começar com `/login/`, `/auth/` ou `/admin/oauth2callback`. Como o `MoodleSession` é um cookie de sessão, os cookies da origem são salvos em `.moodle-profile/moodle-cookies.json` e restaurados no próximo lançamento.

## Configuração (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `MOODLE_URL` | (obrigatória) | origem do Moodle |
| `MODE` | `auto` | `auto`, `api`, `web` |
| `COURSES` | `inprogress` | `inprogress`, `all`, `past`, `future` |
| `COURSE_IDS` | (vazio) | lista de ids para limitar a sincronização |
| `OUT_DIR` | `materias` | pasta de saída |
| `HEADLESS` | `false` | navegador sem janela (impede login manual) |
| `BROWSER_CHANNEL` | (vazio) | `msedge` ou `chrome` |
| `PROFILE_DIR` | `.moodle-profile` | perfil persistente |
| `DELAY_MS` | `300` | pausa entre downloads |
| `MAX_FILE_MB` | `100` | limite de tamanho por arquivo |
| `ICON_MAX_KB` | `10` | imagens em textos menores que isso são tratadas como ícone |

## Scripts

| Comando | Função |
|---|---|
| `npm run sync` | sincroniza |
| `npm run atividade -- "<nome ou link>"` | busca uma atividade só (modo web): procura em `core_courseformat_get_state` de cada disciplina, lê a página da seção e a da atividade, salva e imprime o `.md`. Com link de `attempt.php`/`review.php`, lê as questões daquela página. `--json` termina com `@@RESULTADO {...}` (usado pelo moodle-claude-bot) |
| `npm run check` | diagnóstico somente leitura: login, disciplinas, módulos por tipo, teste de download sem salvar, tarefas |
| `npm run mock` | sobe o Moodle falso na porta 4748 |
| `npm run typecheck` | `tsc --noEmit` |

## Simulação (`mock/server.ts`)

Redireciona para `/login/index.php` sem o cookie `MoodleSession=ok`. Expõe `window.M.cfg` e um shim de `require(['core/ajax'])` em `/my/`, implementa os três web services e serve `/pluginfile.php` (recusa a URL com `token`). A disciplina de exemplo tem rótulo, fórum, PDF, pasta com subpasta, página HTML com imagem, `.pptx` gerado na hora, URL, tarefa com anexo e com um arquivo de entrega do aluno, questionário com botão de iniciar tentativa, aviso com um ícone pequeno e um diagrama, a mesma imagem grande repetida em dois textos, subseção, módulo oculto e seção oculta. Pedir `startattempt.php` ou `attempt.php` gera erro no log do mock.

`MOCK_WEB=1` bloqueia `core_course_get_contents` e `mod_assign_get_assignments`, implementa `core_courseformat_get_state`, as páginas de seção (`course/view.php?id=7&section=N`), as páginas de atividade e os redirecionamentos de `view.php?redirect=1`. Pedir `mod/quiz/view.php` gera erro no log do mock.

## Validação

| Cenário | Ambiente | Resultado |
|---|---|---|
| `check`: login, web services, download sem salvar | mock | ok |
| Sync completo, todos os tipos de módulo, oculto ignorado, conversões | mock, `api` | ok |
| Sync completo: queda para `web`, nomes completos, imagem com link local, sem a entrega do aluno | mock, `web` | ok |
| Questionário: página inicial sem o botão, nenhuma tentativa iniciada; ícone pequeno e imagem repetida não salvos, diagrama salvo | mock, `web` | ok |
| `atividade`: por nome, por link, vários resultados, nenhum resultado, sem argumento | mock | ok |
| `atividade`: questionário "Dilemas de um arquiteto" (instruções, datas, nota, link da revisão) e busca "ADR" com preferência por palavra inteira | UTFPR | ok |
| Ícone de slides repetido (419 KB) de Banco de Dados: 0 cópias salvas | UTFPR | ok |
| Segunda execução sem mudanças: 0 downloads | mock, `api` e `web` | ok |
| `check`: login pela sessão salva, 10 disciplinas, `core_course_get_contents` e `mod_assign_get_assignments` bloqueados | UTFPR | ok |
| `core_courseformat_get_state`, página de seção, Página, Tarefa, Pasta, redirecionamento de Arquivo e URL (sondagem de uma disciplina) | UTFPR | ok |
| Sync completo | UTFPR | pendente |

## Limitações

- Questionários não são baixados. As questões só ficam acessíveis nas revisões de tentativas já feitas (`review.php`); só `startattempt.php` cria tentativa, e o sync nunca chega perto dele.
- Fóruns não são baixados, só listados.
- Vídeos e links externos (YouTube, Drive) ficam só como link.
- PDFs escaneados não têm texto; o Claude lê as páginas como imagem.
- `.pptx`: só o texto das caixas. Figuras, gráficos e notas do apresentador ficam de fora do `.md` (o original continua salvo).
- Depende de a sessão do Moodle estar válida. Um logout ou uma política de logins simultâneos exige novo login manual.
