# Programação de Banco de Dados: a matéria inteira, em ordem

Disciplina ES48H, prof. Eduardo Cotrin (UTFPR-CP), semestre 2026/2.

As citações seguem o formato `(Sigla, slide N)`:

| Sigla | Slides |
|---|---|
| **ER** | Revisão: Modelos de Dados e ER → Relacional |
| **PG** | Introdução ao PostgreSQL |
| **Restr** | Modelo Relacional: Restrições |
| **DDL** | Modelo Físico: SQL DDL |
| **Junções** | SQL DML: Junções |
| **Novos** | SQL DML: Novos recursos |
| **StarTrek** | BD Exemplo |
| **Diag** | Resolução da Atividade Diagnóstico |

> ⚠️ **O que o material cobre:** o Moodle só tem as semanas 1 a 3 (até SQL DML), mesmo no sync de 16/10. Pelo cronograma, as semanas 4 a 8 são Visões, Funções/PL/pgSQL e Triggers, e a prova (17/10) cobre até a semana 8. As partes 6 a 9 deste resumo **não vêm dos slides do professor**. Estão marcadas com **[fora do material]** e foram escritas com conhecimento geral de PostgreSQL. Quando os slides aparecerem no Moodle, compare com eles.

Os detalhes de DDL e de consultas (com as pegadinhas dos slides) estão no [guia da atividade prática](guia-atividade-pratica.md). Este arquivo conta a história completa. Os exercícios ficam em [exercicios.md](exercicios.md).

---

## Mapa da disciplina

```
1. Modelos de dados (conceitual → lógico → físico)
2. Transformação DER → Relacional
3. Restrições do modelo relacional
4. PostgreSQL + SQL DDL (CREATE / ALTER / DROP)
5. SQL DML: junções, agrupamento, subconsultas, operadores de conjunto
──────────── fim do material no Moodle ────────────
6. Visões (VIEW)                                   [fora do material]
7. Funções, procedimentos e PL/pgSQL                [fora do material]
8. Funções com retorno de conjunto                  [fora do material]
9. Triggers (gatilhos)                              [fora do material]
```

A ideia da disciplina é esta: você projeta o banco (1 a 3), cria o banco (4), consulta o banco (5) e depois **programa dentro do banco** (6 a 9), para automatizar tarefas e garantir regras de negócio. Os gatilhos fecham o ciclo, porque são o jeito de implementar as *restrições semânticas* que o SGBD não garante sozinho (Restr, slide 19).

---

## 1. Modelos de dados

São três níveis de abstração (ER, slide 2):

| Nível | O que representa | Exemplo |
|---|---|---|
| **Conceitual** | a realidade, com alto nível de abstração | DER, UML (ER, slide 4) |
| **Lógico** | como os dados serão processados | Modelo Relacional (também há o hierárquico e o de rede) (ER, slide 5) |
| **Físico** | como os dados são armazenados: formato, tipos | SQL (`CREATE TABLE`), NoSQL (ER, slide 6) |

O fluxo do projeto é **Projeto Conceitual → Projeto Lógico → Projeto Físico** (ER, slide 3).

A especificação de um banco relacional tem três partes: **tabelas**, **colunas** e **restrições de integridade** (chaves) (ER, slide 8).

**Notação textual do professor** (ER, slide 9):

```
Aluno(RA, Nome, Data_Nasc, Orientador, Curso)
    Orientador → Professor
```
A PK fica sublinhada. A linha recuada com `→` indica a chave estrangeira.

---

## 2. Transformação DER → Relacional

São dois passos: primeiro as **entidades**, depois os **relacionamentos** (ER, slide 10).

### 2.1 Entidades e atributos (ER, slides 11 e 12)

- Cada entidade vira uma tabela, cada atributo vira uma coluna e o identificador vira a PK.
- **Atributo composto** (Endereço = Rua, Número, Bairro): vira várias colunas.
- **Atributo multivalorado** (Telefones): vira uma **tabela nova** com FK para a original. Exemplo: `Telefone(Numero, RGPessoa)`.

### 2.2 Relacionamentos: depende da cardinalidade

| Cardinalidade | Regra | Slide |
|---|---|---|
| **1:N** | FK no lado **N** (a cardinalidade mínima não importa) | ER 13 |
| **1:1 (0,1):(0,1)** | FK em qualquer uma das tabelas | ER 14 |
| **1:1 demais casos** | **fusão** das tabelas (preferencial). Se uma delas tiver outros relacionamentos, pode compensar a adição de coluna | ER 15 |
| **N:N** | tabela nova, com as duas FKs formando a PK (a cardinalidade mínima não importa) | ER 16 |
| atributo do relacionamento | acompanha a FK ou a tabela nova | ER 17 |
| entidade fraca | PK = identificador próprio + FK da entidade forte | ER 22 |
| ternário | tabela nova com as 3 FKs | StarTrek |

