# Programação de Banco de Dados: lista de exercícios

Estes exercícios acompanham o resumo [materia-completa.md](materia-completa.md). São **diferentes** dos 8 que estão no [guia da atividade prática](guia-atividade-pratica.md), então faça aqueles também.

**Como usar:**
- Tente cada exercício antes de abrir a resposta (clique em "Resposta").
- Para rodar as consultas, crie um banco `startrek` e execute os scripts da pasta da Semana 2: primeiro `...StarTrekCreates.txt`, depois `...StarTrekInserts.txt`. No psql, rode antes `SET client_encoding TO 'LATIN1';` para os acentos saírem certos.
- Os resultados esperados foram conferidos à mão com os dados originais do script.
- As partes A a D usam só o que está nos slides. A parte E é **[fora do material]** (Visões, Funções e Triggers).

---

## Parte A: Teoria (perguntas curtas)

**A1.** Classifique cada modelo como conceitual, lógico ou físico:
- (a) um DER
- (b) `Aluno(RA, Nome, Orientador)` com `Orientador → Professor`
- (c) `CREATE TABLE Aluno (...)`

<details><summary>Resposta</summary>

(a) Conceitual. (b) Lógico (relacional, notação textual). (c) Físico (ER, slides 2 a 9).
</details>

**A2.** Classifique cada restrição. As opções são implícita; explícita (de domínio, de chave, de valores nulos, de integridade de entidade ou referencial); ou semântica.
- (a) Uma tabela não pode ter duas linhas idênticas.
- (b) A coluna `Idade INT` recusa o valor `'vinte'`.
- (c) Nenhum campo da chave primária pode ser nulo.
- (d) `Nome VARCHAR(50) NOT NULL`.
- (e) O orientador de um aluno precisa existir na tabela Professor.
- (f) Dois alunos não podem ter o mesmo RA.
- (g) "O gerente de um departamento deve ser funcionário do mesmo departamento."
- (h) As linhas de uma tabela não têm ordem definida.

<details><summary>Resposta</summary>

(a) Implícita. (b) Explícita, de domínio. (c) Explícita, de integridade de entidade. (d) Explícita, de valores nulos. (e) Explícita, de integridade referencial. (f) Explícita, de chave. (g) Semântica: implementada por trigger ou pela aplicação. (h) Implícita. (Restr, slides 7 a 21)
</details>

**A3.** Tabela Aluno: Francisco e Ana têm orientador 15612 (Paulo), e Antonio tem 74298 (Joana). Tabela Professor: Paulo (15612), Joana (74298) e Roberto (27809). O que acontece ao executar `DELETE FROM Professor WHERE NumFunc = 15612;` quando a FK `Orientador` foi criada com:
- (a) `ON DELETE RESTRICT`
- (b) `ON DELETE CASCADE`
- (c) `ON DELETE SET NULL`

E com `RESTRICT`, quais professores podem ser excluídos?

<details><summary>Resposta</summary>

- (a) Bloqueio: o DELETE é rejeitado com erro de violação de FK.
- (b) Propagação: Paulo é apagado, e Francisco e Ana também.
- (c) Substituição por nulos: Paulo é apagado, e o Orientador de Francisco e de Ana vira NULL.

Com RESTRICT, só **Roberto** pode ser excluído, porque nenhum aluno aponta para ele (Restr, slides 14 a 18).
</details>

**A4.** Qual comando do psql faz cada coisa?
- (a) lista as tabelas do banco atual
- (b) mostra a estrutura de uma tabela
- (c) executa um arquivo .sql
- (d) conecta ao banco `startrek`
- (e) lista os bancos

<details><summary>Resposta</summary>

(a) `\dt` (b) `\d+ tabela` (c) `\i 'C:/caminho/arquivo.sql'` (d) `\c startrek` (e) `\l` (PG, slide 7)
</details>

**A5.** Qual a diferença entre um *banco de dados* e um *esquema* no PostgreSQL? Como fazer para que os próximos `CREATE TABLE` caiam no esquema `loja`?

<details><summary>Resposta</summary>

O banco é a estrutura básica de armazenamento. O esquema fica dentro do banco e agrupa os objetos (tabelas, visões, funções) de uma mesma aplicação. O padrão é o `public`. Para usar o esquema `loja`: `SET SEARCH_PATH TO loja;`, ou qualifique o nome: `CREATE TABLE loja.produto (...)` (PG, slides 10 e 11).
</details>

