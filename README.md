# moodle-estudos

Copia o conteúdo das suas disciplinas do Moodle da UTFPR para a pasta `materias/`: PDFs, slides, listas, páginas, avisos e enunciados de tarefas. Depois, abra o Claude Code nesta pasta e peça resumos da matéria ou ajuda com os exercícios. O `CLAUDE.md` explica para o Claude onde está cada coisa e como ensinar.

Mesma arquitetura do `moodle-claude-bot`: Playwright com o seu login salvo, chamando os web services do próprio Moodle de dentro da página logada. Aqui não existe `claude -p`: quem estuda com você é a própria sessão do Claude Code.

## Como funciona

Há dois modos de ler uma disciplina (`MODE` no `.env`):

| Modo | Como | Quando |
|---|---|---|
| `api` | `core_course_get_contents`: estrutura e links de arquivos num JSON só | Moodles que liberam esse web service por AJAX |
| `web` | Estrutura por `core_courseformat_get_state` (o que a tela da disciplina usa); conteúdo pelas páginas de cada seção e atividade | **UTFPR**: o `core_course_get_contents` vem bloqueado |
| `auto` (padrão) | Tenta `api`, cai para `web` | |

```
Moodle (Chromium do Playwright, logado) ──web services / páginas──► disciplinas, seções, módulos
                                        ──pluginfile.php──────────► arquivos
                                                             │
                                                             ▼
                                         materias/<disciplina>/<seção>/...  +  INDEX.md
                                                             │
                                          você ◄──► Claude Code (lê materias/, segue o CLAUDE.md)
```

## Segurança

- **Somente leitura.** Usa apenas web services de consulta e downloads (GET). Nunca inicia questionário (só lê a página inicial), nunca envia tarefa, nunca posta nada.
- **Visualizações.** No modo `web`, o sync abre a página de cada Arquivo, Pasta, Página, Livro, Tarefa, URL e Questionário (página inicial), como se você clicasse em cada um. O `npm run atividade` faz o mesmo com a atividade pedida. Isso fica no registro do Moodle, que o professor consegue ver, e pode marcar a conclusão "visualizado". Fóruns e outras atividades não são abertos.
- **Senha:** nunca vai para o código nem para o `.env`. O login é feito à mão uma vez na janela do Chromium e fica salvo em `.moodle-profile/` e `.moodle-profile/moodle-cookies.json`. Trate essa pasta como senha: não compartilhe.
- **Perfil próprio:** não reaproveita o `.moodle-profile/` do bot, porque o Chromium trava o perfil enquanto o bot roda.
- **Material da disciplina:** `materias/` está no `.gitignore`. O conteúdo é dos professores; não publique.

## Setup

Pré-requisitos: Node 18+ e Claude Code.

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
cp .env.example .env
```

O `.env` já vem apontando para `https://moodle.utfpr.edu.br` e para as disciplinas em andamento.

## 1. Diagnóstico (somente leitura, não grava nada)

```bash
npm run check
```

Abre o Chromium. Na primeira vez, faça login **com usuário e senha** (o botão do Google costuma recusar navegador automatizado; se precisar dele, tente `BROWSER_CHANNEL=msedge`). O script mostra:

- suas disciplinas, com o id de cada uma;
- se `core_course_get_contents` respondeu (modo `api`); se não, se `core_courseformat_get_state` respondeu (modo `web`), e quantos módulos de cada tipo a primeira disciplina tem;
- se o download de um arquivo pela sessão funciona (o arquivo não é salvo);
- se os enunciados das tarefas (`mod_assign_get_assignments`) estão disponíveis.

## 2. Sincronizar

Comece por uma disciplina só, para conferir o resultado:

```bash
COURSE_IDS=12345 npm run sync
```

Depois, todas:

```bash
npm run sync
```

Rodar de novo só baixa o que mudou (`materias/.manifest.json` guarda a data e o tamanho de cada arquivo).