**A cardinalidade mínima** não muda *onde* fica a FK, mas decide se ela é `NOT NULL`. Mínimo 1 significa que o relacionamento é obrigatório, então a FK fica `NOT NULL` (Diag, slide 5).

### 2.3 O exemplo completo (ER, slides 18 a 26)

Empresa com departamentos, projetos, empregados e dependentes:

```
Empregado(RG, Endereco, Nome, Salario, DepLotacao)     DepLotacao → Departamento   (1:N)
Dependentes(Nome, DataNasc, Parentesco, RGResp)        RGResp → Empregado           (fraca)
Departamento(NumId, Nome, RGGerente)                   RGGerente → Empregado        (1:1)
Projeto(NumId, Nome, Localizacao, NumIdDepto)          NumIdDepto → Departamento    (1:N)
Empregado_Projeto(NumIdProj, RGEmp)                    as duas FKs                  (N:N)
```

Note a **referência circular**: Empregado aponta para Departamento, e Departamento aponta para Empregado. Isso cai na hora de escrever o `CREATE TABLE` (seção 4.4).

---

## 3. Restrições do modelo relacional

**Integridade** é a precisão ou correção dos dados (Date). Um banco íntegro reflete a realidade e é consistente (Heuser) (Restr, slide 4). O SGBD garante a integridade com **restrições** e as testa a **cada modificação** dos dados (Restr, slides 5 e 6).

### 3.1 As três categorias (Restr, slide 7)

**1) Implícitas:** inerentes ao modelo, garantidas por definição (Restr, slide 8).
- Uma tabela não tem linhas repetidas, porque é um conjunto.
- As linhas não têm ordem específica.

**2) Explícitas:** declaradas no esquema (Restr, slides 9 a 11).

| Restrição | Significado | Em SQL |
|---|---|---|
| **de domínio** | cada valor é **atômico** e do tipo definido | o tipo da coluna (`INT`, `DATE`...) |
| **de chave** | duas linhas não podem ter a mesma PK (unicidade) | `PRIMARY KEY` |
| **de valores nulos** | o campo é obrigatório | `NOT NULL` |
| **de integridade de entidade** | nenhum campo da PK pode ser nulo | implícito em `PRIMARY KEY` |
| **de integridade referencial** | a FK tem de apontar para um registro **existente** | `FOREIGN KEY ... REFERENCES` |

**3) Semânticas:** regras de negócio que o SGBD **não** controla sozinho (Restr, slide 19). Exemplos do professor:
- "O gerente de um departamento deve ser funcionário do mesmo departamento."
- "O salário de um empregado não pode ultrapassar o do seu superior."

Elas são implementadas por **programas de aplicação**, por **triggers** ou por **assertions**.

### 3.2 Integridade referencial em detalhe (Restr, slides 13 a 18)

O SGBD verifica três operações:

1. **Inclusão** na tabela com a FK: o valor tem de existir como PK na tabela referenciada.
2. **Alteração** da FK: o novo valor tem de existir.
3. **Exclusão** na tabela referenciada: nenhuma FK pode estar apontando para o registro apagado.

No exemplo do professor, os alunos têm orientadores Paulo (15612) e Joana (74298). **Roberto** pode ser excluído porque ninguém aponta para ele. Paulo e Joana não podem (Restr, slide 14).

Para a exclusão há três tratamentos possíveis (Restr, slides 15 a 18):

| Conceito | SQL | O que acontece ao excluir Paulo |
|---|---|---|
| **Bloqueio** | `ON DELETE RESTRICT` (padrão) | a exclusão é rejeitada |
| **Propagação** | `ON DELETE CASCADE` | Francisco e Ana (orientandos de Paulo) também são apagados |
| **Substituição por nulos** | `ON DELETE SET NULL` | o `Orientador` de Francisco e de Ana vira `null` |

> **[fora do material]** No PostgreSQL, quando você não escreve nada, o padrão é `NO ACTION`. Na prática ele também rejeita a exclusão, como o `RESTRICT`. A diferença é só o momento da verificação, que importa com restrições adiadas (`DEFERRABLE`).

---

## 4. PostgreSQL e SQL DDL

### 4.1 O SGBD (PG, slides 2 a 11)

- É objeto-relacional e open source. Nasceu em Berkeley, em 1986, a partir do POSTGRES. O professor usa a versão 15.6.
- Há duas ferramentas cliente com a mesma finalidade: o **pgAdmin** (gráfico; use o botão direito no BD e escolha *Query Tool*) e o **psql** (linha de comando).
- Comandos do psql (PG, slide 7). Todo comando SQL termina com `;`.