**A6.** Sem rodar, quantas linhas cada consulta devolve no StarTrek?
- (a) `SELECT * FROM Peca, Fornecedor;`
- (b) `SELECT * FROM Fornece_Para, Peca;`
- (c) `SELECT * FROM Fornece_Para, Peca WHERE Fornece_Para.PeNro = Peca.PeNro;`

<details><summary>Resposta</summary>

(a) 5 × 5 = **25** (produto cartesiano). (b) 7 × 5 = **35**. (c) **7**: uma linha por fornecimento, porque cada fornecimento tem exatamente uma peça (Junções, slides 7 a 12).
</details>

**A7.** Qual o resultado de cada consulta?
```sql
-- (a)
SELECT PeNro FROM Peca WHERE PePreco < 10
UNION
SELECT PeNro FROM Fornece_Para WHERE PNro = 'P5';
-- (b) a mesma consulta, com UNION ALL
```

<details><summary>Resposta</summary>

(a) `PE4` uma vez, porque UNION elimina repetições. (b) `PE4` **três vezes**: uma vem de Peca (o Limpador custa 9) e duas vêm dos fornecimentos ao P5, feitos por F4 e F3 (Novos, slides 36 e 41).
</details>

---

## Parte B: DER → Relacional → SQL (o formato do professor)

**Cenário: rede de clínicas veterinárias.**

- **Cliente**: CPF (identificador), Nome, Endereço composto (Rua, Número, Cidade) e **Telefones** (multivalorado).
- **Animal**: Código (identificador), Nome, Espécie, DataNasc.
- **Veterinário**: CRMV (identificador), Nome, Especialidade.
- **Unidade**: Número (identificador), Nome, Cidade.

Relacionamentos:
- **Possui** (Cliente–Animal): cada animal tem **exatamente um** dono; um cliente tem **0 ou mais** animais.
- **Lotação** (Veterinário–Unidade): cada veterinário está lotado em **exatamente uma** unidade; uma unidade tem **0 ou mais** veterinários.
- **Responsável** (Veterinário–Unidade): cada unidade tem **exatamente um** veterinário responsável; um veterinário é responsável por **no máximo uma** unidade.
- **Acompanha** (Veterinário–Animal): um veterinário acompanha vários animais, e um animal pode ser acompanhado por vários veterinários. Atributo do relacionamento: **DataInicio**.

**B1.** Passe para o modelo relacional, na notação do professor (PK e FKs com `→`). Diga qual regra você usou em cada relacionamento.

**B2.** Escreva o SQL de criação de todas as tabelas, com estas regras extras:
- ao excluir um cliente, os telefones dele devem ser apagados junto;
- não deve ser possível excluir um cliente que tem animais.

**B3.** Escreva as consultas:
- (a) Nome dos animais da cliente "Ana Souza".
- (b) Nome do veterinário responsável pela unidade "Centro", com a cidade da unidade.
- (c) Nome dos animais acompanhados por algum veterinário lotado na unidade "Centro", sem repetições.
- (d) Para cada unidade (nome), quantos veterinários estão lotados nela, **incluindo as unidades sem nenhum**.
- (e) Nome dos clientes que não têm nenhum animal.

<details><summary>Resposta B1</summary>

```
Cliente(CPF, Nome, Rua, Numero, Cidade)
Telefone(Numero, CPFCliente)                 CPFCliente → Cliente
Animal(Codigo, Nome, Especie, DataNasc, CPFDono)
     CPFDono → Cliente
Unidade(Numero, Nome, Cidade, CRMVResponsavel)
     CRMVResponsavel → Veterinario
Veterinario(CRMV, Nome, Especialidade, NumUnidade)
     NumUnidade → Unidade
Acompanha(CodAnimal, CRMVVet, DataInicio)    PK = CodAnimal + CRMVVet
     CodAnimal → Animal
     CRMVVet → Veterinario
```

As regras usadas:
- **Endereço composto** virou colunas separadas (ER, slide 12).
- **Telefones** (multivalorado) virou a tabela `Telefone`, com PK = Numero + CPFCliente (ER, slide 12).
- **Possui** (1:N): a FK fica no lado N, em Animal. É `NOT NULL` porque o mínimo é 1 (ER, slide 13).
- **Lotação** (1:N): a FK fica em Veterinário, também `NOT NULL`.
- **Responsável** (1:1, mas não (0,1):(0,1)): a regra preferida seria a fusão (ER, slide 15). Só que Unidade e Veterinário têm outros relacionamentos, então usamos a adição de coluna em Unidade, que é o lado com mínimo 1, igual ao `RGGerente` do exemplo do professor (ER, slide 23).
- **Acompanha** (N:N): virou uma tabela nova. O atributo `DataInicio` vai junto, fora da PK (ER, slides 16 e 17).
- Atenção: há **referência circular** entre Unidade e Veterinário.
</details>

