# Programação de Banco de Dados: guia para a atividade prática

Baseado no material do Moodle (semanas 1 a 3, prof. Eduardo Cotrin). Cada parte cita o slide de onde veio, por exemplo `(DDL, slide 31)`. O que não está nos slides aparece marcado como **[fora do material]**.

Siglas dos slides:
- **ER**: Revisão, Modelos de Dados, ER → Relacional.
- **Restr**: Modelo Relacional, Restrições.
- **DDL**: Modelo Físico, SQL DDL.
- **Junções**: SQL DML, Junções.
- **Novos**: SQL DML, Novos recursos.
- **Diag**: Resolução da Atividade Diagnóstico.

> **Atenção ao calendário:** pelo cronograma, a **prova presencial é sábado, 17/10**. O enunciado do Trabalho Prático sai na semana de 02/11, e a entrega é em 23/11. O Moodle só mostra as semanas 1 a 3. Visões, Funções/PL/pgSQL e Triggers (semanas 4 a 8) estão no fim deste guia, como conhecimento geral.

---

## 0. O formato de questão que o professor usa

O exercício de revisão (e a resolução dele) mostra o padrão:

1. Recebe um **DER**.
2. Passa para o **modelo relacional** (notação textual).
3. Escreve o **`CREATE TABLE`** de algumas tabelas.
4. Escreve **consultas com junção** ("nome do gerente do departamento X", "dependentes dos empregados do departamento X").

Treine exatamente essa sequência. As seções seguem a mesma ordem.

---

## 1. DER → Modelo Relacional

### 1.1 Notação do professor (ER, slide 9)

```
Aluno(RA, Nome, Data_Nasc, Orientador)
     Orientador → Professor
```
- A **chave primária** é o(s) campo(s) **sublinhado(s)**. Em texto puro, escreva sublinhado ou marque `(PK)`.
- `Coluna → Tabela`, numa linha abaixo e recuada, indica uma **chave estrangeira**.
- PK composta: sublinhe todos os campos dela.

### 1.2 Como ler a cardinalidade nesse DER

O número escrito **junto de uma entidade** diz quantas instâncias **dela** se ligam a **uma** instância da outra.

Exemplo do exercício, na relação Lotação:
- `(0,n)` junto de Empregado: um departamento tem de 0 a n empregados.
- `(1,1)` junto de Departamento: cada empregado está em **exatamente 1** departamento.

O mínimo **1** obriga a ter. Por isso `DepLotacao INT NOT NULL`, que o professor comenta como "conforme cardinalidade mínima" (Diag, slide 5). Com mínimo **0**, a FK pode ser nula.

### 1.3 As regras de transformação

| Situação no DER | Vira | Onde fica a FK | Slide |
|---|---|---|---|
| **Entidade** | uma tabela; atributos viram colunas; identificador vira PK | — | ER 11 |
| **Atributo composto** (Endereço: Rua, Nº, Bairro) | colunas separadas (`Rua`, `Numero`, `Bairro`) | — | ER 12 |
| **Atributo multivalorado** (Telefones) | **nova tabela** `Telefone(Numero, RGPessoa)`, com PK = valor + FK | na tabela nova | ER 12 |
| **1:N** | adiciona a coluna FK | **sempre no lado N** (a cardinalidade mínima não muda isso) | ER 13 |
| **1:1 com (0,1) dos dois lados** | adiciona a coluna FK | em **qualquer** uma das tabelas | ER 14 |
| **1:1 nos demais casos** | **fusão** das duas tabelas (preferencial) ou adição de coluna se uma delas tiver outros relacionamentos | — | ER 15 |
| **N:N** | **nova tabela** com as duas FKs, que juntas formam a PK | na tabela nova | ER 16 |
| **Atributo do relacionamento** | vai junto da FK (ou da tabela nova); não entra na PK | — | ER 17 |
| **Entidade fraca** (linha grossa) | tabela com PK = identificador parcial + FK da entidade forte | na fraca | ER 22 |
| **Ternário** (StarTrek: Peça × Fornecedor × Projeto) | nova tabela com as 3 FKs como PK | na tabela nova | StarTrek 4 |