| Comando | Faz |
|---|---|
| `\l` | lista os bancos |
| `\c nome_bd` | conecta a um banco |
| `\dt` | lista as tabelas do banco atual |
| `\d+ tabela` | mostra o esquema de uma tabela |
| `\i 'C:/caminho/arquivo.sql'` | executa um script |
| `\?` | ajuda |
| `\q` | sai |

- **Banco de dados** é a estrutura básica de armazenamento: `CREATE DATABASE x;` e `DROP DATABASE x;`. Na instalação já existem `postgres`, `template0` e `template1`, de uso interno (PG, slide 10).
- **Esquema** fica *dentro* de um banco e agrupa objetos de uma mesma aplicação. O padrão é o `public` (PG, slide 11).
  ```sql
  CREATE SCHEMA empresa;
  SET SEARCH_PATH TO empresa;            -- passa a usar esse esquema
  CREATE TABLE empresa.funcionario (...); -- ou qualifica o nome
  ```

### 4.2 CREATE TABLE, tipos e restrições de coluna

```sql
CREATE TABLE FUNCIONARIO (
   Nome    VARCHAR(50) NOT NULL,
   CPF     CHAR(11) PRIMARY KEY,
   Salario DECIMAL(10,2) DEFAULT 850 CHECK (Salario > 650 AND Salario < 50000),
   Idade   INT CHECK (Idade >= 18 AND Idade <= 120),
   Casado  BOOLEAN DEFAULT FALSE
);
```
Tipos, `NOT NULL`, `DEFAULT` e `CHECK`: veja o guia, seções 2.2 e 2.3 (DDL, slides 6 a 13). Lembre: o `CHECK` **não barra NULL**.

### 4.3 PK composta e FK (restrições de tabela)

```sql
PRIMARY KEY (RA, Campus)                               -- PK composta: só como restrição de tabela
CONSTRAINT dep_fk FOREIGN KEY (CPF_ger) REFERENCES FUNCIONARIO(CPF)
    ON DELETE RESTRICT ON UPDATE CASCADE
```
A FK precisa ter o **mesmo tipo** da PK referenciada. Sem `CONSTRAINT nome`, o PostgreSQL gera nomes como `tabela_pkey` e `tabela_coluna_fkey` (DDL, slides 14 a 21).

### 4.4 Ordem de criação e referência circular (DDL, slide 31; Diag, slides 5 a 9)

A dica do professor: **crie todas as tabelas sem as chaves e depois inclua as restrições com `ALTER TABLE`**. Assim a ordem de criação deixa de importar, e a referência circular (Empregado ↔ Departamento) se resolve sozinha. O script do StarTrek é feito assim.

### 4.5 ALTER TABLE e DROP TABLE (DDL, slides 22 a 33)

```sql
ALTER TABLE t ADD COLUMN c VARCHAR(50);
ALTER TABLE t DROP COLUMN c;
ALTER TABLE t RENAME c TO c2;
ALTER TABLE t ALTER COLUMN c SET DEFAULT 18;    -- ou DROP DEFAULT
ALTER TABLE t ADD PRIMARY KEY (c);
ALTER TABLE t ADD CONSTRAINT nome FOREIGN KEY (c) REFERENCES outra(pk);
ALTER TABLE t DROP CONSTRAINT nome;             -- para remover, precisa saber o nome
DROP TABLE t;                                   -- falha se alguém depende dela
DROP TABLE t CASCADE;                           -- remove as constraints dependentes (não as tabelas)
```

### 4.6 O banco de exemplo: StarTrek (StarTrek; scripts da Semana 2)

```
Peca(PeNro, PeNome, PePreco, PeCor)
Fornecedor(FNro, FNome, FCidade, FCateg)          -- categoria 'A' é a melhor
Projeto(PNro, PNome, PDuracao, PCusto)
Fornece_Para(PeNro, FNro, PNro, Quant)            -- ternário: PK = as 3 FKs
```

| Fornece_Para | PeNro | FNro | PNro | Quant |
|---|---|---|---|---|
| | PE1 Cinto | F5 Equipament | P4 Sea | 5 |
| | PE2 Volante | F2 C&M | P2 Pegasus | 1 |
| | PE3 Lanterna | F3 Kirurgic | P4 Sea | 2 |
| | PE4 Limpador | F4 Piloto's | P5 Paraíso | 3 |
| | PE5 Painel | F1 Plastec | P1 Detroit | 1 |
| | PE2 Volante | F2 C&M | P3 Alfa | 1 |
| | PE4 Limpador | F3 Kirurgic | P5 Paraíso | 2 |

Preços: Cinto 22, Volante 18, Lanterna 14, Limpador 9, Painel 43. Cidades: Plastec e Kirurgic em Campinas, C&M em São Paulo, Piloto's em Piracicaba, Equipament em São Carlos.

