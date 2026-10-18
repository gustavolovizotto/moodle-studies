# Programação Web Fullstack: resumo da matéria

Disciplina ES47B, profª Juliana Costa Silva (UTFPR), semestre 2026/2. O resumo cobre tudo o que está no Moodle até a Avaliação Presencial 1, na ordem das aulas.

Citações no formato `(Sigla, slide N)`:

| Sigla | Slides |
|---|---|
| **Plano** | 00_Sobre_Disciplina |
| **DOM** | 00-revisao-javascript-dom |
| **ES6** | 01-revisao-js-es6-oo-context |
| **AJAX** | 02-revisao-ajax |
| **Intro** | 04-introdução-ao-react |
| **ESP** | 05-react-events-states-props |
| **Ctx** | 06.1-react-context |
| **Eff** | 06.2-react-useEffect |
| **Redux** | 06.3-react-redux-intro |

Muitos slides são só código em imagem. Onde o exemplo de código é meu, e não dos slides, aparece **[geral]**.

O [guia-prova-17-10.md](guia-prova-17-10.md) tem a parte de React mais detalhada, com pegadinhas, perguntas discursivas e práticas com gabarito. Este resumo dá a visão geral.

---

## Mapa da disciplina

```
Revisão da web:  HTTP → HTML/CSS → DOM e eventos → JS/ES6 → AJAX/fetch/JSON
React (front):   componentes e JSX → eventos, estado e props → comunicação e Context → useEffect → Redux
Ainda vem:       Node.js, Express e MongoDB → WebServices, REST → segurança (Plano, slides 18 a 21)
```

**Avaliação (Plano, slides 27 a 30):**
- **T1:** desenvolvimento front-end (Projeto 1, em React), entregue em 14/10. Vale **40%**.
- **T2:** projeto fullstack (front + back + banco + implantação), entrega em 19/12. Vale **60%**.
- **NF = T1 × 0,4 + T2 × 0,6.** Com NF ≥ 6 você passa. Com 3 ≤ NF < 6 vai para o exame (previsto para 02/12).
- Cada dia de atraso desconta 10% da nota.
- Usar IA **não é proibido**, mas é preciso demonstrar e explicar o uso, e as entregas têm defesa.

---

## 1. Como a web funciona

- **Cliente-servidor sobre HTTP:** o navegador manda uma requisição (`GET / HTTP/1.1`, com cabeçalhos como `Host` e `User-Agent`). O servidor responde com status (`200 OK`), cabeçalhos (`content-type: text/html`) e o corpo, que é o HTML (DOM, slides 3 e 8).
- **A evolução** (DOM, slides 2 a 12):
  - **Web 1.0 (1989):** HTML + HTTP + navegador (Tim Berners-Lee).
  - Depois vêm o **CSS**, a **programação no servidor** e o **banco de dados**.
  - **Web 2.0 (2005):** **JavaScript + Ajax**, com páginas que se atualizam sem recarregar.
  - **Hoje:** HTML5 (Web Workers, Storage, SVG, vídeo, canvas, WebSockets) e CSS com transforms e transitions.
- **Fullstack** é trabalhar nas duas pontas. No **cliente** ficam HTML, CSS e JS. No **servidor** ficam a lógica e o banco (DOM, slide 12).

---

## 2. DOM, eventos e DHTML

### DOM
- O **DOM** é a página em forma de **árvore** de objetos: `document` → `<html>` → `<head>`/`<body>` → elementos. O JS lê e altera a página através dele (DOM, slides 14 a 17).
  - Exemplo do slide: `document.body.childNodes[3].innerHTML` lê o texto do `<p>`. Atribuir um valor a ele troca o texto na tela.
- Como selecionar elementos (DOM, slide 19):

| Método | Devolve |
|---|---|
| `document.getElementById('id')` | um elemento |
| `document.getElementsByTagName('p')` | coleção (use `[0]`) |
| `document.querySelector('.classe')` | o **primeiro** que casa com o seletor CSS |
| `document.querySelectorAll('li')` | **todos** os que casam |

### Eventos
- Três jeitos de registrar (DOM, slides 20 e 21):
  ```html
  <a onclick="alert('clicou')">link</a>                <!-- no HTML -->
  <script>
    elemento.onclick = function () { alert('clicou'); };   // propriedade
    elemento.addEventListener('click', () => { ... });     // [geral] o mais usado hoje
  </script>
  ```
