import 'dotenv/config';
import { resolve } from 'node:path';

function num(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} precisa ser um número`);
  return value;
}

const moodleUrl = process.env.MOODLE_URL;
if (!moodleUrl) throw new Error('Defina MOODLE_URL no .env (copie de .env.example)');

const scope = process.env.COURSES ?? 'inprogress';
if (!['inprogress', 'all', 'past', 'future'].includes(scope)) throw new Error('COURSES deve ser inprogress, all, past ou future');

const mode = process.env.MODE ?? 'auto';
if (!['auto', 'api', 'web'].includes(mode)) throw new Error('MODE deve ser auto, api ou web');

export const config = {
  // api: core_course_get_contents | web: estado da tela + páginas das atividades | auto: tenta api e cai para web
  mode: mode as 'auto' | 'api' | 'web',
  // Só a origem: https://moodle.utfpr.edu.br
  origin: new URL(moodleUrl).origin,
  // Disciplinas que entram na sincronização (classificação da linha do tempo do Moodle)
  scope: scope as 'inprogress' | 'all' | 'past' | 'future',
  // COURSE_IDS=123,456 limita a essas disciplinas (o id está em course/view.php?id=)
  courseIds: (process.env.COURSE_IDS ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter(Boolean),
  outDir: resolve(process.env.OUT_DIR ?? 'materias'),
  headless: process.env.HEADLESS === 'true',
  browserChannel: process.env.BROWSER_CHANNEL || undefined,
  // Perfil próprio: o do moodle-claude-bot fica travado enquanto o bot roda
  profileDir: resolve(process.env.PROFILE_DIR ?? '.moodle-profile'),
  // Pausa entre downloads, para não martelar o servidor da faculdade
  delayMs: num('DELAY_MS', 300),
  // Arquivos maiores que isso ficam só no índice, com o link (vídeos, ISOs...)
  maxFileMb: num('MAX_FILE_MB', 100),
  // Imagens dentro de avisos e descrições menores que isso são ícones decorativos e não são salvas
  iconMaxKb: num('ICON_MAX_KB', 10),
};