> ⚠️ **Acentos:** o arquivo de inserts está em Latin-1 (`São Paulo` e `Paraíso` aparecem quebrados no editor). No psql, rode `SET client_encoding TO 'LATIN1';` antes do `\i`. No pgAdmin, se os acentos vierem errados, salve o arquivo como UTF-8 antes de abrir. **[fora do material]**

---

## 5. SQL DML: consultas

A DML tem `INSERT`, `UPDATE`, `DELETE` e `SELECT` (Junções, slide 2). O resultado de um SELECT **é sempre uma tabela**, mesmo que vazia ou com uma célula só (Junções, slide 4).

### 5.1 Ordem lógica de execução (Junções, slide 5)

```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
```
Isso explica três regras:
- Não dá para usar agregação no WHERE, porque os grupos ainda não existem.
- No HAVING do PostgreSQL não dá para usar o apelido do SELECT.
- No ORDER BY dá para usar o apelido.

### 5.2 Junções (Junções, slides 7 a 31)

- Várias tabelas no FROM, sem condição, geram o **produto cartesiano** (CROSS JOIN): todas as combinações (Junções, slide 7). `Fornece_Para, Peca` dá 7 × 5 = 35 linhas.
- A **junção** filtra o produto e mantém só as linhas em que a FK bate com a PK (Junções, slide 12).

São formas equivalentes, com o mesmo desempenho (Junções, slides 18 a 20):
```sql
FROM Fornece_Para, Peca WHERE Fornece_Para.PeNro = Peca.PeNro   -- no WHERE
FROM Fornece_Para JOIN Peca ON Fornece_Para.PeNro = Peca.PeNro  -- equi join
FROM Fornece_Para JOIN Peca USING (PeNro)                       -- mesmo nome de coluna
FROM Fornece_Para INNER JOIN Peca USING (PeNro)                 -- INNER = JOIN
FROM Fornece_Para NATURAL JOIN Peca                             -- todas as colunas de mesmo nome
```
O professor avisa que o `NATURAL JOIN` "provoca erro em caso de alteração da estrutura do BD" (Junções, slide 20).

**OUTER JOIN** mantém quem não tem par e preenche o outro lado com NULL (Junções, slides 23 a 29). No exemplo dos slides, Funcionario `JOIN` Departamento `ON (RG = RGGerente)`:

| Tipo | O que aparece |
|---|---|
| `INNER` | Computação, Automação e Elétrica com seus gerentes |
| `RIGHT OUTER` | os 3 acima + **Mecânica com NULL** (departamento sem gerente) |
| `LEFT OUTER` | os 3 acima + **Paulo e Maria com NULL** (funcionários que não gerenciam) |
| `FULL OUTER` | todos |

**Receita:**
1. Liste as tabelas que têm o que você mostra e o que você filtra.
2. Inclua as tabelas "do meio" que ligam umas às outras.
3. Para N tabelas, escreva N−1 condições de junção.
4. Prefixe as colunas ambíguas (`Tabela.Coluna`).

### 5.3 Agregação, GROUP BY, HAVING e ORDER BY (Novos, slides 4 a 18)

- As funções são `SUM`, `AVG`, `COUNT(col)`, `COUNT(*)`, `MIN` e `MAX`. As três últimas também funcionam com texto (Novos, slide 7).
- Com GROUP BY, **cada coluna do SELECT tem de ser agregação ou estar no GROUP BY** (Novos, slide 5).
- `SELECT FCidade, count(*) FROM Fornecedor;` **não funciona**: o FCidade dá várias linhas e o count dá uma só (Novos, slide 12).
- "Peça mais cara" não sai com `WHERE PePreco = max(PePreco)`. Use uma subconsulta (Novos, slide 9).
- `HAVING` filtra **grupos**, depois do GROUP BY (Novos, slide 17). O `WHERE` filtra **linhas**, antes.
- A agregação é sempre aplicada **depois** da junção (Novos, slide 14).
- `ORDER BY` vai no fim. ASC é o padrão, e DESC inverte (Novos, slide 15).

```sql
-- projetos que usaram 5 ou mais peças (Novos, slide 18)
SELECT PNro, PNome, SUM(Quant) AS TotalPecas
FROM Fornece_Para NATURAL JOIN Projeto
GROUP BY PNro, PNome
HAVING SUM(Quant) >= 5;                -- Paraíso 5, Sea 7
```

### 5.4 Subconsultas (Novos, slides 19 a 30)