- Tipos: mouse, teclado e foco (DOM, slide 22).
- **Fluxo do evento** (DOM, slides 25 a 28):
  1. **Captura:** o evento desce da raiz do documento até o elemento clicado (o *target*).
  2. **Borbulhamento** (*bubbling*): o evento sobe do target até a raiz, disparando os handlers do mesmo evento em todos os ancestrais.

  Por isso, ao clicar num `<a>` dentro de um `<p>`, quando os dois têm `onclick`, aparecem **dois alerts**: primeiro o do link, depois o do parágrafo (DOM, slides 23 e 24).
- **Script no `<head>` que não acha o elemento:** o `<h2>` ainda não existe quando o script roda (DOM, slides 30 a 32). Há duas soluções:
  - usar o evento **`onload`** (`window.onload = function () { ... }`);
  - pôr o `<script>` no fim do `<body>`.

### DHTML
**DHTML = (X)HTML + CSS + JavaScript + DOM HTML + HTML Events**, ou seja, aplicações dinâmicas (DOM, slides 34 e 35). Um exemplo é o JS trocar a classe CSS de um elemento no clique para mostrá-lo ou escondê-lo. É a mesma ideia que o React automatiza mais tarde com a renderização condicional.

---

## 3. JavaScript ES6

### Escopo (ES6, slides 7 a 12)
- **`var`** tem escopo de **função**. **`let`** e **`const`** têm escopo de **bloco** (`{ }`).
- O exemplo do slide imprime `2 3`, depois `2 300`, depois `13 100`. Dentro do bloco, o `b` do `let` vale 3. Ao sair do bloco, volta o `b` da função (300). Fora da função, valem os valores externos (a = 13, b = 100).
- **`const`** não pode ser reatribuída. Mas um objeto ou array em `const` **pode** ter o conteúdo alterado. **[geral]**

### Funções (ES6, slides 13 a 26)
- Três formas: declaração (`function f() {}`), atribuição (`const f = function () {}`) e **arrow function** (`const f = (a, b) => a + b`).
- **Funções são valores**: podem ser passadas como parâmetro (callback) e retornadas por outras funções (slides 29 a 34, a questão das funções `c` e `d`).
- **Métodos de array que recebem uma função** (slides 20 a 26):

| Método | Faz | Retorna |
|---|---|---|
| `forEach(fn)` | executa `fn` em cada item | nada (`undefined`) |
| `map(fn)` | transforma cada item | **novo** array, do mesmo tamanho |
| `filter(fn)` | mantém os itens em que `fn` dá `true` | **novo** array |
| `reduce(fn, inicial)` | acumula tudo num valor só | o acumulado **[geral]** |
| `find(fn)` | o primeiro item que satisfaz `fn` | o item, ou `undefined` **[geral]** |

  O fato de `map` e `filter` **não alterarem o original** é exatamente o que o React exige para o estado.

### Objetos, arrays e JSON (ES6, slides 35 a 42)
- Objeto literal: `const a = { nome: 'Ana', profissao: ['dev', 'prof'] }`.
- Acesso por ponto ou por colchete: `a.nome` ou `a["nome"]`. Os **índices de objeto são strings** (slide 37).
- As perguntas dos slides treinam acesso aninhado:
  - `a["nome"][3]` é o 4º caractere do nome;
  - `a.products[1].images[0]` é a primeira imagem do segundo produto (é o formato da API dummyjson).
- **Desestruturação** **[geral]**: `const { nome } = pessoa` (pelo nome) e `const [x, y] = lista` (pela posição).
- **Spread** **[geral]**: `[...lista, novo]` e `{ ...obj, campo: valor }`. Copiam sem alterar o original.
- **JSON** é o formato de texto dos dados na web. `JSON.parse(texto)` transforma o texto em objeto, e `JSON.stringify(obj)` faz o inverso. **[geral]**

### Orientação a objetos: três jeitos (ES6, slides 50 a 70)
O exemplo dos slides tem `Pessoa` (nome, idade, `apresentacao()`) e `Professor`, que herda de Pessoa e acrescenta `dar_aula()`.