<details><summary>Resposta B2</summary>

```sql
-- 1) tabelas sem as chaves (a ordem não importa)
CREATE TABLE Cliente (
    CPF    CHAR(11),
    Nome   VARCHAR(50) NOT NULL,
    Rua    VARCHAR(50),
    Numero INT,
    Cidade VARCHAR(30)
);
CREATE TABLE Telefone (
    Numero     VARCHAR(15),
    CPFCliente CHAR(11)
);
CREATE TABLE Animal (
    Codigo   INT,
    Nome     VARCHAR(30) NOT NULL,
    Especie  VARCHAR(20),
    DataNasc DATE,
    CPFDono  CHAR(11) NOT NULL          -- mínimo 1: todo animal tem dono
);
CREATE TABLE Unidade (
    Numero          INT,
    Nome            VARCHAR(30) NOT NULL,
    Cidade          VARCHAR(30),
    CRMVResponsavel VARCHAR(10) NOT NULL -- toda unidade tem responsável
);
CREATE TABLE Veterinario (
    CRMV          VARCHAR(10),
    Nome          VARCHAR(50) NOT NULL,
    Especialidade VARCHAR(30),
    NumUnidade    INT NOT NULL          -- todo veterinário está lotado
);
CREATE TABLE Acompanha (
    CodAnimal  INT,
    CRMVVet    VARCHAR(10),
    DataInicio DATE
);

-- 2) chaves primárias
ALTER TABLE Cliente     ADD PRIMARY KEY (CPF);
ALTER TABLE Telefone    ADD PRIMARY KEY (Numero, CPFCliente);
ALTER TABLE Animal      ADD PRIMARY KEY (Codigo);
ALTER TABLE Unidade     ADD PRIMARY KEY (Numero);
ALTER TABLE Veterinario ADD PRIMARY KEY (CRMV);
ALTER TABLE Acompanha   ADD PRIMARY KEY (CodAnimal, CRMVVet);

-- 3) chaves estrangeiras
ALTER TABLE Telefone ADD CONSTRAINT telefone_cliente_fk
    FOREIGN KEY (CPFCliente) REFERENCES Cliente(CPF) ON DELETE CASCADE;
ALTER TABLE Animal ADD CONSTRAINT animal_cliente_fk
    FOREIGN KEY (CPFDono) REFERENCES Cliente(CPF) ON DELETE RESTRICT;
ALTER TABLE Unidade ADD CONSTRAINT unidade_resp_fk
    FOREIGN KEY (CRMVResponsavel) REFERENCES Veterinario(CRMV);
ALTER TABLE Veterinario ADD CONSTRAINT vet_unidade_fk
    FOREIGN KEY (NumUnidade) REFERENCES Unidade(Numero);
ALTER TABLE Acompanha ADD CONSTRAINT acomp_animal_fk
    FOREIGN KEY (CodAnimal) REFERENCES Animal(Codigo);
ALTER TABLE Acompanha ADD CONSTRAINT acomp_vet_fk
    FOREIGN KEY (CRMVVet) REFERENCES Veterinario(CRMV);
```
Confira:
- os tipos das FKs são iguais aos das PKs (`CHAR(11)`, `VARCHAR(10)`, `INT`);
- a PK composta está como restrição de tabela;
- `CASCADE` está no telefone e `RESTRICT` no animal.

**[fora do material]** Do jeito que está, nada impede que um veterinário seja responsável por duas unidades. Para garantir o "no máximo uma" do 1:1, acrescente `ALTER TABLE Unidade ADD UNIQUE (CRMVResponsavel);`.

**Para pensar:** com os dois `NOT NULL` circulares, como inserir a primeira unidade e o primeiro veterinário? Um precisa do outro. Uma saída é deixar `CRMVResponsavel` aceitando NULL, inserir a unidade, depois o veterinário, e por fim fazer um `UPDATE` na unidade. É a mesma técnica do `INSERT INTO Departamento VALUES (1,'Computação',null)` (ER, slide 3). **[fora do material]** A outra saída é criar a FK como `DEFERRABLE INITIALLY DEFERRED` e inserir os dois na mesma transação.
</details>