| Onde e como | Exemplo | Slide |
|---|---|---|
| no FROM (**precisa de apelido**) | `FROM Peca, (SELECT ...) PecasP4` | Novos 21 |
| `IN` (pertence ao conjunto) | `WHERE PeNro IN (SELECT PeNro FROM Fornece_Para WHERE PNro = 'P5')` | Novos 23 |
| aninhada em vários níveis | peças de projetos com duração > 3 | Novos 24 |
| `EXISTS` (o resultado não é vazio) | peças já fornecidas | Novos 26 |
| `NOT EXISTS` / `NOT IN` | fornecedores que nunca forneceram | Novos 27 e 28 |
| `= ANY` | mesma categoria de *algum* fornecedor de Campinas | Novos 29 |
| `> ALL` | categoria pior que a de *todos* os de Campinas | Novos 30 |

A subconsulta com `EXISTS` costuma ser **correlacionada**: ela usa uma coluna da consulta de fora (`WHERE Fornece_Para.PeNro = Peca.PeNro`) e é avaliada para cada linha de fora.

### 5.5 Conjunto e multiconjunto (Novos, slides 31 a 41)

- O SELECT trabalha com **multiconjunto**: mantém as repetições. `SELECT PeCor FROM Peca WHERE PePreco > 15` dá Azul, Vermelho, Vermelho (Novos, slide 35).
- `DISTINCT` força conjunto (Novos, slide 37).
- `UNION`, `INTERSECT` e `EXCEPT` trabalham com **conjunto** e eliminam repetições. As duas consultas precisam ter colunas do **mesmo tipo** (Novos, slide 31).
- `UNION ALL` força multiconjunto (Novos, slide 40). Exemplo: peças com preço < 10 *ou* fornecidas ao P5. Com `UNION` sai `PE4` uma vez. Com `UNION ALL` sai `PE4` três vezes (Novos, slides 36 e 41).
- No `EXCEPT` a ordem importa: é o que está na primeira consulta e não está na segunda (Novos, slide 34).

---

## 6. Visões (VIEW) **[fora do material]**

Uma visão é uma **consulta salva com nome**. Ela não guarda dados: cada vez que você a consulta, o SELECT dela é executado. Serve para:
- simplificar consultas que se repetem (esconder junções);
- dar segurança: o usuário vê só certas colunas ou linhas;
- isolar a aplicação de mudanças nas tabelas.

```sql
CREATE VIEW vw_fornecimentos AS
SELECT FNome, PeNome, PNome, Quant
FROM Fornece_Para JOIN Fornecedor USING (FNro)
                  JOIN Peca       USING (PeNro)
                  JOIN Projeto    USING (PNro);

SELECT * FROM vw_fornecimentos WHERE PNome = 'Sea';   -- usa como tabela

CREATE OR REPLACE VIEW vw_fornecimentos AS ...;  -- redefine (só pode acrescentar colunas no fim)
DROP VIEW vw_fornecimentos;
```

**Visão atualizável.** No PostgreSQL, dá para fazer INSERT, UPDATE e DELETE *através* da visão quando ela é simples:
- tem **uma só tabela** no FROM;
- não tem `GROUP BY`, `HAVING`, agregação, `DISTINCT`, `UNION` nem `LIMIT`.

```sql
CREATE VIEW vw_pecas_vermelhas AS
SELECT PeNro, PeNome, PePreco FROM Peca WHERE PeCor = 'Vermelho'
WITH CHECK OPTION;                  -- rejeita mudanças que tirariam a linha da visão

UPDATE vw_pecas_vermelhas SET PePreco = 20 WHERE PeNro = 'PE2';   -- altera a tabela Peca
```
Uma visão com junção ou GROUP BY não é atualizável. Para isso seria preciso um trigger `INSTEAD OF`.

**Visão materializada** (`CREATE MATERIALIZED VIEW`): guarda o resultado em disco. É mais rápida para ler, mas fica desatualizada até você rodar `REFRESH MATERIALIZED VIEW nome;`.

---

## 7. Funções, procedimentos e PL/pgSQL **[fora do material]**

### 7.1 Por que programar no banco

A lógica roda perto dos dados, sem ida e volta pela rede. A regra fica num lugar só, para qualquer aplicação. E é a base dos triggers.

### 7.2 Função em SQL puro

```sql
CREATE OR REPLACE FUNCTION qtd_fornecimentos(p_fnro CHAR(5))
RETURNS BIGINT AS $$
    SELECT COUNT(*) FROM Fornece_Para WHERE FNro = p_fnro;
$$ LANGUAGE sql;

SELECT qtd_fornecimentos('F3');    -- 2
```
- O corpo fica entre `$$ ... $$`, que são aspas que dispensam escapar as aspas simples dentro.
- `LANGUAGE sql`: o corpo é só SQL, e o resultado do último comando é o retorno.

### 7.3 Estrutura de um bloco PL/pgSQL

```sql
CREATE OR REPLACE FUNCTION nome(param1 TIPO, param2 TIPO)
RETURNS TIPO_RETORNO AS $$
DECLARE
    variavel TIPO [:= valor_inicial];
BEGIN
    -- comandos
    RETURN valor;
END;
$$ LANGUAGE plpgsql;
```