**1) ES6 Class:** construtor, atributos, métodos e herança com `extends` (slides 52 a 55).
```js
class Pessoa {
  constructor(nome, idade) { this.nome = nome; this.idade = idade; }
  apresentacao() { return `Sou ${this.nome}, ${this.idade} anos`; }
}
class Professor extends Pessoa {
  dar_aula() { console.log(`${this.nome} está dando aula`); }   // novo método
}
```

**2) Closure:** a capacidade de uma função **"recordar" o escopo em que foi declarada**. Serve, por exemplo, para guardar os atributos de uma "classe" (slide 56). A função gera e retorna um objeto anônimo com o método `apresentacao`, e esse objeto continua acessando `p_nome` e `p_idade` pela closure (slides 58 e 59).
```js
function criaPessoa(p_nome, p_idade) {          // [geral] no formato do slide
  return { apresentacao: () => `Sou ${p_nome}, ${p_idade} anos` };
}
```
Os dados ficam **privados**: não há como acessar `p_nome` de fora.

**3) Prototype:** o jeito original do JS. A função construtora define os atributos, e os métodos vão em `Construtor.prototype`. Todos os objetos compartilham esses métodos, e a herança acontece pela cadeia de protótipos (slides 65 a 70). A `class` do ES6 é uma "roupa nova" sobre o prototype. **[geral]**

### Contexto e `this` (ES6, slides 71 a 80)
- O **`this`** depende de **como a função é chamada**, não de onde ela foi escrita. Quando o método é passado como callback, ele perde o contexto e o `this` deixa de ser o objeto.
- Como mudar ou fixar o contexto (slide 80):

| Forma | Uso |
|---|---|
| `f.call(obj, a, b)` | chama já, com `this = obj` e os argumentos separados |
| `f.apply(obj, [a, b])` | chama já, com os argumentos num **array** |
| `f.bind(obj)` | **não chama**: devolve uma nova função com o `this` fixo |
| **arrow function** | não tem `this` próprio, então usa o `this` de onde foi escrita |
| variável **`self`** | `const self = this;` antes do callback, e depois usa `self` dentro dele |

---

## 4. AJAX, XMLHttpRequest, fetch e APIs JSON

### O que é
- AJAX é um **"estilo arquitetural composto por diferentes ideias e tecnologias relacionadas"** (Mahemoff, citado em AJAX, slide 2).
- **Sem AJAX**, cada interação pede uma página nova inteira (HTML + CSS + JS).
- **Com AJAX**, o JS faz uma requisição HTTP **assíncrona**, recebe **apenas os dados**, em texto ou JSON, e atualiza **só uma parte** da página. Layout e apresentação não são baixados de novo (AJAX, slides 3 a 7).

### XMLHttpRequest (AJAX, slides 10 a 20)
```js
function loadXMLDoc(url) {
  var xmlhttp = new XMLHttpRequest();           // objeto AJAX
  xmlhttp.open("GET", url, true);               // método, URL, true = assíncrono
  xmlhttp.onreadystatechange = function () {    // callback: roda a cada mudança de estado
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200)   // 4 = concluída; 200 = OK
      document.getElementById('test').innerHTML = xmlhttp.responseText;
  };
  xmlhttp.send(null);                           // dispara a requisição
}
```

### fetch, a forma moderna **[geral]**, que é a usada nos exemplos de React
```js
async function buscar() {
  try {
    const resp = await fetch('https://dummyjson.com/products?limit=5');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);   // fetch NÃO falha sozinho com 404/500
    const dados = await resp.json();                        // corpo → objeto JS
    console.log(dados.products);
  } catch (e) {
    console.error(e);
  }
}
```
- **Promise** é a promessa de um valor futuro. `await` espera por ele, mas só dentro de uma função `async`.

### APIs JSON e CORS (AJAX, slides 40 a 54)
- O exemplo do slide é a API da Wikipedia: `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=UTFPR&format=json`.
- **CORS:** o navegador bloqueia a resposta vinda de **outro domínio**, a não ser que o servidor autorize. Na Wikipedia, a autorização vem com `&origin=*` (slide 44). As alternativas antigas eram IFrame, **JSONP** e proxy (slide 54).
- **Perguntas que a professora deixa:** como mostrar um ícone de "carregando"? E uma mensagem de erro (slides 51 e 52)? A resposta é guardar um estado `carregando`/`erro` e decidir o que mostrar, o que no React vira renderização condicional (seção 9).
- Outros pontos (slide 53): envio por **GET e POST**, o formato `x-www-form-urlencoded` e requisições múltiplas.