<details><summary>Resposta B3</summary>

```sql
-- (a)
SELECT Animal.Nome
FROM Animal JOIN Cliente ON (CPFDono = CPF)
WHERE Cliente.Nome = 'Ana Souza';

-- (b)  o JOIN usa a FK do responsável, não a da lotação
SELECT Veterinario.Nome, Unidade.Cidade
FROM Unidade JOIN Veterinario ON (CRMVResponsavel = CRMV)
WHERE Unidade.Nome = 'Centro';

-- (c)  4 tabelas → 3 condições de junção; DISTINCT porque um animal pode ter vários vets da unidade
SELECT DISTINCT Animal.Nome
FROM Animal JOIN Acompanha   ON (Animal.Codigo = Acompanha.CodAnimal)
            JOIN Veterinario ON (Acompanha.CRMVVet = Veterinario.CRMV)
            JOIN Unidade     ON (Veterinario.NumUnidade = Unidade.Numero)
WHERE Unidade.Nome = 'Centro';
-- OU, no estilo WHERE:
SELECT DISTINCT Animal.Nome
FROM Animal, Acompanha, Veterinario, Unidade
WHERE Animal.Codigo = Acompanha.CodAnimal
  AND Acompanha.CRMVVet = Veterinario.CRMV
  AND Veterinario.NumUnidade = Unidade.Numero
  AND Unidade.Nome = 'Centro';

-- (d)  LEFT JOIN mantém a unidade sem veterinário; COUNT(coluna) ignora o NULL → 0
SELECT Unidade.Nome, COUNT(Veterinario.CRMV) AS QtdVets
FROM Unidade LEFT JOIN Veterinario ON (Veterinario.NumUnidade = Unidade.Numero)
GROUP BY Unidade.Numero, Unidade.Nome;

-- (e)
SELECT Nome FROM Cliente
WHERE NOT EXISTS (SELECT * FROM Animal WHERE Animal.CPFDono = Cliente.CPF);
-- OU
SELECT Nome FROM Cliente WHERE CPF NOT IN (SELECT CPFDono FROM Animal);
```
Armadilhas:
- **(b):** usar `NumUnidade` traria todos os veterinários *lotados* no Centro, e não o *responsável*.
- **(c):** `Nome` existe em três tabelas, então é obrigatório prefixar. Um `NATURAL JOIN` ali juntaria pelas colunas `Nome`, o que está errado.
- **(d):** com `COUNT(*)`, a unidade vazia apareceria com **1**, e não com 0.
</details>

---

## Parte C: Consultas no StarTrek

**C1.** Nome e preço das peças vermelhas, da mais cara para a mais barata.

**C2.** Nome dos fornecedores que forneceram para o projeto Detroit.

**C3.** Nome de cada peça, nome do fornecedor e nome do projeto, em todos os fornecimentos para projetos com custo acima de 25000.

**C4.** Para cada projeto (nome), quantos fornecedores **diferentes** forneceram para ele.

**C5.** Valor total gasto em peças por projeto (Quant × PePreco), do maior para o menor.

**C6.** Nome e preço das peças com preço acima da média de preço das peças.

**C7.** Nome dos fornecedores que forneceram para mais de um projeto.

**C8.** Primeiro rode `INSERT INTO Fornecedor VALUES ('F6','Provider','Londrina','C');` (pule se você já inseriu o F6 do slide 27 de Novos). Depois liste **todos** os fornecedores (nome) com o número de fornecimentos de cada um, incluindo o Provider com 0.

**C9.** Com `INTERSECT`: códigos dos projetos que receberam peças de algum fornecedor de Campinas **e** que têm duração de pelo menos 3.

**C10.** Com `EXCEPT`: nome das peças que **nunca** foram fornecidas por um fornecedor de categoria A.

**C11.** Nome do projeto que recebeu a maior quantidade total de peças. Resolva com `>= ALL`.

**C12.** Nome dos fornecedores que forneceram alguma peça **amarela**. Resolva de três jeitos: com junção, com `IN` e com `EXISTS`.

<details><summary>Respostas C1 a C6</summary>