**[fora do material] Auto-relacionamento:**
- 1:N: FK na própria tabela, por exemplo `Empregado(RG, ..., RGSupervisor)` com `RGSupervisor → Empregado`.
- N:N: uma tabela nova com duas FKs para a mesma tabela.

### 1.4 Exemplo completo do professor (ER, slides 18 a 26)

```
Empregado(RG, Endereco, Nome, Salario, DepLotacao)      PK: RG
     DepLotacao → Departamento                          (Lotação, 1:N → FK no lado N)
Dependentes(Nome, DataNasc, Parentesco, RGResp)         PK: Nome + RGResp (entidade fraca)
     RGResp → Empregado
Departamento(NumId, Nome, RGGerente)                    PK: NumId
     RGGerente → Empregado                              (Gerência, 1:1 → adição de coluna,
                                                         sem fusão porque há outros relacionamentos)
Projeto(NumId, Nome, Localizacao, NumIdDepto)           PK: NumId
     NumIdDepto → Departamento                          (Controle, 1:N)
Empregado_Projeto(NumIdProj, RGEmp)                     PK: NumIdProj + RGEmp (N:N)
     NumIdProj → Projeto
     RGEmp → Empregado
```

> ⚠️ **Referência circular:** `Empregado → Departamento` (lotação) e `Departamento → Empregado` (gerente). Isso afeta a ordem do `CREATE TABLE` (seção 2.5).

---

## 2. SQL DDL: criando as tabelas

### 2.1 Esqueleto (DDL, slide 6)

```sql
CREATE TABLE Nome_Tabela (
    coluna1 TIPO [restrições de coluna],
    coluna2 TIPO [restrições de coluna],
    [restrições de tabela]
);
```

### 2.2 Tipos que aparecem no material (DDL, slides 8 a 10)

| Para | Use | Observação |
|---|---|---|
| inteiro | `INT` / `INTEGER`, `SMALLINT` | |
| real | `FLOAT` / `REAL`, `DECIMAL(10,2)` / `NUMERIC(i,j)` | ⚠️ `DOUBLE` **não existe** no PostgreSQL (`DOUBLE PRECISION` existe) |
| texto | `CHAR(n)` (tamanho fixo), `VARCHAR(n)` (até n), `TEXT` | sempre entre **aspas simples** |
| data/hora | `DATE` `'2024-08-14'`, `TIME` `'19:50:25'`, `TIMESTAMP` | formato `'YYYY-MM-DD'` |
| lógico | `BOOLEAN` (`TRUE`/`FALSE`) | |

⚠️ Os nomes de tabela e coluna não diferenciam maiúsculas e minúsculas. O PostgreSQL deixa tudo em minúsculas. **O conteúdo das strings diferencia:** `'Computação'` ≠ `'computação'` (DDL, slide 9).

### 2.3 Restrições de coluna (DDL, slides 11 a 13)

```sql
CREATE TABLE FUNCIONARIO (
   Nome    VARCHAR(50) NOT NULL,
   CPF     CHAR(11) PRIMARY KEY,
   Salario DECIMAL(10,2) DEFAULT 850
           CHECK (Salario > 650 AND Salario < 50000),
   Idade   INT CHECK (Idade >= 18 AND Idade <= 120),
   Casado  BOOLEAN DEFAULT FALSE
);
```
- `PRIMARY KEY` já implica `NOT NULL`. Não precisa repetir.
- ⚠️ `CHECK` **não barra NULL**. `Idade` pode ficar nula. Para obrigar, junte `NOT NULL` (DDL, slide 12).
- ⚠️ `DEFAULT` só é usado quando a coluna **é omitida** no INSERT.
- ⚠️ Não há vírgula entre `DEFAULT 850` e `CHECK (...)`, porque os dois são restrições da mesma coluna.
- **[fora do material]** `UNIQUE` impede valores repetidos e aceita NULL.

### 2.4 Restrições de tabela: PK e FK (DDL, slides 14 a 21)