---

## 5. React: introdução

### O que é
- O React é uma **biblioteca** para construir interfaces com **componentes**: a marcação e a lógica escritas juntas, mais a interatividade (Intro, slide 3).
- **Componente** = **função JavaScript que retorna JSX**. O nome começa com letra maiúscula (Intro, slides 5 e 17).
- **JSX** é uma marcação parecida com HTML dentro do JS. O **Babel** converte o JSX em JS comum (Intro, slides 5 e 16).
- O React mantém um **Virtual DOM**: compara a versão nova com a anterior e aplica no DOM real só o que mudou (ESP, slide 63).
- Dá para rodar de dois jeitos:
  - **Via CDN**, num HTML com `<script type="text/babel">` (Intro, slides 12 a 22). É o jeito do arquivo `pratica-react.html`.
  - **Projeto com build:** `create-react-app`, que usa Babel + **Webpack** (Intro, slides 61 a 75). Hoje o mais comum é o Vite. **[geral]**
- **Ponto de entrada:** `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`.

### Composição
Componentes são usados dentro de outros como se fossem tags. No exemplo, `App` contém `Lista`, que contém `ImagemAbacaxi`, `ImagemAbobrinha` e `ImagemPepino` (Intro, slides 23 a 33).

### Regras do JSX
| HTML | JSX |
|---|---|
| `class="x"` | `className="x"` (Intro, slide 34) |
| `style="color: red"` | `style={{ color: 'red' }}`: um objeto, em camelCase (Intro, slide 43) |
| `onclick="f()"` | `onClick={f}`: recebe a **função** |
| `<img>` | `<img />`: tag vazia sempre fechada |
| vários elementos soltos | **um** elemento raiz, ou um fragment `<>...</>` |

### Expressões `{ }` (Intro, slides 37 a 46)
Trechos de JS entre chaves dentro do JSX. Servem para:
- mostrar valores: `{nome}`, `{2 + 2}`;
- chamar funções: `{formatar(preco)}`;
- retornar componentes ou **arrays de componentes**;
- montar o objeto de estilo.

Só cabem **expressões**, não comandos: `if` e `for` não entram, mas ternário e `map` sim.

### Renderização condicional (Intro, slides 47 a 53)
```jsx
if (!logado) return <Login />;                     // if antes do return
{logado ? <Painel /> : <Login />}                   // ternário
{erro && <p className="erro">{erro}</p>}            // && (só mostra se for verdadeiro)
```
⚠️ `{lista.length && <Lista />}` mostra **"0"** quando a lista está vazia. Use `lista.length > 0 && ...`.

### Renderização de listas (Intro, slides 54 a 60)
```jsx
<ul>{frutas.map(f => <li key={f.id}>{f.nome}</li>)}</ul>
```
A **`key`** deve ser única e estável. Ela ajuda o React a saber qual item mudou.

---

## 6. Eventos, estado e props

### Eventos (ESP, slides 2 a 5)
- São os nomes do DOM em camelCase: `onClick`, `onKeyUp`, `onFocus`, `onChange`, `onSubmit`.
- Passe **uma função**, sem chamá-la: `onClick={incrementar}`. Para passar argumento, use `onClick={() => remover(id)}`.
- ⚠️ `onClick={incrementar()}` roda a função **durante a renderização**, e não no clique.

### Estado: `useState` (ESP, slides 6 a 40)
```jsx
const [count, setCount] = useState(0);    // [valor, função], com valor inicial
```
- **Hook** é uma função especial do React (`use...`), chamada **no topo** do componente.
- Ao chamar `setCount`, o React **executa o componente de novo** com o valor novo. É assim que a tela se atualiza (slides 11 a 19).
- Uma **variável comum** (`let count = 0`) não serve: ela volta a 0 a cada renderização e não avisa o React (slides 21 a 23).
- **Fila de alterações** (slides 24 a 29):
  - `setCount(count + 1)` chamado 3 vezes no mesmo clique dá **1**;
  - `setCount(old => old + 1)` chamado 3 vezes dá **3**.

  Quando o valor novo depende do anterior, use a função.
