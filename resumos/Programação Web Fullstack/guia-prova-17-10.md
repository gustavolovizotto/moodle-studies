# Programação Web Fullstack: guia para a Avaliação Presencial 1 (17/10, 16h40)

**O que a página do questionário no Moodle diz:**
- **Formato:** desenvolvimento de aplicação web com React, feito pelo Moodle.
- **Questões:** discursivas.
- **Tempo e acesso:** 50 minutos, com senha, das 16h40 às 17h30.
- **Conteúdos:** Front-end Web (HTML + CSS + JS) + React: **props, useState, useEffect, Context API e renderização condicional**.

**Como o guia está organizado:** um resumo de cada tema, com a referência dos slides, depois as pegadinhas, as perguntas discursivas e as práticas de implementação com gabarito. O que não está nos slides aparece marcado **[geral]**.

**Siglas dos slides:**
- **DOM:** 00-revisao-javascript-dom
- **AJAX:** 02-revisao-ajax
- **ES6:** 01-revisao-js-es6
- **Intro:** 04-introdução-ao-react
- **ESP:** 05-react-events-states-props
- **Ctx:** 06.1-react-context
- **Eff:** 06.2-react-useEffect

> **Se você tiver só 20 minutos:** leia as seções 3 a 7, a seção 9 (pegadinhas) e faça a Prática 1.

---

## 1. Base de JS que o React usa (ES6)

| Recurso | Exemplo | Onde aparece no React |
|---|---|---|
| `const`/`let` (escopo de bloco) e `var` (escopo de função) | ES6 slide 7: imprime `2 3 / 2 300 / 13 100` | `const [x, setX] = useState()` |
| Arrow function, sem `this` próprio | `const soma = (a, b) => a + b` | handlers: `onClick={() => ...}` |
| Template literal | `` `Olá ${nome}` `` | `` className={`card ${ativo ? 'on' : ''}`} `` |
| Desestruturação de objeto (pelo nome) | `const { nome } = pessoa` | props: `function Card({ titulo })` (ES6 slide 52) |
| Desestruturação de array (pela posição) | `const [a, b] = lista` | `const [count, setCount] = useState(0)` |
| Spread `...` | `[...lista, novo]`, `{ ...obj, campo: v }` | atualizar estado sem mutar |
| Rest e parâmetro padrão | `function f(a, b = 3, ...outros)` → `f(2)` dá `[3]` (ES6 slide 54) | `function Botao({ texto = 'OK' })` |
| `map` / `filter` (devolvem um **novo** array) | ES6 slide 28 | listas no JSX, remover item |
| `reduce` (o 1º parâmetro é o acumulador) | `lista.reduce((acc, x) => acc + x, 0)` | totais, contadores |
| Módulos **[geral]** | `export default App` / `export const X` | `import App from './App'` / `import { X } from './X'` |

**JSON:**
- `JSON.parse(texto)` transforma texto em objeto (AJAX p.54).
- `JSON.stringify(obj)` faz o inverso, para enviar dados **[geral]**.

## 2. DOM, eventos e AJAX (a base do que o React automatiza)

- **DOM:** a página em forma de árvore (Document → html → head/body → elementos). O JS lê e altera a página por ele (DOM p.18-19). Seleção com `querySelector` / `querySelectorAll` / `getElementById`.
- **Eventos:**
  - registro com `addEventListener('click', fn)`;
  - **bubbling:** o evento sobe do alvo até a raiz, por isso o clique no `<a>` dentro do `<p>` dispara 2 alerts (DOM p.28-33);
  - **captura:** o evento desce da raiz até o alvo.
- **Script no `<head>` que não acha o elemento:** o elemento ainda não existe quando o script roda. A solução é `onload` ou pôr o script no fim do `<body>` (DOM p.35-37).
- **DHTML** = HTML + CSS + JS + DOM + eventos. O exemplo de mostrar e esconder trocando `className` é a mesma ideia da renderização condicional (DOM p.41-51).
- **AJAX:**
  - requisição HTTP **assíncrona** feita pelo JS, que recebe **só dados** (texto/JSON) e atualiza **parte** da página, sem recarregar HTML e CSS (AJAX p.10);
  - com XMLHttpRequest: `open('GET', url, true)` (o `true` é o assíncrono), `onreadystatechange` (o callback), `readyState === 4 && status === 200` e `send()` (AJAX p.13-23).