```sql
-- C1                                         → Painel 43, Volante 18
SELECT PeNome, PePreco FROM Peca
WHERE PeCor = 'Vermelho'
ORDER BY PePreco DESC;

-- C2                                         → Plastec
SELECT FNome
FROM Fornecedor JOIN Fornece_Para USING (FNro) JOIN Projeto USING (PNro)
WHERE PNome = 'Detroit';

-- C3  (4 tabelas, 3 condições)
SELECT PeNome, FNome, PNome
FROM Fornece_Para JOIN Peca       USING (PeNro)
                  JOIN Fornecedor USING (FNro)
                  JOIN Projeto    USING (PNro)
WHERE PCusto > 25000;
-- → Painel / Plastec / Detroit
--   Volante / C&M / Pegasus
--   Volante / C&M / Alfa

-- C4  COUNT(DISTINCT ...) para não contar o mesmo fornecedor duas vezes
SELECT PNome, COUNT(DISTINCT FNro) AS QtdFornecedores
FROM Projeto JOIN Fornece_Para USING (PNro)
GROUP BY PNro, PNome;
-- → Detroit 1, Pegasus 1, Alfa 1, Sea 2, Paraíso 2

-- C5
SELECT PNome, SUM(Quant * PePreco) AS Gasto
FROM Projeto JOIN Fornece_Para USING (PNro) JOIN Peca USING (PeNro)
GROUP BY PNro, PNome
ORDER BY Gasto DESC;
-- → Sea 138 (5×22 + 2×14), Paraíso 45 (3×9 + 2×9), Detroit 43, Pegasus 18, Alfa 18

-- C6  média = (22+18+14+9+43)/5 = 21,2  → Cinto 22, Painel 43
SELECT PeNome, PePreco FROM Peca
WHERE PePreco > (SELECT AVG(PePreco) FROM Peca);
```
</details>

<details><summary>Respostas C7 a C12</summary>

```sql
-- C7                                         → C&M (P2, P3), Kirurgic (P4, P5)
SELECT FNome
FROM Fornecedor JOIN Fornece_Para USING (FNro)
GROUP BY FNro, FNome
HAVING COUNT(DISTINCT PNro) > 1;

-- C8  LEFT JOIN + COUNT(coluna da direita)
SELECT FNome, COUNT(Fornece_Para.PNro) AS Fornecimentos
FROM Fornecedor LEFT JOIN Fornece_Para USING (FNro)
GROUP BY FNro, FNome;
-- → Plastec 1, C&M 2, Kirurgic 2, Piloto's 1, Equipament 1, Provider 0
-- ⚠️ com COUNT(*) o Provider apareceria com 1 (a linha dele existe, só que com NULLs)

-- C9   Campinas = F1, F3 → projetos P1, P4, P5;  duração ≥ 3 → P1, P2, P4
SELECT PNro FROM Fornece_Para JOIN Fornecedor USING (FNro)
WHERE FCidade = 'Campinas'
INTERSECT
SELECT PNro FROM Projeto WHERE PDuracao >= 3;
-- → P1, P4

-- C10  categoria A = F3, F4 → forneceram PE3, PE4
SELECT PeNome FROM Peca
WHERE PeNro IN (
    SELECT PeNro FROM Peca
    EXCEPT
    SELECT PeNro FROM Fornece_Para JOIN Fornecedor USING (FNro) WHERE FCateg = 'A'
);
-- → Cinto, Volante, Painel
-- (O EXCEPT direto com PeNome também funciona aqui, porque não há nomes repetidos.)

-- C11  totais: P1 1, P2 1, P3 1, P4 7, P5 5 → Sea
SELECT PNome
FROM Projeto JOIN Fornece_Para USING (PNro)
GROUP BY PNro, PNome
HAVING SUM(Quant) >= ALL (SELECT SUM(Quant) FROM Fornece_Para GROUP BY PNro);

-- C12  peça amarela = PE4 (Limpador), fornecida por F4 e F3 → Kirurgic, Piloto's
SELECT DISTINCT FNome
FROM Fornecedor JOIN Fornece_Para USING (FNro) JOIN Peca USING (PeNro)
WHERE PeCor = 'Amarelo';

SELECT FNome FROM Fornecedor
WHERE FNro IN (SELECT FNro FROM Fornece_Para JOIN Peca USING (PeNro)
               WHERE PeCor = 'Amarelo');

SELECT FNome FROM Fornecedor
WHERE EXISTS (SELECT * FROM Fornece_Para JOIN Peca USING (PeNro)
              WHERE Fornece_Para.FNro = Fornecedor.FNro AND PeCor = 'Amarelo');
```
</details>

---

## Parte D: Ache o erro

Diga o que está errado em cada comando (erro de execução ou resultado errado) e corrija.