- **Inputs controlados** (slides 30 a 32): `<input value={val} onChange={e => setVal(e.target.value)} />`.
- **Imutabilidade:** "states servem apenas para leitura" (slides 34 a 40). Nunca altere o estado diretamente; crie um **novo** array ou objeto:
  ```jsx
  setLista([...lista, novo]);                                  // adicionar
  setLista(lista.filter(i => i.id !== id));                    // remover
  setLista(lista.map(i => i.id === id ? { ...i, feito: true } : i));   // editar
  setPessoa({ ...pessoa, endereco: { ...pessoa.endereco, rua: v } });  // objeto aninhado
  ```
  `lista.push(x); setLista(lista)` **não atualiza a tela**, porque a referência é a mesma.

### Props (ESP, slides 41 a 58)
- São os **atributos** do componente, que chegam como **um objeto**. `<Props1 v="pepino" k="2" />` gera `{ v: 'pepino', k: '2' }` (slide 44).
- **Somente leitura** para quem recebe.
- Se o pai passa o **estado** dele como prop, o filho re-renderiza quando esse estado muda (slides 45 a 48).
- Uma prop pode ser uma **função** (callback): é assim que o filho avisa o pai (slides 52 a 55).
- **`children`** é o conteúdo entre a abertura e o fechamento da tag do componente.

| | Props | State |
|---|---|---|
| quem define | o **pai** | o próprio componente |
| pode mudar? | não (somente leitura) | sim, pelo setter |
| quando muda... | o componente re-renderiza | o componente re-renderiza |

### Ciclo de vida (ESP, slides 59 a 62; Eff, slides 2 e 3)
Um componente passa por três fases:
1. **montagem:** aparece na tela;
2. **atualização:** re-renderiza quando o estado ou as props mudam;
3. **desmontagem:** sai da tela.

O `useEffect` (seção 8) é o jeito de agir em cada fase.

---

## 7. Comunicação entre componentes e Context API

### Pensando em React (Ctx, slides 2 a 5)
Divida a tela numa árvore de componentes. No exemplo do react.dev: `FilterableProductTable` → `SearchBar` + `ProductTable` → `ProductCategoryRow` / `ProductRow`. Depois decida **onde mora cada estado**: no componente mais alto que precisa dele (`search` e `only_in_stock`).

### Os três casos com props (Ctx, slides 7 a 19)
| Direção | Como |
|---|---|
| **pai → filho** | o pai passa o valor por prop: `<Child_1 par={t} />` |
| **filho → pai** | o pai passa uma **função** por prop, e o filho a chama: `<Child_2 st_f={setC} />` |
| **irmão → irmão** | o estado **sobe para o pai comum** (*lifting state up*). Um irmão recebe a função, e o outro recebe o valor |

### Context API (Ctx, slides 23 a 42)
- **Problema: prop drilling.** É passar uma prop por vários níveis que não a usam, só para ela chegar a um componente lá embaixo.
- **Solução em 3 passos:**
  ```jsx
  const CountContext = createContext();                       // 1. criar

  function Parent() {
    const [count, setCount] = useState(0);
    return (
      <CountContext.Provider value={{ count, setCount }}>     {/* 2. prover */}
        <Child_1 />
        <Child_2 />
      </CountContext.Provider>
    );
  }

  function Child_2() {
    const { count } = useContext(CountContext);               // 3. consumir, sem props
    return <p>{count}</p>;
  }
  ```
- O contexto pode compartilhar **funções** também, como o `ItensContext` com `{ add, remove }` usado pelo `Form` e pelo `Item` (slides 38 a 42).
- O consumidor precisa estar **dentro** do Provider.
- **Quando usar:** dados que muitos componentes em níveis diferentes leem (tema, usuário logado, carrinho). Para um filho direto, prop basta.

---

## 8. `useEffect` e efeitos colaterais

- **Por que existe:** "a cada renderização do componente, todo o código de sua função é executado" (Eff, slide 9). Um `setInterval` ou `fetch` escrito solto no corpo do componente se repetiria a cada render.
- **Efeito colateral** é tudo o que sai do "calcular o JSX": buscar dados, timers, acessar o DOM, conectar a recursos externos (Eff, slides 12 a 14).

```jsx
useEffect(() => {
  // roda DEPOIS da renderização
  return () => { /* limpeza: antes da próxima execução e ao desmontar */ };
}, [dependencias]);
```

| Dependências | Quando roda |
|---|---|
| `[]` | uma única vez, após o primeiro render (Eff, slide 11) |
| `[busca]` | no primeiro render **e** sempre que `busca` mudar (Eff, slides 16 a 18) |
| nenhuma | após **todo** render **[geral]**. Cuidado com loop infinito se ele chamar um setter |