- **CORS:** o navegador bloqueia respostas de outro domínio, a menos que o servidor autorize. Na API da Wikipedia isso se resolve com `&origin=*` (AJAX p.61-67).

## 3. React: componentes e JSX

- **Componente** = função JS que **retorna JSX**, com nome começando em maiúscula (Intro slides 5, 17).
- **JSX** é convertido em JS pelo **Babel**. O React mantém um **Virtual DOM** e aplica no DOM real só as mudanças mínimas (ESP slide 63).
- **Raiz:** `ReactDOM.createRoot(document.getElementById('root')).render(<App />)` (Intro slides 19-20, 72).

**Regras do JSX:**

| HTML | JSX |
|---|---|
| `class="x"` | `className="x"` (Intro slide 34) |
| `for="email"` | `htmlFor="email"` **[geral]** |
| `onclick="..."` | `onClick={funcao}` (camelCase, recebe uma função) |
| `style="background-color: red"` | `style={{ backgroundColor: 'red' }}` (um objeto, Intro slide 43) |
| `<img>` / `<input>` | `<img />` / `<input />`: toda tag vazia precisa de `/` |
| dois elementos soltos no return | um elemento raiz só, ou um fragment `<>...</>` |
| `if` dentro do HTML | não pode: dentro de `{}` só cabem **expressões** |

**Listas:**
- `{lista.map(item => <li key={item.id}>{item.nome}</li>)}`;
- a **`key`** deve ser única e estável. Os slides omitem a `key`, mas **na prova coloque**.

## 4. Props

```jsx
function Card({ titulo, preco = 0, children }) {   // desestruturação + valor padrão
  return <div className="card"><h3>{titulo}</h3><p>R$ {preco}</p>{children}</div>;
}
<Card titulo="Notebook" preco={3500}><button>Comprar</button></Card>
```
- **O que são:** os atributos viram um objeto (`<Props1 v='pepino' k={x} />` gera `{ v: 'pepino', k: 2 }`) (ESP slide 45).
- **Sintaxe:** string vai entre aspas e qualquer outro valor entre `{}`.
- **Somente leitura:** o filho nunca altera uma prop.
- **`children`:** o que fica entre a abertura e o fechamento da tag (ESP slides 57-59).
- **Filho → pai:** o pai passa uma **função** por prop e o filho a chama (ESP slides 50-56; Ctx slides 11-13).
- **Irmãos:** o estado fica no **pai comum**. Um irmão recebe o valor e o outro recebe a função (lifting state up) (Ctx slides 14-18).

## 5. useState

```jsx
const [count, setCount] = useState(0);        // [valor, setter], com valor inicial
```
- **Ao chamar o setter**, o React **executa a função do componente de novo**, e o `useState` devolve o valor novo (ESP slides 12-19).
- **Pegadinha:** `setCount(count + 1)` três vezes dá **1**, porque no mesmo render `count` vale 0. Já `setCount(old => old + 1)` três vezes dá **3**, porque as atualizações entram numa fila (ESP slides 22-30). **Se o valor novo depende do anterior, use a função.**
- **Imutabilidade:** "states servem apenas para leitura" (ESP slide 35).
  - `list.push(x); setList(list)` **não re-renderiza**, porque passa a mesma referência.
  - O certo é criar um array novo (ESP slides 34-39):
    - adicionar: `setList([...list, novo])`
    - remover: `setList(list.filter(i => i.id !== id))`
    - editar: `setList(list.map(i => i.id === id ? { ...i, feito: !i.feito } : i))`
    - objeto aninhado: `setState({ ...state, address: { ...state.address, street: v } })` (ESP slides 40-41)
- **Formulário controlado** (ESP slides 31-33):
  ```jsx
  <input value={texto} onChange={e => setTexto(e.target.value)} />
  <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)} />
  <form onSubmit={e => { e.preventDefault(); /* usa o estado */ }}>
  ```
  - `value` sem `onChange` trava o input.
  - Sem `preventDefault()` no submit, a página recarrega.