```sql
-- D1
SELECT FCidade, COUNT(*) FROM Fornecedor;

-- D2
SELECT PeNome FROM Peca WHERE PePreco > AVG(PePreco);

-- D3
SELECT FNome FROM Fornecedor WHERE FCateg = NULL;

-- D4  (nome da peça e nome do projeto de cada fornecimento)
SELECT PeNome, PNome
FROM Peca, Fornece_Para, Projeto
WHERE Peca.PeNro = Fornece_Para.PeNro;

-- D5  (schema do exercício de revisão: nome dos empregados de cada departamento)
SELECT Nome FROM Empregado NATURAL JOIN Departamento;

-- D6
CREATE TABLE Matricula (
    RA      CHAR(7) PRIMARY KEY,
    CodDisc INT     PRIMARY KEY,
    Nota    DECIMAL(4,2)
);

-- D7
SELECT FCidade, COUNT(*) AS Qtd
FROM Fornecedor
GROUP BY FCidade
HAVING Qtd >= 2;

-- D8
DELETE FROM Peca WHERE PeNro = 'PE1';
```

<details><summary>Respostas</summary>

- **D1:** falta o `GROUP BY FCidade`. FCidade devolve várias linhas e o COUNT devolve uma só (Novos, slide 12).
- **D2:** agregação não pode ficar no WHERE. Corrija com `WHERE PePreco > (SELECT AVG(PePreco) FROM Peca)` (Novos, slide 9).
- **D3:** `= NULL` nunca é verdadeiro, então a consulta sempre volta vazia. Use `IS NULL`. **[fora do material]**
- **D4:** são 3 tabelas e só 1 condição de junção, então Projeto entra em produto cartesiano: 7 × 5 = 35 linhas. Acrescente `AND Fornece_Para.PNro = Projeto.PNro`.
- **D5:** a única coluna com o mesmo nome nas duas tabelas é `Nome`, então o NATURAL JOIN junta "empregado com o mesmo nome do departamento". O resultado vem vazio ou errado. Use `Empregado JOIN Departamento ON (DepLotacao = NumId)` (Junções, slide 20).
- **D6:** isso declara duas PKs, e o PostgreSQL dá erro. PK composta é `PRIMARY KEY (RA, CodDisc)`, como restrição de tabela (DDL, slide 15).
- **D7:** no PostgreSQL o apelido do SELECT não existe no HAVING **[fora do material]**. Escreva `HAVING COUNT(*) >= 2`, como no exemplo do professor (Novos, slide 17).
- **D8:** não é erro de sintaxe, mas o DELETE falha. PE1 aparece em Fornece_Para, e a FK bloqueia a exclusão: é a integridade referencial agindo, com o RESTRICT/NO ACTION padrão (Restr, slide 16).
</details>

---

## Parte E: Visões, Funções e Triggers **[fora do material]**

Os slides destas semanas não estão no Moodle. Os exercícios seguem o que costuma ser cobrado em PostgreSQL. **Rode dentro de `BEGIN; ... ROLLBACK;`** para não estragar os dados do StarTrek.

⚠️ Alguns testes (E2, E3, E7) **devem** dar erro. No PostgreSQL, um erro dentro de `BEGIN` aborta a transação inteira, e todo comando seguinte falha com "current transaction is aborted". Depois de cada erro esperado, rode `ROLLBACK;` e `BEGIN;` de novo. Nas respostas, o caso que passa vem antes do que falha.

**E1 (visão).** Crie a visão `vw_gasto_projeto(PNro, PNome, Gasto)`, com o gasto total em peças por projeto. Use-a para listar os projetos com gasto acima de 40.

**E2 (visão, teoria).** Dá para fazer `UPDATE vw_gasto_projeto SET Gasto = 0;`? Por quê? Crie uma visão atualizável `vw_pecas_baratas` (peças com preço < 15) que **impeça** cadastrar por ela uma peça de preço 50.

**E3 (função escalar).** Crie `preco_medio_fornecedor(p_fnro)`, que devolve o preço médio das peças nos fornecimentos de um fornecedor. Se o fornecedor não tiver fornecimentos, a função deve dar erro com uma mensagem. Teste com `'F3'` e com `'F9'`.

**E4 (retorno de conjunto).** Crie `pecas_do_projeto(p_pnro)`, que devolve uma tabela `(nome_peca, quantidade)`. Teste com `'P4'`.

**E5 (procedimento).** Crie o procedimento `reajusta_precos(p_cor, p_percentual)`, que aumenta o preço das peças de uma cor e mostra quantas foram alteradas. Chame-o para `'Vermelho'` com 10%.