```sql
CREATE TABLE ALUNO (
   RA     CHAR(7),
   Campus VARCHAR(30),
   Nome   VARCHAR(50) NOT NULL,
   PRIMARY KEY (RA, Campus)            -- PK composta: SÓ como restrição de tabela
);

CREATE TABLE Departamento (
   Num     INT PRIMARY KEY,
   Nome    VARCHAR(30),
   CPF_ger CHAR(11) NOT NULL,
   CONSTRAINT dep_fk_cpfger FOREIGN KEY (CPF_ger) REFERENCES FUNCIONARIO(CPF)
       ON DELETE RESTRICT ON UPDATE CASCADE
);
```
- ⚠️ Para uma PK composta, **não** escreva `PRIMARY KEY` em duas colunas. Isso seria "duas PKs" e dá erro.
- A FK tem de ter **o mesmo tipo** da PK referenciada (`CHAR(11)` ↔ `CHAR(11)`).
- `CONSTRAINT nome` dá nome à restrição. Sem nome, o PostgreSQL cria um padrão: `tabela_pkey` para a PK e `tabela_coluna_fkey` para a FK (DDL, slides 17 a 19). **Para remover uma restrição é preciso saber o nome dela** (DDL, slide 32).

**O que acontece quando se apaga ou altera o registro referenciado** (Restr, slides 13 a 18; DDL, slide 20):

| Opção | Efeito | Conceito |
|---|---|---|
| `RESTRICT` (padrão) | rejeita a operação (erro 23503) | bloqueio |
| `CASCADE` | apaga ou atualiza junto as linhas filhas | propagação |
| `SET NULL` | põe NULL na FK | substituição por nulos (⚠️ a FK não pode ser `NOT NULL`) |

Exemplo do professor: com `ON DELETE RESTRICT`, não dá para apagar o funcionário que é gerente. Com `ON UPDATE CASCADE`, trocar o CPF dele atualiza o `CPF_ger` do departamento (DDL, slide 24).

### 2.5 ⭐ Dica de ouro do professor (DDL, slide 31; Diag, slides 8 e 9)

> **"Crie todas as tabelas sem restrições de chave, depois altere-as para incluir as restrições. Dessa forma, a ordem da criação das tabelas não importa."**

Isso resolve a ordem de criação **e** a referência circular. É o que o script do StarTrek faz:

```sql
CREATE TABLE Empregado (
  RG CHAR(11), Endereco VARCHAR(30), Nome VARCHAR(30),
  Salario FLOAT, DepLotacao INT NOT NULL
);
CREATE TABLE Departamento (
  NumId INT, Nome VARCHAR(30), RGGerente CHAR(11)
);
CREATE TABLE Dependente (
  Nome VARCHAR(30), DataNasc DATE, Parentesco VARCHAR(15), RGResp CHAR(11)
);

ALTER TABLE Empregado    ADD PRIMARY KEY (RG);
ALTER TABLE Departamento ADD PRIMARY KEY (NumId);
ALTER TABLE Dependente   ADD PRIMARY KEY (Nome, RGResp);

ALTER TABLE Empregado    ADD FOREIGN KEY (DepLotacao) REFERENCES Departamento(NumId);
ALTER TABLE Dependente   ADD FOREIGN KEY (RGResp)     REFERENCES Empregado(RG);
ALTER TABLE Departamento ADD FOREIGN KEY (RGGerente)  REFERENCES Empregado(RG);
```

Se você declarar as FKs dentro do `CREATE TABLE`, crie primeiro a tabela **referenciada** e depois a que referencia. Na referência circular, crie uma delas sem a FK e adicione-a depois com `ALTER TABLE` (Diag, slides 5 a 7).

### 2.6 ALTER TABLE e DROP TABLE (DDL, slides 22 e 28 a 33)

```sql
ALTER TABLE Funcionario ADD COLUMN Endereco VARCHAR(50);
ALTER TABLE Funcionario DROP COLUMN Endereco;
ALTER TABLE Departamento RENAME CPF_ger TO CPF_gerente;
ALTER TABLE Funcionario ALTER COLUMN Idade SET DEFAULT 18;
ALTER TABLE Funcionario ALTER COLUMN Idade DROP DEFAULT;
ALTER TABLE Funcionario ADD PRIMARY KEY (CPF);
ALTER TABLE Departamento ADD CONSTRAINT departamento_fk
   FOREIGN KEY (CPF_gerente) REFERENCES Funcionario(CPF) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE Departamento DROP CONSTRAINT departamento_fk;

DROP TABLE Departamento;            -- RESTRICT é o padrão: falha se algo depende dela
DROP TABLE Funcionario CASCADE;     -- ⚠️ apaga só as CONSTRAINTS dependentes, não as outras tabelas
```