- **Eventos:** use `onClick={f}`, **não** `onClick={f()}`, porque com parênteses a função roda no render. Para passar argumento: `onClick={() => remover(id)}` (ESP slides 4-6, 50).

## 6. useEffect

```jsx
useEffect(() => {
  // efeito: roda DEPOIS da renderização
  return () => { /* limpeza (opcional) */ };
}, [dependencias]);
```

**Por que ele existe:** "A cada renderização do componente, todo o código de sua função é executado" (Eff slide 9). Um `setInterval` ou `fetch` solto no corpo do componente se repete a cada render e se acumula (Eff slides 5-9).

| Forma | Quando roda | Equivale a |
|---|---|---|
| `useEffect(fn, [])` | **uma vez**, após o 1º render (Eff slide 11) | componentDidMount |
| `useEffect(fn, [busca])` | na montagem **e** sempre que `busca` mudar (Eff slides 16-18) | componentDidUpdate |
| `useEffect(fn)`, sem array | após **todo** render **[geral]** | — |
| `return () => ...` | antes de rodar de novo e ao desmontar (Eff slide 20) | componentWillUnmount |

**Buscar dados** (o padrão dos slides, Eff slide 13). O callback do useEffect **não pode ser `async`**, então usa-se uma IIFE async dentro dele:
```jsx
const [lista, setLista] = useState([]);
useEffect(() => {
  (async () => {
    const resp = await fetch('https://dummyjson.com/products?limit=5');
    const data = await resp.json();
    setLista(data.products);
  })();
}, []);
```

**Debounce com cleanup** (Eff slides 19-20, "ProductsSearchCorrect"):
```jsx
useEffect(() => {
  const id = setTimeout(() => { /* fetch com `busca` */ }, 900);
  return () => clearTimeout(id);   // cada tecla cancela a busca anterior
}, [busca]);
```

**Intervalo correto:**
```jsx
useEffect(() => {
  const id = setInterval(() => setCount(old => old + 5), 5000);   // updater: evita o valor velho
  return () => clearInterval(id);
}, []);
```

**Erros comuns:**
- `setX` sem array de dependências gera **loop infinito**;
- esquecer a dependência faz o efeito ler um valor velho;
- esquecer a cleanup acumula timers;
- `useEffect(async () => ...)` é errado.

## 7. Context API

- **Problema:** o **prop drilling**, que é passar uma prop por níveis que não a usam só para ela chegar a um neto (Ctx slides 23-26).
- **Solução, em 3 passos** (Ctx slides 27-32):
```jsx
import { createContext, useContext, useState } from 'react';

const ItensContext = createContext();                    // 1. criar (fora dos componentes)

function ListItens() {
  const [itens, setItens] = useState([]);
  const add = (item) => setItens([item, ...itens]);
  const remove = (item) => setItens(itens.filter(i => i !== item));
  return (
    <ItensContext.Provider value={{ add, remove }}>      {/* 2. prover (envolve a subárvore) */}
      <Form />
      <ul>{itens.map(item => <Item key={item} text={item} />)}</ul>
    </ItensContext.Provider>
  );
}

function Item({ text }) {
  const { remove } = useContext(ItensContext);          // 3. consumir (sem props)
  return <li>{text} <button onClick={() => remove(text)}>remove</button></li>;
}
```
(Ctx slides 37-42: o contexto compartilha **funções** também. Props e contexto convivem: o `text` continua chegando por prop.)

- **`value={{ ... }}`:** as chaves de fora abrem a expressão e as de dentro formam o objeto.
- **Onde funciona:** o consumidor precisa estar **dentro** do Provider. Fora dele, recebe o valor padrão do `createContext`.
- **Provider customizado [geral]:** é o padrão mais organizado:
  ```jsx
  export function TemaProvider({ children }) {
    const [tema, setTema] = useState('claro');
    return <TemaContext.Provider value={{ tema, setTema }}>{children}</TemaContext.Provider>;
  }
  // main.jsx: <TemaProvider><App /></TemaProvider>
  ```
- **Quando usar:** dados que muitos componentes em níveis diferentes leem (tema, usuário logado, carrinho).
- **Quando não usar:** para passar um dado a um filho direto (use prop) ou para estado que só um componente usa (use `useState`).
- **Context × Redux:**
  - Context é nativo e evita o prop drilling.
  - Redux é uma biblioteca de estado global com Store única, actions `{ type, payload }` e reducers puros (Action → Reducer → Store → UI).