**E6 (trigger de auditoria).** Toda alteração de preço de uma peça deve ser gravada numa tabela `Log_Preco(PeNro, PrecoAntigo, PrecoNovo, Quando)`. Escolha BEFORE ou AFTER e justifique.

**E7 (trigger de regra semântica).** Regra de negócio: *um fornecedor de categoria 'D' não pode fornecer mais de 2 unidades num fornecimento.* Implemente e teste com `('PE1','F2','P1',2)`, que deve passar, e com `('PE3','F2','P1',3)`, que deve falhar.

**E8 (teoria de triggers).**
- (a) Num trigger `BEFORE INSERT ... FOR EACH ROW`, o que acontece se a função retornar `NULL`?
- (b) Num trigger de DELETE, qual variável tem conteúdo: NEW ou OLD?
- (c) Um `UPDATE` alterou 3 linhas. Quantas vezes roda um trigger `FOR EACH ROW`? E um `FOR EACH STATEMENT`?
- (d) Num trigger AFTER, alterar `NEW.PePreco` muda o que foi gravado?
- (e) Como chamar uma FUNCTION, uma PROCEDURE e uma função `RETURNS TABLE`?

<details><summary>Resposta E1 e E2</summary>

```sql
CREATE VIEW vw_gasto_projeto AS
SELECT PNro, PNome, SUM(Quant * PePreco) AS Gasto
FROM Projeto JOIN Fornece_Para USING (PNro) JOIN Peca USING (PeNro)
GROUP BY PNro, PNome;

SELECT PNome, Gasto FROM vw_gasto_projeto WHERE Gasto > 40 ORDER BY Gasto DESC;
-- → Sea 138, Paraíso 45, Detroit 43
```
**E2:** não dá. A visão tem GROUP BY e agregação, então não é atualizável: o SGBD não sabe em que linhas de Fornece_Para "colocar" o valor 0.

```sql
CREATE VIEW vw_pecas_baratas AS
SELECT PeNro, PeNome, PePreco, PeCor FROM Peca WHERE PePreco < 15
WITH CHECK OPTION;

INSERT INTO vw_pecas_baratas VALUES ('PE9','Parafuso', 2,'Cinza');  -- ok, grava em Peca
INSERT INTO vw_pecas_baratas VALUES ('PE8','Motor',   50,'Cinza');  -- ERRO: viola a CHECK OPTION
```
</details>

<details><summary>Resposta E3 a E5</summary>

```sql
-- E3
CREATE OR REPLACE FUNCTION preco_medio_fornecedor(p_fnro CHAR(5))
RETURNS FLOAT AS $$
DECLARE
    v_media FLOAT;
BEGIN
    SELECT AVG(PePreco) INTO v_media
    FROM Peca JOIN Fornece_Para USING (PeNro)
    WHERE FNro = p_fnro;

    IF v_media IS NULL THEN          -- AVG de nenhuma linha dá NULL (o FOUND seria TRUE aqui!)
        RAISE EXCEPTION 'Fornecedor % não tem fornecimentos', p_fnro;
    END IF;
    RETURN v_media;
END;
$$ LANGUAGE plpgsql;

SELECT preco_medio_fornecedor('F3');   -- 11.5  (Lanterna 14 e Limpador 9)
SELECT preco_medio_fornecedor('F9');   -- ERRO: Fornecedor F9 não tem fornecimentos
```
Por que testar `IS NULL` e não `NOT FOUND`: um SELECT com agregação **sempre** devolve uma linha, mesmo sem dados. Nesse caso a linha vem com NULL e o FOUND fica TRUE.

```sql
-- E4
CREATE OR REPLACE FUNCTION pecas_do_projeto(p_pnro CHAR(5))
RETURNS TABLE (nome_peca CHAR(30), quantidade INT) AS $$
BEGIN
    RETURN QUERY
        SELECT Peca.PeNome, Fornece_Para.Quant
        FROM Peca JOIN Fornece_Para USING (PeNro)
        WHERE Fornece_Para.PNro = p_pnro;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM pecas_do_projeto('P4');   -- Cinto 5, Lanterna 2
```