> ⚠️ **Detalhes dos slides que falham no PostgreSQL:**
> - Para renomear tabela, o certo é `ALTER TABLE Funcionario RENAME TO Fun_geral;`. O slide 28 escreve `RENAME TABLE`.
> - `ADD PRIMARY KEY` exige **parênteses**: `ADD PRIMARY KEY (CPF)`. O slide 31 escreve sem.
> - Para trocar o `ON DELETE` de uma FK, faça `DROP CONSTRAINT` e depois `ADD CONSTRAINT` (DDL, slide 33).

### 2.7 Inserindo dados

```sql
INSERT INTO Departamento VALUES (1, 'Computação', NULL);      -- gerente ainda não existe
INSERT INTO Empregado VALUES ('11111111111', 'Rua A, 1', 'Ana', 4200, 1);
UPDATE Departamento SET RGGerente = '11111111111' WHERE NumId = 1;
```
- Insira primeiro na tabela "pai" e depois na "filha". No StarTrek: Peca, Fornecedor e Projeto antes de Fornece_Para.
- Aspas simples dentro de string ficam dobradas: `'Piloto''s'`.
- Valores como `43.000` nos slides do StarTrek significam **43000**.

---

## 3. SQL DML: consultas

### 3.1 Como o SELECT é executado (Junções, slides 3 a 5)

```sql
SELECT   colunas          -- 5. o que mostrar
FROM     tabelas          -- 1. carrega e junta as tabelas
WHERE    condição         -- 2. filtra LINHAS
GROUP BY colunas          -- 3. forma grupos
HAVING   condição         -- 4. filtra GRUPOS
ORDER BY colunas ASC|DESC -- 6. ordena
```
O resultado de um SELECT **sempre é uma tabela**.

### 3.2 Junção: o coração da prática

⚠️ Várias tabelas no `FROM` **sem** condição dão o **produto cartesiano**: todas as combinações. Com 7 e 5 linhas, saem 35 (Junções, slides 7 a 9).

Há **duas formas equivalentes**, com o mesmo desempenho (Junções, slide 18). O professor sempre mostra as duas (Diag, slides 10 e 11):

```sql
-- Nome do gerente do Departamento de Computação
SELECT Empregado.Nome
FROM Empregado JOIN Departamento ON (RG = RGGerente)
WHERE Departamento.Nome = 'Computação';
-- OU
SELECT Empregado.Nome
FROM Empregado, Departamento
WHERE Empregado.RG = Departamento.RGGerente
  AND Departamento.Nome = 'Computação';
```

```sql
-- Nome e data de nascimento dos dependentes dos empregados do Departamento de Computação
SELECT Dependente.Nome, DataNasc
FROM (Dependente JOIN Empregado ON (RGResp = RG))
     JOIN Departamento ON (DepLotacao = Departamento.NumId)
WHERE Departamento.Nome = 'Computação';
-- OU
SELECT Dependente.Nome, DataNasc
FROM Dependente, Empregado, Departamento
WHERE Dependente.RGResp = Empregado.RG
  AND Empregado.DepLotacao = Departamento.NumId
  AND Departamento.Nome = 'Computação';
```

**Receita para montar qualquer junção:**
1. Quais tabelas têm as colunas que eu quero mostrar e as que eu vou filtrar?
2. Qual "caminho" de FKs liga essas tabelas? Inclua no FROM as tabelas do meio, mesmo que nada delas apareça no resultado. No exemplo acima, Empregado liga Dependente a Departamento.
3. Com **N tabelas, escreva N−1 condições de junção**.
4. Se uma coluna existe em duas tabelas, **prefixe**: `Departamento.Nome`, `Empregado.Nome` (Junções, slide 10).

**Variações do JOIN** (Junções, slides 16 a 20):