## 8. Renderização condicional

```jsx
if (carregando) return <p>Carregando...</p>;              // 1. if antes do return (Intro slides 48-49)
if (!usuario) return null;                                 //    null = não renderiza nada

<p className={hora < 12 ? 'manha' : 'tarde'}>...</p>        // 2. ternário (Intro slides 50-51)
{logado ? <Painel /> : <Login />}

{erro && <p className="erro">{erro}</p>}                    // 3. && (Intro slides 52-53)
{lista.length > 0 && <Lista itens={lista} />}               //    NUNCA {lista.length && ...}: mostra "0"
```

**Padrão loading / erro / vazio / dados**, que responde às perguntas abertas do slide de AJAX (p.69-70):
```jsx
if (carregando) return <p>Carregando...</p>;
if (erro) return <p>Erro: {erro}</p>;
return lista.length === 0 ? <p>Nada encontrado</p> : <ul>{lista.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
```

## 9. Pegadinhas (revise 2 minutos antes de entrar)

1. **`setX(x+1)` repetido** soma 1 só. Use `setX(old => old + 1)`.
2. **`push`/`splice`/atribuição no estado** não re-renderiza. Use spread, `map` ou `filter`.
3. **`onClick={f()}`** chama no render. O certo é `onClick={f}` ou `onClick={() => f(x)}`.
4. **`key`** em todo `.map`.
5. **`{0 && <X/>}`** renderiza "0".
6. **`className` / `htmlFor` / `style={{}}` camelCase / tags fechadas / uma raiz ou `<>`.**
7. **Callback do useEffect não pode ser async.** Use uma IIFE ou função async interna.
8. **`[]`** = uma vez; **`[dep]`** = quando `dep` muda; **sem array** = todo render (e risco de loop).
9. **Cleanup:** `return () => clearTimeout/clearInterval(id)`.
10. **Consumidor de contexto fora do Provider** recebe o valor padrão (normalmente `undefined`, e aí quebra).
11. **Hooks só no topo do componente:** nunca dentro de `if`, loop ou função interna.
12. **Input controlado:** `value` + `onChange` com `e.target.value`; checkbox com `checked` e `e.target.checked`.
13. **Submit de formulário:** `e.preventDefault()`.
14. **`fetch` não cai no catch com erro 404/500.** Confira `resp.ok`.

**"Encontre o erro" (estes estão nos slides):**
- `stree` em vez de `street` (ESP 40)
- `setNumber` em vez de `setDigit` (ESP 50)
- `abobrinha=2` sem chaves (ESP 50)
- `Prop3` vs `Props3` (ESP 57)
- `function Style () =>` (Intro 43)
- `f2` usa `ev` sem recebê-lo (ESP 5)
- `<Child_2 />` sem passar `count` (Ctx 23)

---

## 10. Perguntas discursivas (tente responder antes de ler)

1. **Qual a diferença entre props e state?**
   - Props vêm do pai e são somente leitura.
   - State é interno, criado com `useState`. Quando muda pelo setter, o componente re-renderiza.
   - Um estado do pai passado como prop faz o filho re-renderizar (ESP 45-49).
2. **Por que `setCount(count + 1)` chamado três vezes resulta em 1? Como corrigir?**
   - Dentro do mesmo render, `count` é constante (0), então as três chamadas pedem 1.
   - A correção é `setCount(old => old + 1)`: as atualizações vão para uma fila e cada uma usa o valor anterior (ESP 22-30).
3. **Por que `lista.push(x); setLista(lista)` não atualiza a tela?**
   - O estado é imutável. O `push` altera o mesmo array e o React compara pela referência, então não detecta mudança.
   - O certo é criar um array novo com spread, `map` ou `filter` (ESP 34-39).
4. **O que é um input controlado?**
   - É um input cujo `value` vem do estado, com um `onChange` que atualiza o estado com `e.target.value`. O estado vira a única fonte da verdade (ESP 31-33).