```sql
-- E5
CREATE OR REPLACE PROCEDURE reajusta_precos(p_cor VARCHAR, p_percentual FLOAT)
AS $$
DECLARE
    n INT;
BEGIN
    UPDATE Peca SET PePreco = PePreco * (1 + p_percentual / 100)
    WHERE PeCor = p_cor;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '% peça(s) reajustada(s)', n;
END;
$$ LANGUAGE plpgsql;

BEGIN;
CALL reajusta_precos('Vermelho', 10);   -- NOTICE: 2 peça(s) reajustada(s)
SELECT PeNome, PePreco FROM Peca WHERE PeCor = 'Vermelho';   -- Volante ≈ 19.8, Painel ≈ 47.3
ROLLBACK;
```
</details>

<details><summary>Resposta E6 e E7</summary>

```sql
-- E6: AFTER, porque só faz sentido registrar o que de fato foi gravado
--     (passou por todas as restrições); o trigger não precisa mudar a linha.
CREATE TABLE Log_Preco (
    PeNro       CHAR(5),
    PrecoAntigo FLOAT,
    PrecoNovo   FLOAT,
    Quando      TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_log_preco() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Log_Preco (PeNro, PrecoAntigo, PrecoNovo)
    VALUES (OLD.PeNro, OLD.PePreco, NEW.PePreco);
    RETURN NULL;                         -- em AFTER o retorno é ignorado
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_log_preco
AFTER UPDATE OF PePreco ON Peca
FOR EACH ROW
WHEN (OLD.PePreco IS DISTINCT FROM NEW.PePreco)
EXECUTE FUNCTION fn_log_preco();

-- teste
UPDATE Peca SET PePreco = 25 WHERE PeNro = 'PE1';
SELECT * FROM Log_Preco;                 -- PE1 | 22 | 25 | <data/hora>
```

```sql
-- E7: BEFORE, porque é validação (barrar antes de gravar)
CREATE OR REPLACE FUNCTION fn_valida_categoria() RETURNS TRIGGER AS $$
DECLARE
    v_categ Fornecedor.FCateg%TYPE;
BEGIN
    SELECT FCateg INTO v_categ FROM Fornecedor WHERE FNro = NEW.FNro;
    IF v_categ = 'D' AND NEW.Quant > 2 THEN
        RAISE EXCEPTION 'Fornecedor % é categoria D: máximo 2 unidades (pedido: %)',
                        NEW.FNro, NEW.Quant;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_categoria
BEFORE INSERT OR UPDATE ON Fornece_Para
FOR EACH ROW EXECUTE FUNCTION fn_valida_categoria();

INSERT INTO Fornece_Para VALUES ('PE1','F2','P1',2);   -- ok
INSERT INTO Fornece_Para VALUES ('PE3','F2','P1',3);   -- ERRO (C&M é categoria D)
```
Repare: isso é exatamente uma **restrição semântica**. Não dá para expressar com um CHECK simples, porque a categoria está em **outra tabela**, e por isso entra o trigger (Restr, slide 19).
</details>

<details><summary>Resposta E8</summary>

- **(a)** A inserção daquela linha é **cancelada em silêncio**, sem erro. O comando termina dizendo "INSERT 0 0".
- **(b)** `OLD`. O NEW é NULL no DELETE.
- **(c)** ROW roda **3 vezes**, uma por linha. STATEMENT roda **1 vez**, e rodaria mesmo se o UPDATE afetasse 0 linhas.
- **(d)** Não. A linha já foi gravada, e o retorno de um AFTER é ignorado. Para mudar o dado, use BEFORE.
- **(e)** `SELECT minha_funcao(...)`, `CALL meu_procedimento(...)` e `SELECT * FROM minha_funcao_tabela(...)`.
</details>

---

## Padrões que servem para qualquer questão parecida

| A pergunta diz... | Use |
|---|---|
| "para cada X, quantos/total/média" | `GROUP BY X` + agregação |
| "... só os que têm mais de N" | `HAVING` |
| "o maior / o mais caro" | subconsulta com `MAX`, ou `>= ALL` |
| "acima da média" | `> (SELECT AVG(...) ...)` |
| "que nunca / que não têm" | `NOT EXISTS`, `NOT IN` ou `LEFT JOIN ... IS NULL` |
| "todos, incluindo os que não têm" | `LEFT JOIN` + `COUNT(coluna_da_direita)` |
| "quais" (pode repetir por causa da junção) | `DISTINCT` |
| "X e também Y" / "X mas não Y" | `INTERSECT` / `EXCEPT` (ou `IN` / `NOT IN`) |
| "regra de negócio que envolve outra tabela" | trigger BEFORE com `RAISE EXCEPTION` |
| "registrar / auditar alterações" | trigger AFTER |