| Forma | Quando usar |
|---|---|
| `A JOIN B ON A.x = B.y` | sempre funciona; obrigatória quando os nomes diferem (`RG = RGGerente`) |
| `A JOIN B USING (col)` | a coluna tem o **mesmo nome** nas duas tabelas |
| `A NATURAL JOIN B` | junta por **todas** as colunas de mesmo nome. ⚠️ O professor avisa que "provoca erro em caso de alteração da estrutura". No exercício, Empregado e Departamento têm `Nome`, então um NATURAL JOIN ali estaria **errado** |
| `INNER JOIN` | igual ao `JOIN` |

**OUTER JOIN**, para manter quem não tem par (Junções, slides 23 a 29):

```sql
SELECT Departamento.Nome, Funcionario.Nome, Salario
FROM Funcionario RIGHT OUTER JOIN Departamento ON (RG = RGGerente);
-- Mecânica aparece com NULL no funcionário (departamento sem gerente)
```
- `LEFT`: mantém todas as linhas da tabela da **esquerda**.
- `RIGHT`: mantém todas as da **direita**.
- `FULL`: mantém todas das duas.
- O lado sem par vem com **NULL**.
- Truque: `LEFT JOIN ... WHERE B.chave IS NULL` traz quem **não tem** correspondente (Junções, slide 31).

### 3.3 Filtros úteis

```sql
WHERE PCusto BETWEEN 20000 AND 30000          -- inclui os extremos (Junções, slide 6)
WHERE PePreco IN (9, 18, 22)                  -- pertence à lista (Novos, slide 22)
WHERE (PeCor = 'Vermelho' OR PeCor = 'Amarelo') AND PePreco > 10   -- parênteses: AND vem antes do OR
WHERE RGGerente IS NULL                       -- [fora do material] nunca use "= NULL"
WHERE PeNome LIKE 'L%'                        -- [fora do material] % = qualquer sequência, _ = 1 caractere
```

### 3.4 Agregação, GROUP BY, HAVING, ORDER BY (Novos, slides 4 a 18)

```sql
SELECT PNro, PNome, SUM(Quant) AS TotalPecas
FROM Fornece_Para NATURAL JOIN Projeto
GROUP BY PNro, PNome
HAVING SUM(Quant) >= 5
ORDER BY TotalPecas DESC;
```
- Funções: `COUNT(*)`, `COUNT(col)`, `SUM`, `AVG`, `MIN` e `MAX`. MIN, MAX e COUNT funcionam também com texto.
- ⚠️ **Regra de ouro:** com GROUP BY, toda coluna do SELECT tem de ser **agregação** ou estar **no GROUP BY** (Novos, slide 5). Por isso o exemplo agrupa por `PNro, PNome`.
- ⚠️ `SELECT FCidade, COUNT(*) FROM Fornecedor;` sem GROUP BY **não funciona** (Novos, slide 12).
- ⚠️ **Agregação não vai no WHERE** (Novos, slide 9). Para "a peça mais cara", use uma subconsulta:
  ```sql
  SELECT PeNome FROM Peca WHERE PePreco = (SELECT MAX(PePreco) FROM Peca);
  ```
- **WHERE** filtra linhas antes de agrupar. **HAVING** filtra grupos depois. No HAVING, repita a expressão (`HAVING SUM(Quant) >= 5`), porque o apelido não funciona ali no PostgreSQL.
- `ORDER BY` vai no fim. ASC é o padrão. Aceita o apelido do SELECT.
- **[fora do material]** `COUNT(*)` conta todas as linhas. `COUNT(col)` e as demais funções **ignoram NULL**.
- O agrupamento é feito **depois** da junção (Novos, slide 14).

### 3.5 DISTINCT (Novos, slides 35 a 39)

O SELECT **mantém** linhas repetidas. Use `SELECT DISTINCT` quando a pergunta pede "quais" e a junção pode repetir valores. Exemplo: "peças fornecidas por fornecedores de categoria A" traria Limpador duas vezes (Junções, slide 22).

### 3.6 Subconsultas (Novos, slides 19 a 30)