5. **Explique o array de dependências do useEffect e a função de limpeza.**
   - `[]`: roda só após o 1º render. `[dep]`: roda na montagem e quando `dep` muda. Sem array: roda após todo render.
   - A função retornada (limpeza) roda antes da próxima execução e na desmontagem: cancela timers e listeners (Eff 11, 16-20).
6. **Por que não colocar `fetch` ou `setInterval` direto no corpo do componente?**
   - A cada render todo o código da função é executado, então a requisição ou o timer se repete e se acumula.
   - Efeitos colaterais vão no `useEffect` (Eff 5-9).
7. **Por que o fetch fica dentro de uma função async auto-executada no useEffect?**
   - Uma função async retorna uma Promise, e o React espera que o callback retorne nada ou uma função de limpeza (Eff 13).
8. **O que é prop drilling e como a Context API resolve?**
   - Prop drilling é passar uma prop por níveis intermediários que não a usam (Ctx 23-26).
   - Com Context, o dado é publicado num `Provider` (`value`) e qualquer descendente o lê com `useContext`, sem props (Ctx 27-32).
9. **Como um filho altera o estado do pai? E como dois irmãos compartilham dados?**
   - O pai passa uma função callback por prop e o filho a chama.
   - Entre irmãos, o estado sobe para o pai comum: um irmão recebe o valor e o outro a função (Ctx 11-18).
10. **Cite as formas de renderização condicional e um cuidado com `&&`.**
    - As formas: `if` com `return` antecipado (ou `return null`), ternário e `&&`.
    - O cuidado: `{0 && ...}` mostra "0", então use uma comparação booleana (Intro 47-53).
11. **O que é JSX e o Virtual DOM?**
    - JSX é marcação parecida com HTML dentro do JS, convertida pelo Babel.
    - O React mantém uma árvore virtual em memória, compara as versões e aplica no DOM real só as mudanças mínimas (Intro 16; ESP 63).
12. **O que é AJAX e por que é assíncrono?**
    - É uma requisição HTTP feita pelo JS que recebe só dados e atualiza parte da página, sem recarregá-la.
    - É assíncrona porque a interface continua respondendo enquanto a resposta não chega; o resultado é tratado num callback ou numa Promise (AJAX 2-10).
13. **Context API ou Redux: quando usar cada um?**
    - Context é nativo, serve para evitar o prop drilling e para estado compartilhado simples (tema, usuário).
    - Redux é para estado global grande, com fluxo previsível: Store única, actions e reducers puros (Redux 6-10, 20).

---

## 11. Práticas de implementação

**Como treinar sem instalar nada:**
- **CodeSandbox** (o link está no Moodle): https://codesandbox.io/p/sandbox/react-new
- ou o arquivo `pratica-react.html`, ao lado deste guia: abra no navegador e edite o `<script type="text/babel">`. É o modo CDN dos slides (Intro 12-22).

Faça **cronometrado**. A prova tem 50 minutos no total.

### Prática 1: Lista de tarefas com Context (25 min). Cobre tudo da prova.
Requisitos:
1. `TarefasContext` com `tarefas`, `adicionar(texto)`, `alternar(id)` e `remover(id)`, num **Provider customizado** com `children`.
2. `<Formulario />`: input **controlado** + `<form onSubmit>` com `preventDefault`. Não adiciona texto vazio e limpa o input depois.
3. `<ListaTarefas />`: `map` com `key`. Cada `<ItemTarefa />` recebe a tarefa **por prop** e usa o contexto para alternar e remover.
4. **Renderização condicional:**
   - "Nenhuma tarefa" quando a lista está vazia;
   - texto riscado (`textDecoration: 'line-through'`) quando a tarefa está feita, com ternário no `style`;
   - "Tudo pronto! 🎉" só quando todas estiverem feitas, com `&&`.
5. `<Contador />` mostra "X de Y concluídas" (valor derivado, sem estado próprio, com `filter`).
6. **useEffect:** atualize o `document.title` com o número de pendentes, com a dependência certa.

<details><summary>Gabarito da Prática 1</summary>