| Recurso | Sintaxe | Observação |
|---|---|---|
| atribuição | `v := 10;` | |
| tipo de uma coluna | `v Peca.PePreco%TYPE;` | acompanha o tipo da coluna, se ele mudar |
| linha inteira | `r Peca%ROWTYPE;` então `r.PeNome` | |
| registro genérico | `r RECORD;` | toma a forma do SELECT |
| guardar resultado | `SELECT PePreco INTO v FROM Peca WHERE PeNro = 'PE1';` | se não achar, `v` fica NULL. Com `INTO STRICT`, dá erro se vier 0 ou mais de 1 linha |
| achou? | `IF NOT FOUND THEN ...` | `FOUND` vale depois de SELECT INTO, UPDATE e DELETE |
| quantas linhas | `GET DIAGNOSTICS n = ROW_COUNT;` | depois de UPDATE e DELETE |
| condição | `IF ... THEN ... ELSIF ... THEN ... ELSE ... END IF;` | **ELSIF**, não ELSE IF |
| caso | `CASE WHEN ... THEN ... ELSE ... END CASE;` | |
| laço | `LOOP ... EXIT WHEN x; END LOOP;` | |
| enquanto | `WHILE cond LOOP ... END LOOP;` | |
| contagem | `FOR i IN 1..10 LOOP ... END LOOP;` | `i` é declarado automaticamente |
| percorrer consulta | `FOR r IN SELECT ... LOOP ... END LOOP;` | ⚠️ aqui `r` **precisa** estar no DECLARE (`r RECORD;` ou `%ROWTYPE`). Só o `i` do laço numérico é automático |
| mensagem | `RAISE NOTICE 'Valor: %', v;` | cada `%` é trocado por um argumento |
| erro | `RAISE EXCEPTION 'Fornecedor % inválido', p;` | **aborta** e desfaz o comando |

Exemplo completo:
```sql
CREATE OR REPLACE FUNCTION classifica_peca(p_penro CHAR(5))
RETURNS VARCHAR AS $$
DECLARE
    v_preco Peca.PePreco%TYPE;
BEGIN
    SELECT PePreco INTO v_preco FROM Peca WHERE PeNro = p_penro;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Peça % não existe', p_penro;
    END IF;

    IF v_preco < 15 THEN
        RETURN 'barata';
    ELSIF v_preco < 30 THEN
        RETURN 'média';
    ELSE
        RETURN 'cara';
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT PeNome, classifica_peca(PeNro) FROM Peca;
-- Cinto média, Volante média, Lanterna barata, Limpador barata, Painel cara
```

Outros detalhes:
- **Parâmetros OUT:** `CREATE FUNCTION f(IN a INT, OUT dobro INT, OUT triplo INT) AS $$ BEGIN dobro := a*2; triplo := a*3; END; $$ ...`. Não precisa de RETURNS, e o retorno é uma linha com as duas colunas.
- **Sobrecarga:** pode haver duas funções com o mesmo nome e parâmetros diferentes. Por isso o `DROP FUNCTION` pede os tipos: `DROP FUNCTION classifica_peca(CHAR);`.
- ⚠️ **Conflito de nomes:** se um parâmetro ou variável tem o mesmo nome de uma coluna, o PostgreSQL acusa ambiguidade. Use prefixos (`p_`, `v_`).

### 7.4 Procedimento (PROCEDURE)

| | FUNCTION | PROCEDURE |
|---|---|---|
| retorna valor | sim (`RETURNS`) | não |
| como chamar | dentro de um SELECT: `SELECT f(...)` | `CALL p(...)` |
| controle de transação | não pode `COMMIT` | pode `COMMIT` e `ROLLBACK` dentro |
| uso típico | calcular ou consultar | executar uma ação (atualizar em lote) |

```sql
CREATE OR REPLACE PROCEDURE reajusta_cor(p_cor VARCHAR, p_perc FLOAT)
AS $$
DECLARE n INT;
BEGIN
    UPDATE Peca SET PePreco = PePreco * (1 + p_perc / 100) WHERE PeCor = p_cor;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '% peça(s) reajustada(s)', n;
END;
$$ LANGUAGE plpgsql;

CALL reajusta_cor('Azul', 10);     -- NOTICE: 1 peça(s) reajustada(s)
```
Antes do PostgreSQL 11 não existia PROCEDURE. Usava-se uma função `RETURNS void`, que ainda aparece bastante.

---

## 8. Funções com retorno de conjunto **[fora do material]**

São funções que devolvem **várias linhas**, como uma tabela. Elas são usadas **no FROM**: `SELECT * FROM f(...)`.