```sql
-- IN: peças usadas no projeto P5
SELECT PeNome FROM Peca
WHERE PeNro IN (SELECT PeNro FROM Fornece_Para WHERE PNro = 'P5');

-- NOT EXISTS (correlacionada): fornecedores que nunca forneceram
SELECT FNome FROM Fornecedor
WHERE NOT EXISTS (SELECT * FROM Fornece_Para WHERE Fornece_Para.FNro = Fornecedor.FNro);

-- ANY: mesma categoria de algum fornecedor de Campinas
SELECT FNome FROM Fornecedor
WHERE FCidade <> 'Campinas'
  AND FCateg = ANY (SELECT FCateg FROM Fornecedor WHERE FCidade = 'Campinas');

-- ALL: categoria pior que todos os de Campinas ('A' é a melhor)
SELECT FNome FROM Fornecedor
WHERE FCateg > ALL (SELECT FCateg FROM Fornecedor WHERE FCidade = 'Campinas');

-- Subconsulta no FROM: PRECISA de apelido (PecasP4)
SELECT Peca.PeNome
FROM Peca, (SELECT PeNro FROM Fornece_Para WHERE PNro = 'P4') PecasP4
WHERE Peca.PeNro = PecasP4.PeNro AND Peca.PePreco > 20;
```
- Subconsulta usada com `=` tem de devolver **um valor só**. Se devolver vários, use `IN`, `ANY` ou `ALL`.
- `= ANY` equivale a `IN`.
- ⚠️ **[fora do material]** `NOT IN` com algum NULL na subconsulta devolve **vazio**. Nesse caso prefira `NOT EXISTS`.

### 3.7 Operadores de conjunto (Novos, slides 31 a 41)

```sql
SELECT PeNro FROM Peca WHERE PePreco < 10
UNION                         -- ou INTERSECT, ou EXCEPT
SELECT PeNro FROM Fornece_Para WHERE PNro = 'P4';
```
- As duas consultas precisam ter colunas **do mesmo tipo**, na mesma quantidade.
- `UNION`, `INTERSECT` e `EXCEPT` **eliminam** linhas repetidas. Para mantê-las, use `UNION ALL`.
- No `EXCEPT`, a ordem das consultas importa.
- ⚠️ O `ALL` dos operadores de conjunto **não** é o mesmo `ALL` das subconsultas (`> ALL (...)`).

---

## 4. Checklist antes de entregar uma resposta

- [ ] Cada tabela tem PK? A PK composta está como restrição de tabela?
- [ ] A FK está no lado certo (lado N; tabela nova no N:N; entidade fraca)?
- [ ] O tipo da FK é igual ao da PK referenciada?
- [ ] Cardinalidade mínima 1 virou `NOT NULL` na FK?
- [ ] A ordem de criação está certa, ou as FKs foram adicionadas depois com `ALTER TABLE`?
- [ ] Todo comando termina com `;`?
- [ ] As strings e datas estão entre **aspas simples**?
- [ ] O número de condições de junção é N−1 para N tabelas?
- [ ] As colunas ambíguas estão prefixadas (`Tabela.Nome`)?
- [ ] Toda coluna do SELECT com GROUP BY é agregada ou está no GROUP BY?
- [ ] Não há agregação no WHERE (ela vai no HAVING ou numa subconsulta)?
- [ ] O DISTINCT está presente quando a junção pode repetir valores?

---

## 5. Exercícios para treinar (banco StarTrek)

Rode os scripts `ES48H-BD Exemplo-StarTrekCreates.txt` e `...Inserts.txt` (pasta da Semana 2) num banco `startrek`. Tente resolver antes de olhar as respostas.

1. Nome e cidade dos fornecedores de categoria A.
2. Nomes das peças fornecidas para o projeto Sea.
3. Para cada fornecedor (nome), a quantidade total de peças que ele forneceu, do maior para o menor.
4. Projetos (nome) que usaram mais de uma peça diferente.
5. Nome das peças que nunca foram fornecidas a nenhum projeto (resolva com NOT EXISTS e com LEFT JOIN).
6. Nome do projeto mais caro.
7. Fornecedores (nome) de Campinas que forneceram para algum projeto com duração de pelo menos 3.
8. DDL: crie a tabela `Cliente(CNro, CNome, CEmail)` e a tabela `Pedido(PdNro, CNro, PdData)`. O cliente tem muitos pedidos. O email não pode repetir. Não deve ser possível apagar um cliente que tem pedidos.