```jsx
const { createContext, useContext, useState, useEffect } = React;   // no modo CDN; no Vite use import

const TarefasContext = createContext();

function TarefasProvider({ children }) {
  const [tarefas, setTarefas] = useState([]);
  const adicionar = (texto) => setTarefas([...tarefas, { id: Date.now(), texto, feita: false }]);
  const alternar = (id) => setTarefas(tarefas.map(t => t.id === id ? { ...t, feita: !t.feita } : t));
  const remover = (id) => setTarefas(tarefas.filter(t => t.id !== id));
  return <TarefasContext.Provider value={{ tarefas, adicionar, alternar, remover }}>{children}</TarefasContext.Provider>;
}

function Formulario() {
  const { adicionar } = useContext(TarefasContext);
  const [texto, setTexto] = useState('');
  function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    adicionar(texto.trim());
    setTexto('');
  }
  return (
    <form onSubmit={enviar}>
      <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Nova tarefa" />
      <button type="submit">Adicionar</button>
    </form>
  );
}

function ItemTarefa({ tarefa }) {
  const { alternar, remover } = useContext(TarefasContext);
  return (
    <li>
      <input type="checkbox" checked={tarefa.feita} onChange={() => alternar(tarefa.id)} />
      <span style={{ textDecoration: tarefa.feita ? 'line-through' : 'none' }}>{tarefa.texto}</span>
      <button onClick={() => remover(tarefa.id)}>remover</button>
    </li>
  );
}

function ListaTarefas() {
  const { tarefas } = useContext(TarefasContext);
  if (tarefas.length === 0) return <p>Nenhuma tarefa</p>;
  return <ul>{tarefas.map(t => <ItemTarefa key={t.id} tarefa={t} />)}</ul>;
}

function Contador() {
  const { tarefas } = useContext(TarefasContext);
  const feitas = tarefas.filter(t => t.feita).length;
  useEffect(() => {
    document.title = `${tarefas.length - feitas} pendente(s)`;
  }, [tarefas, feitas]);
  return (
    <>
      <p>{feitas} de {tarefas.length} concluídas</p>
      {tarefas.length > 0 && feitas === tarefas.length && <p>Tudo pronto! 🎉</p>}
    </>
  );
}

function App() {
  return (
    <TarefasProvider>
      <h1>Tarefas</h1>
      <Formulario />
      <ListaTarefas />
      <Contador />
    </TarefasProvider>
  );
}
```
</details>

### Prática 2: Busca de produtos com fetch, loading e debounce (20 min)
API: `https://dummyjson.com/products/search?q=TERMO&limit=10` (a mesma dos slides do useEffect).
1. Input controlado `busca`.
2. useEffect com `[busca]` e **debounce de 600 ms** com cleanup (`clearTimeout`).
3. Estados `carregando`, `erro` e `produtos`. Mostre "Carregando...", a mensagem de erro (confira `resp.ok`) ou "Nenhum produto encontrado".
4. `<CardProduto produto={p} />` por **prop**: título, preço e o selo "Promoção!" só se `discountPercentage > 10` (com `&&`).
5. Um botão "ordenar por preço" que alterna crescente/decrescente. Ordene uma **cópia** (`[...produtos].sort(...)`), nunca o estado.

<details><summary>Gabarito da Prática 2</summary>

```jsx
function CardProduto({ produto }) {
  return (
    <div className="card">
      <h3>{produto.title}</h3>
      <p>R$ {produto.price}</p>
      {produto.discountPercentage > 10 && <span className="selo">Promoção!</span>}
    </div>
  );
}

function BuscaProdutos() {
  const [busca, setBusca] = useState('phone');
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [crescente, setCrescente] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      (async () => {
        setCarregando(true);
        setErro(null);
        try {
          const resp = await fetch(`https://dummyjson.com/products/search?q=${busca}&limit=10`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          setProdutos(data.products);
        } catch (e) {
          setErro(e.message);
        } finally {
          setCarregando(false);
        }
      })();
    }, 600);
    return () => clearTimeout(id);
  }, [busca]);

  const ordenados = [...produtos].sort((a, b) => crescente ? a.price - b.price : b.price - a.price);

  return (
    <section>
      <input value={busca} onChange={e => setBusca(e.target.value)} />
      <button onClick={() => setCrescente(c => !c)}>Preço {crescente ? '↑' : '↓'}</button>
      {carregando && <p>Carregando...</p>}
      {erro && <p>Erro: {erro}</p>}
      {!carregando && !erro && ordenados.length === 0 && <p>Nenhum produto encontrado</p>}
      {ordenados.map(p => <CardProduto key={p.id} produto={p} />)}
    </section>
  );
}
```
</details>

### Prática 3: Tema claro/escuro e usuário com Context (10 min)
1. `TemaContext` com `tema` e `alternarTema`. O `<App />` aplica `style={{ background: tema === 'escuro' ? '#222' : '#fff', color: ... }}`.
2. `<BotaoTema />`, que fica **dois níveis abaixo**, troca o tema sem receber props.
3. `<Saudacao />`: se não houver usuário, mostra um botão "Entrar", que define `{ nome: 'Gustavo' }`. Se houver, mostra "Olá, Gustavo" e um botão "Sair" (ternário).

<details><summary>Gabarito da Prática 3</summary>

```jsx
const TemaContext = createContext();