**Forma 1: `RETURNS SETOF tabela`.** Cada linha tem o formato de uma tabela existente.
```sql
CREATE OR REPLACE FUNCTION fornecedores_da_categoria(p_cat CHAR(1))
RETURNS SETOF Fornecedor AS $$
BEGIN
    RETURN QUERY SELECT * FROM Fornecedor WHERE FCateg = p_cat;
END;
$$ LANGUAGE plpgsql;

SELECT FNome FROM fornecedores_da_categoria('A');   -- Kirurgic, Piloto's
```

**Forma 2: `RETURNS TABLE (...)`.** Você define as colunas de saída.
```sql
CREATE OR REPLACE FUNCTION total_por_projeto()
RETURNS TABLE (projeto CHAR(30), total BIGINT) AS $$
BEGIN
    RETURN QUERY
        SELECT PNome, SUM(Quant)
        FROM Projeto JOIN Fornece_Para USING (PNro)
        GROUP BY PNro, PNome;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM total_por_projeto() ORDER BY total DESC;
```
⚠️ Os tipos das colunas do `RETURN QUERY` têm de bater **exatamente** com os do `RETURNS TABLE`. `SUM` de INTEGER dá **BIGINT**. Se você declarar `INT`, sai o erro "structure of query does not match function result type".

**`RETURN NEXT`: monta o resultado linha a linha.** Serve quando há lógica no meio.
```sql
CREATE OR REPLACE FUNCTION pecas_com_faixa()
RETURNS TABLE (nome CHAR(30), faixa VARCHAR) AS $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT PeNome, PePreco FROM Peca LOOP
        nome := r.PeNome;
        IF r.PePreco < 15 THEN faixa := 'barata'; ELSE faixa := 'normal'; END IF;
        RETURN NEXT;           -- empilha a linha atual (nome, faixa)
    END LOOP;
    RETURN;                    -- termina e devolve tudo
END;
$$ LANGUAGE plpgsql;
```
- `RETURN QUERY` e `RETURN NEXT` **acumulam** linhas. A função só termina no `RETURN;` final, ou no `END`.
- Com `SETOF tabela`, use `RETURN NEXT r;` passando a variável `%ROWTYPE`.

---

## 9. Triggers (gatilhos) **[fora do material]**

Um trigger é uma função executada **automaticamente** quando acontece um INSERT, UPDATE ou DELETE numa tabela. Serve para:
- implementar **restrições semânticas** (regras de negócio), como diz o professor em Restr, slide 19;
- auditoria (log de alterações);
- campos calculados e sincronização entre tabelas.

### 9.1 São duas peças

```sql
-- 1) a função de trigger: sem parâmetros, RETURNS TRIGGER
CREATE OR REPLACE FUNCTION fn_valida_quant() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Quant <= 0 THEN
        RAISE EXCEPTION 'Quantidade deve ser positiva (recebido %)', NEW.Quant;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) o trigger: liga a função à tabela e ao evento
CREATE TRIGGER tg_valida_quant
BEFORE INSERT OR UPDATE ON Fornece_Para
FOR EACH ROW
EXECUTE FUNCTION fn_valida_quant();        -- em versões antigas: EXECUTE PROCEDURE

DROP TRIGGER tg_valida_quant ON Fornece_Para;
```

### 9.2 As decisões ao criar um trigger

| Decisão | Opções | Como escolher |
|---|---|---|
| **momento** | `BEFORE`, `AFTER` (`INSTEAD OF` só em visões) | **BEFORE** para validar ou mudar os dados que vão entrar. **AFTER** para reagir ao que já foi gravado (log, atualizar outra tabela) |
| **evento** | `INSERT`, `UPDATE`, `UPDATE OF coluna`, `DELETE` (combináveis com `OR`) | |
| **granularidade** | `FOR EACH ROW`, `FOR EACH STATEMENT` | ROW roda uma vez **por linha** afetada. STATEMENT roda uma vez **por comando**, mesmo que afete 0 linhas, e não tem NEW nem OLD |
| **condição** | `WHEN (OLD.PePreco IS DISTINCT FROM NEW.PePreco)` | evita chamar a função à toa |

### 9.3 As variáveis especiais

| Variável | Conteúdo | Existe em |
|---|---|---|
| `NEW` | a linha **nova** | INSERT, UPDATE (NULL no DELETE) |
| `OLD` | a linha **antiga** | UPDATE, DELETE (NULL no INSERT) |
| `TG_OP` | `'INSERT'`, `'UPDATE'` ou `'DELETE'` | todos |
| `TG_TABLE_NAME` | o nome da tabela | todos |
| `TG_WHEN` | `'BEFORE'` ou `'AFTER'` | todos |

### 9.4 ⭐ O valor de retorno (cai muito)