**Buscar dados ao montar** (padrão dos slides):
```jsx
useEffect(() => {
  (async () => {
    const resp = await fetch('https://dummyjson.com/products');
    const data = await resp.json();
    setProdutos(data.products);
  })();
}, []);
```
O callback do `useEffect` **não pode ser `async`**, por isso a função async vai dentro dele.

**Limpeza**, por exemplo num timer ou numa busca com debounce (Eff, slides 19 e 20):
```jsx
useEffect(() => {
  const id = setTimeout(() => buscar(termo), 900);
  return () => clearTimeout(id);    // cada tecla cancela a busca anterior
}, [termo]);
```

---

## 9. Juntando tudo: o padrão de tela com dados de API **[geral]**

É o que o Projeto 1 pede (uma SPA consumindo uma API externa) e o que responde às perguntas do slide de AJAX:

```jsx
function Produtos() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('https://dummyjson.com/products');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        setLista(data.products);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  if (carregando) return <p>Carregando...</p>;
  if (erro) return <p>Erro: {erro}</p>;
  if (lista.length === 0) return <p>Nenhum produto.</p>;
  return <ul>{lista.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```
Aparecem aqui: estado (seção 6), efeito (8), fetch e JSON (4), renderização condicional e listas (5).

---

## 10. Redux

- **Problema:** com muitos componentes, cada um com o próprio estado, comunicar o estado entre eles fica complexo, e as props atravessam a árvore inteira (Redux, slides 2 a 5).
- **Ideia:** tirar o estado compartilhado dos componentes e colocá-lo numa **Store** central. Os componentes leem dela e pedem mudanças a ela (Redux, slides 6 a 13).
- **Os três princípios** (Redux, slide 14):
  1. **Única fonte da verdade** (*single source of truth*): todo o estado global fica numa store só.
  2. **O estado é somente leitura**: os componentes não alteram o estado diretamente.
  3. **As alterações são feitas por funções puras**, os *reducers*: recebem `(estado, ação)` e devolvem um estado **novo**.
- **O fluxo [geral]:** o componente **despacha** uma *action* `{ type: 'ADICIONAR', payload: item }`. O **reducer** calcula o novo estado. A **store** guarda esse estado, e os componentes inscritos re-renderizam.
  ```js
  function carrinhoReducer(state = [], action) {
    switch (action.type) {
      case 'ADICIONAR': return [...state, action.payload];
      case 'REMOVER':   return state.filter(i => i.id !== action.payload);
      default:          return state;
    }
  }
  ```
- **Context × Redux:** o Context é nativo e resolve o prop drilling em casos simples. O Redux é uma biblioteca para estado global grande, com fluxo previsível e fácil de depurar.

---

## Pontos que mais confundem

1. Bubbling sobe do alvo até a raiz; captura desce da raiz até o alvo. Dois handlers aninhados geram dois alerts.
2. Script no `<head>` não acha o elemento: use `onload` ou ponha o script no fim do `<body>`.
3. `var` tem escopo de função; `let` e `const` têm escopo de bloco.
4. `map` e `filter` devolvem um array **novo**; `forEach` não devolve nada.
5. `call` e `apply` chamam a função na hora; `bind` só devolve outra função. Arrow function não tem `this` próprio.
6. XHR: `open(método, url, true)` → `onreadystatechange` → `readyState == 4 && status == 200` → `send()`.
7. `fetch` não falha com 404/500: confira `resp.ok`.
8. Componente é uma função que retorna JSX, com nome em maiúscula. `className`, `style={{}}`, uma raiz só.
9. `onClick={f}`, e não `onClick={f()}`.
10. `setX(x + 1)` três vezes dá 1; `setX(old => old + 1)` três vezes dá 3.
11. Estado é imutável: spread, `map` e `filter`, nunca `push`.
12. Props descem do pai e são somente leitura. Filho → pai é por callback. Irmãos sobem o estado para o pai comum.
13. `useEffect`: `[]` uma vez; `[dep]` quando `dep` muda; a limpeza é a função retornada; o callback não pode ser async.
14. Context: `createContext`, `Provider value`, `useContext`.
15. Redux: store única, estado só de leitura, reducers puros.