function TemaProvider({ children }) {
  const [tema, setTema] = useState('claro');
  const alternarTema = () => setTema(t => t === 'claro' ? 'escuro' : 'claro');
  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>;
}

function BotaoTema() {
  const { tema, alternarTema } = useContext(TemaContext);
  return <button onClick={alternarTema}>Tema: {tema}</button>;
}
function Barra() { return <nav><BotaoTema /></nav>; }   // nível intermediário, sem props

function Saudacao() {
  const [usuario, setUsuario] = useState(null);
  return usuario
    ? <p>Olá, {usuario.nome} <button onClick={() => setUsuario(null)}>Sair</button></p>
    : <button onClick={() => setUsuario({ nome: 'Gustavo' })}>Entrar</button>;
}

function Pagina() {
  const { tema } = useContext(TemaContext);
  const escuro = tema === 'escuro';
  return (
    <div style={{ background: escuro ? '#222' : '#fff', color: escuro ? '#fff' : '#222', padding: 16 }}>
      <Barra />
      <Saudacao />
    </div>
  );
}

function App() { return <TemaProvider><Pagina /></TemaProvider>; }
```
</details>

### Prática 4: Explique o código (treino da parte discursiva, 5 min)
Diga o que acontece e o que está errado em cada trecho:
```jsx
// a)
function A() { const [n, setN] = useState(0); setN(n + 1); return <p>{n}</p>; }
// b)
useEffect(async () => { const r = await fetch(url); setDados(await r.json()); }, []);
// c)
<button onClick={remover(item.id)}>x</button>
// d)
{carrinho.length && <span>{carrinho.length} itens</span>}
// e)
function B() { const [lista, setLista] = useState([]); return <button onClick={() => { lista.push('x'); setLista(lista); }}>add</button>; }
```

<details><summary>Respostas</summary>

- **a)** `setN` no corpo do componente provoca re-render, que chama `setN` de novo: loop infinito ("Too many re-renders"). A atualização deve ficar num evento ou num `useEffect`.
- **b)** O callback do useEffect não pode ser async, porque retornaria uma Promise. Crie uma função async dentro dele e chame-a.
- **c)** `remover(item.id)` é executado no render, e não no clique. O certo é `onClick={() => remover(item.id)}`.
- **d)** Com o carrinho vazio, aparece "0" na tela. Use `carrinho.length > 0 && ...`.
- **e)** O código muta o estado e passa a mesma referência, então o React não re-renderiza. O certo é `setLista([...lista, 'x'])`.
</details>

---

## 12. Esqueleto para começar rápido na prova

```jsx
import { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext();

function AppProvider({ children }) {
  const [itens, setItens] = useState([]);
  return <AppContext.Provider value={{ itens, setItens }}>{children}</AppContext.Provider>;
}

function Lista() {
  const { itens, setItens } = useContext(AppContext);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const resp = await fetch('https://dummyjson.com/products?limit=5');
      const data = await resp.json();
      setItens(data.products);
      setCarregando(false);
    })();
  }, []);

  if (carregando) return <p>Carregando...</p>;
  return itens.length === 0
    ? <p>Vazio</p>
    : <ul>{itens.map(i => <li key={i.id}>{i.title}</li>)}</ul>;
}

export default function App() {
  return <AppProvider><Lista /></AppProvider>;
}
```

Boa prova!