| Trigger | Retornar `NEW` | Retornar `OLD` | Retornar `NULL` |
|---|---|---|---|
| **BEFORE ROW**, INSERT ou UPDATE | grava a linha (com as mudanças que você fez em NEW) | — | **cancela a operação para aquela linha, em silêncio, sem erro** |
| **BEFORE ROW**, DELETE | — | segue com a exclusão | **cancela a exclusão** daquela linha |
| **AFTER** (ou STATEMENT) | o retorno é **ignorado** | ignorado | ignorado (costuma-se escrever `RETURN NULL;`) |

- Para **impedir com mensagem**, use `RAISE EXCEPTION`, que desfaz o comando inteiro.
- Para **impedir em silêncio**, use `RETURN NULL` num BEFORE ROW.
- Para **corrigir o dado antes de gravar**, altere NEW num BEFORE: `NEW.PeNome := UPPER(NEW.PeNome); RETURN NEW;`.
- ⚠️ Em AFTER, alterar NEW **não tem efeito**: a linha já foi gravada.

### 9.5 Exemplos típicos

**Auditoria (AFTER):**
```sql
CREATE TABLE Log_Preco (
    PeNro CHAR(5), PrecoAntigo FLOAT, PrecoNovo FLOAT,
    Quando TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_log_preco() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Log_Preco (PeNro, PrecoAntigo, PrecoNovo)
    VALUES (OLD.PeNro, OLD.PePreco, NEW.PePreco);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_log_preco
AFTER UPDATE OF PePreco ON Peca
FOR EACH ROW
WHEN (OLD.PePreco IS DISTINCT FROM NEW.PePreco)
EXECUTE FUNCTION fn_log_preco();
```

**Regra semântica do professor, "o salário de um empregado não pode ultrapassar o do seu superior" (BEFORE):**
```sql
-- supondo Empregado(RG, Nome, Salario, RGSupervisor)
CREATE OR REPLACE FUNCTION fn_salario_supervisor() RETURNS TRIGGER AS $$
DECLARE v_sal_sup Empregado.Salario%TYPE;
BEGIN
    IF NEW.RGSupervisor IS NOT NULL THEN
        SELECT Salario INTO v_sal_sup FROM Empregado WHERE RG = NEW.RGSupervisor;
        IF NEW.Salario > v_sal_sup THEN
            RAISE EXCEPTION 'Salário (%) maior que o do supervisor (%)', NEW.Salario, v_sal_sup;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_salario_supervisor
BEFORE INSERT OR UPDATE ON Empregado
FOR EACH ROW EXECUTE FUNCTION fn_salario_supervisor();
```
(Para a regra ficar completa, seria preciso também um trigger para quando o *supervisor* tem o salário reduzido.)

**Uma função para vários eventos, com TG_OP:**
```sql
CREATE OR REPLACE FUNCTION fn_estoque() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Novo fornecimento de %', NEW.PeNro;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE NOTICE 'Fornecimento de % removido', OLD.PeNro;
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 9.6 Cuidados

- Um trigger que altera a **própria tabela** num AFTER pode disparar a si mesmo e entrar em **recursão**.
- A ordem entre vários triggers do mesmo momento e evento é a **alfabética** do nome.
- O trigger faz parte da transação: se ele dá `RAISE EXCEPTION`, o comando original também é desfeito.

---

## Pontos que mais confundem (resumo para a prova)

1. **1:N → FK no lado N.** **N:N → tabela nova.** **1:1 → fusão**, salvo se houver outros relacionamentos. A cardinalidade mínima decide o `NOT NULL`, não o lugar da FK.
2. **Restrição semântica** = regra de negócio = trigger ou aplicação. **Integridade de entidade** = a PK não pode ser nula. **Referencial** = a FK aponta para algo existente.
3. **Bloqueio / Propagação / Substituição por nulos** = `RESTRICT` / `CASCADE` / `SET NULL`.
4. PK composta só como restrição de tabela: `PRIMARY KEY (a, b)`.
5. Crie as tabelas sem chaves e use `ALTER TABLE` para incluí-las depois. É o que resolve a referência circular.
6. Sem condição de junção sai o produto cartesiano. Para N tabelas, N−1 condições.
7. No GROUP BY, toda coluna não agregada do SELECT vai no GROUP BY. Agregação nunca vai no WHERE.
8. `COUNT(*)` conta linhas. `COUNT(coluna)` ignora NULL, o que é essencial no LEFT JOIN.
9. SELECT mantém repetições. UNION, INTERSECT e EXCEPT eliminam. `UNION ALL` mantém.
10. Trigger BEFORE ROW com `RETURN NULL` cancela em silêncio. `RAISE EXCEPTION` cancela com erro. Em AFTER o retorno é ignorado.
11. FUNCTION se chama com `SELECT`. PROCEDURE se chama com `CALL`. Função de conjunto se chama com `SELECT * FROM f()`.