<details>
<summary>Respostas</summary>

```sql
-- 1
SELECT FNome, FCidade FROM Fornecedor WHERE FCateg = 'A';            -- Kirurgic, Piloto's

-- 2
SELECT PeNome
FROM Peca JOIN Fornece_Para USING (PeNro) JOIN Projeto USING (PNro)
WHERE PNome = 'Sea';                                                  -- Cinto, Lanterna

-- 3
SELECT FNome, SUM(Quant) AS Total
FROM Fornecedor JOIN Fornece_Para USING (FNro)
GROUP BY FNro, FNome
ORDER BY Total DESC;          -- Equipament 5, Kirurgic 4, Piloto's 3, C&M 2, Plastec 1

-- 4
SELECT PNome
FROM Projeto JOIN Fornece_Para USING (PNro)
GROUP BY PNro, PNome
HAVING COUNT(DISTINCT PeNro) > 1;                                     -- Sea

-- 5 (com os dados originais, todas as peças já foram fornecidas: resultado vazio)
SELECT PeNome FROM Peca
WHERE NOT EXISTS (SELECT * FROM Fornece_Para WHERE Fornece_Para.PeNro = Peca.PeNro);
SELECT PeNome FROM Peca LEFT JOIN Fornece_Para USING (PeNro)
WHERE Fornece_Para.PeNro IS NULL;

-- 6
SELECT PNome FROM Projeto WHERE PCusto = (SELECT MAX(PCusto) FROM Projeto);   -- Detroit

-- 7
SELECT DISTINCT FNome
FROM Fornecedor JOIN Fornece_Para USING (FNro) JOIN Projeto USING (PNro)
WHERE FCidade = 'Campinas' AND PDuracao >= 3;                         -- Plastec, Kirurgic

-- 8
CREATE TABLE Cliente (
  CNro   CHAR(5) PRIMARY KEY,
  CNome  VARCHAR(50) NOT NULL,
  CEmail VARCHAR(80) UNIQUE
);
CREATE TABLE Pedido (
  PdNro  INT PRIMARY KEY,
  CNro   CHAR(5) NOT NULL,          -- todo pedido é de um cliente (mínimo 1)
  PdData DATE,
  CONSTRAINT pedido_cliente_fk FOREIGN KEY (CNro) REFERENCES Cliente(CNro)
     ON DELETE RESTRICT
);
```
</details>

---

## 6. O que vem depois no cronograma (fora do material do Moodle)

**[fora do material]** Estes assuntos estão no cronograma (semanas 4 a 8), mas os slides ainda não aparecem no Moodle. Explicação geral em PostgreSQL:

**Visão (VIEW):** uma consulta salva com nome, usada como se fosse uma tabela.
```sql
CREATE VIEW vw_fornecimentos AS
SELECT FNome, PeNome, PNome, Quant
FROM Fornece_Para JOIN Fornecedor USING (FNro) JOIN Peca USING (PeNro) JOIN Projeto USING (PNro);
SELECT * FROM vw_fornecimentos WHERE PNome = 'Sea';
```

**Função em PL/pgSQL:**
```sql
CREATE OR REPLACE FUNCTION total_pecas_projeto(p CHAR(5)) RETURNS INT AS $$
DECLARE total INT;
BEGIN
  SELECT SUM(Quant) INTO total FROM Fornece_Para WHERE PNro = p;
  RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;
SELECT total_pecas_projeto('P4');   -- 7
```

**Função com retorno de conjunto:** `RETURNS TABLE(...)` ou `RETURNS SETOF tabela`, usando `RETURN QUERY SELECT ...`.

**Trigger:** uma função `RETURNS TRIGGER` ligada a INSERT, UPDATE ou DELETE. É assim que se implementam as restrições semânticas (regras de negócio), como diz o professor (Restr, slide 19).
```sql
CREATE OR REPLACE FUNCTION valida_quant() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.Quant <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser positiva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_quant BEFORE INSERT OR UPDATE ON Fornece_Para
FOR EACH ROW EXECUTE FUNCTION valida_quant();
```

Quando esses slides aparecerem no Moodle, rode `npm run sync` de novo e peça para atualizar este guia.