## Abrir uma atividade na hora

Para ver o que uma atividade pede sem sincronizar a disciplina inteira:

```bash
npm run atividade -- "ADRs"
```

```bash
npm run atividade -- "https://moodle.utfpr.edu.br/mod/assign/view.php?id=2189584"
```

```bash
npm run atividade -- "https://moodle.utfpr.edu.br/mod/quiz/attempt.php?attempt=123&cmid=456&page=1"
```

Funciona com uma parte do nome (sem precisar de acento nem de maiúsculas), com o link da atividade ou com o link de uma tentativa de questionário. As palavras podem vir do nome da atividade, do tipo ("questionário", "tarefa"), da disciplina ou da seção, mas pelo menos uma tem de estar no nome ou no tipo. O comando:
- busca nas disciplinas em andamento (`COURSES=all` inclui as antigas);
- se várias atividades combinam, lista todas com o link de cada uma;
- se só uma combina, salva o `.md` dela, as imagens e os anexos na mesma pasta que o sync usaria e imprime o resultado.

- junta ao `.md` o resumo e os avisos da mesma seção, porque muitas vezes a imagem ou a instrução que falta está ali;
- com o link de uma tentativa (`attempt.php`) ou de uma revisão (`review.php`), lê as questões **daquela página**, com as imagens e a opção marcada (na revisão, também a resposta correta). Salva em `materias/_tentativas/`. Não troca de página, não salva, não envia;
- com `--json`, termina com uma linha `@@RESULTADO {...}`, que é como o `moodle-claude-bot` usa este comando pelo chat.

No Claude Code, basta pedir: "abre a tarefa de ADRs".

## 3. Estudar

Abra o Claude Code nesta pasta (`moodle-estudos/`) e peça, por exemplo:

- "Faz um resumo de Limites de Cálculo 1 para a prova."
- "Quais são as tarefas com prazo esta semana?"
- "Me ensina a resolver a questão 3 da Lista 2."
- "Corrige minha resolução: ..."

## O que é baixado

| No Moodle | Na pasta |
|---|---|
| Arquivo | o arquivo, direto na seção |
| Pasta | subpasta com os arquivos |
| Página, Livro | `.md`, com as imagens baixadas ao lado e os links apontando para elas |
| Rótulo, resumo da seção, descrições | `_secao.md` da seção |
| Arquivos anexados dentro desses textos (slides, listas, imagens) | `_anexos/` da seção, com os links do `_secao.md` apontando para eles. Ícones ficam de fora: imagens menores que `ICON_MAX_KB` (10) ou a mesma imagem repetida em vários textos |
| Questionário | `<questionário>.md` com a página inicial: instruções, datas, limite de tempo, suas tentativas e notas. As questões não (só aparecem dentro de uma tentativa) |
| Tarefa | `<tarefa>.md` com enunciado e prazo, e os anexos numa subpasta |
| URL | só o link, no `INDEX.md` |
| Fórum, outros | só o registro e o link, no `INDEX.md` |
| `.docx`, `.pptx` | o original e o texto extraído em `<arquivo>.md` |
| Arquivo acima de `MAX_FILE_MB` | só o link |

## Ensaio sem a UTFPR

`mock/server.ts` imita o login por cookie, os web services e o `pluginfile.php`. Com `MOCK_WEB=1`, imita a UTFPR: bloqueia `core_course_get_contents` e serve as páginas de seção e atividade do modo `web`.

```bash
npm run mock
```

```bash
MOCK_WEB=1 npm run mock
```

Em outro terminal, crie o cookie do mock e sincronize:

```bash
mkdir -p .mock-profile && echo '[{"name":"MoodleSession","value":"ok","domain":"localhost","path":"/"}]' > .mock-profile/moodle-cookies.json
```

```bash
MOODLE_URL=http://localhost:4748 PROFILE_DIR=.mock-profile OUT_DIR=debug/materias HEADLESS=true npm run sync
```
