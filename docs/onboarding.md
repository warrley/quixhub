# Onboarding

Bem-vindo ao QuixHub! Leia primeiro `README.md` (como rodar), `docs/vision.md` (produto) e `docs/architecture.md` (técnico). Este arquivo é um resumo do estado atual + as tarefas iniciais.

## Estado atual

- `frontend/` — Next.js (App Router) + React 19 + TypeScript + Tailwind v4.
  - Ligados ao backend real: `/catalogo`, `/opinioes`.
  - Local-first (só `localStorage`, por privacidade das notas): `/ira`, `/fluxograma`.
  - Ainda com dados mockados (`src/data/mock.ts`): Home, `/materiais`, `/calendario`, `/perfil`.
- `backend/` — Express + TypeScript + Postgres (Drizzle). Módulos em `src/modules/<nome>/` (`routes`, `controller`, `service`, `service.test`). Schema em `src/db/schema.ts`.
- `data/` — scripts Python soltos de análise de dados do campus (ex.: `analyze_ods.py`).

---

## Tarefa 1 — Gráfico de IRA com dados reais (histograma) em vez da curva normal

Issue #2 · branch: `feat/ira-real-distribution-chart`

**Hoje:** `frontend/src/components/IraDistributionChart.tsx` desenha uma curva normal teórica usando só `mean` e `std` de `frontend/src/data/iraDistribution.ts`, e calcula percentil/posição pela CDF normal (`src/lib/statistics.ts`).

**Objetivo:** usar as notas reais dos alunos do campus (ativos e formados) para mostrar a distribuição de verdade: barras (histograma) + uma silhueta suave por cima. Não será uma curva perfeita, mas deve lembrar uma normal.

**Dados:** um professor vai fornecer, por aluno e por curso: semestre de ingresso, semestre de conclusão e semestre atual (além do IRA). Já temos o recorte de um curso para começar (ver "A confirmar").

**Passos sugeridos**
1. Script em `data/` (Python) que lê a planilha e gera **apenas dados agregados** por curso: contagem por faixa de nota (bins, ex. 0,25 em 0,25), `mean`, `std`, `students`, e se possível separar ativos × todos.
   - **Nunca commitar a planilha bruta nem matrícula/CPF/nome.** Só o agregado vai para o repositório.
2. Estender o tipo em `iraDistribution.ts` com os bins (campo opcional; cursos sem bins continuam com a normal como fallback).
3. No `IraDistributionChart.tsx`: desenhar as barras (`<rect>`) e uma curva suave sobre elas (KDE ou suavização dos bins). Manter hover, marcador "você" e referências de média/desvio.
4. Percentil e posição (`Nº de X alunos`) passam a ser **empíricos** (fração de alunos com IRA menor) quando houver bins; fallback para a normal quando não houver.
5. Atualizar `IRA_DATA_UPDATED_AT` e o texto do gráfico.

**Ideias extras:** alternar "ativos" × "todos"; comparar só com a mesma coorte (semestre de ingresso).

**Pronto quando:** o gráfico mostra barras reais + silhueta para o curso com dados, cursos sem dados continuam funcionando, `tsc --noEmit` passa.

---

## Tarefa 2 — Lógica de situação (aprovado / reprovado / trancado / em andamento) na calculadora de IRA

Issue #3 · branch: `feat/ira-grade-status-sync`

**Arquivo:** `frontend/app/(shell)/ira/page.tsx`. A situação existe em 3 fluxos: adição manual, edição inline e revisão da importação do PDF.

**Problemas atuais**
- Adição manual não tem seletor de situação: tudo entra como `aprovado`, mesmo com nota baixa.
- Na edição inline, mudar a nota não atualiza a situação.
- Só a revisão do PDF tem alguma sincronização (nota vazia → `em_andamento`; nota preenchida em andamento → aprovado/reprovado), e usa corte 5.
- Para `trancado`/`em_andamento` o formulário ainda exige nota válida.

**Regras desejadas**
- Nota `< 4` → **sempre `reprovado`** (não pode ficar aprovado).
- Mudou a nota → a situação acompanha automaticamente (ex.: estava aprovado, digitou nota de reprovação → vira reprovado).
- Nota vazia → `em_andamento`.
- `trancado`/`em_andamento` não exigem nota; mostrar `—` na lista em vez de `0`.
- No cálculo (`src/lib/ira.ts`) isso já é respeitado: `em_andamento` é ignorado; `trancado` só entra na penalidade de carga horária.

**Passos sugeridos**
1. Criar uma função única (ex.: `situacaoFromGrade` em `src/lib/ira.ts`) e usá-la nos 3 fluxos, em vez de lógica duplicada.
2. Adicionar o seletor de situação no formulário manual.
3. Ajustar validações/desabilitar nota para trancado/em andamento.
4. Cores diferentes por situação no badge.
5. Se possível, testes unitários para a função (o frontend ainda não tem runner; pode usar o do backend como referência ou propor um).

**Pronto quando:** não é possível salvar combinação inválida (ex.: nota 3 + aprovado) em nenhum dos 3 fluxos, e o IRA calculado não muda para casos já corretos (o cálculo foi verificado contra um histórico real: 9,8289).

---

## Tarefa 3 — Povoar o banco com semestres anteriores do SIGAA

Issue #4 · branch: `feat/sigaa-past-semesters-seed`

**Objetivo:** ter `disciplines` e `offerings` de 2025.2, 2025.1 etc., hoje só existe 2026.1 (`backend/src/db/data/sigaa-2026-1.json`).

**Passos**
1. Baixar/salvar a página de turmas do SIGAA (Campus Quixadá) dos 2–3 últimos semestres.
2. Pedir a uma IA (ou script) para extrair para JSON no **mesmo formato** de `sigaa-2026-1.json`:
   ```json
   {
     "disciplines": [
       { "id": "estrutura-de-dados", "code": "QXD0010", "name": "Estrutura de Dados",
         "workload": 64, "semester": "2025.2", "description": "", "prerequisites": [], "accent": "accent" }
     ],
     "offerings": [
       { "disciplineId": "estrutura-de-dados", "professor": "Nome do Professor", "semester": "2025.2" }
     ]
   }
   ```
3. Regras: `id` = nome em kebab-case sem acento e **igual ao id já existente** para a mesma disciplina; `professor` sem títulos, em Title Case (como no JSON atual); sem duplicar `(disciplineId, professor, semester)` (índice único); ignorar turmas sem professor definido.
4. **Conferir o resultado manualmente** (a IA erra acento e nomes; o JSON de 2026.1 foi corrigido à mão por isso).
5. Fazer `seed-disciplines.ts` ler todos os `sigaa-*.json` (hoje lê só o de 2026.1). Como usa `onConflictDoNothing`, é seguro reexecutar.

**Atenção:** em `disciplines`, `semester` é uma coluna única por disciplina. Disciplina que já existe de 2026.1 mantém esse valor (o insert ignora a repetida). Confirmar se isso é aceitável ou se precisa de ajuste.

---

## Tarefa 4 — Ranking de IRA na tela `/ira`

Issue #5 · branch: `feat/ira-ranking`

Seção em `/ira` (`frontend/app/(shell)/ira/page.tsx`, abaixo do comparativo) com o ranking de IRA. A Home fica para depois (feita pelo Warley), então o componente deve receber o IRA por prop e ser reutilizável:

- Escopo: **Global** (todo o campus) ou **Por curso**.
- Toggle "Apenas alunos ativos" (ligado) × todos (desligado).
- Mostra até **5 posições** e, em seguida, a linha do próprio aluno com a posição real, ex.: `40º Você — 9.6`.
- Sem IRA calculado: sem linha "Você", com mensagem orientando a adicionar disciplinas ou importar o histórico.
- Usa os dados reais da Tarefa 1: combinar o formato dos dados com quem fizer a Tarefa 1 antes de começar.
- Só posição e nota, sem nomes. Decidir se as notas exatas do top 5 podem ser públicas (ver a issue).

---

## A confirmar (decisões em aberto)

- **Corte de aprovação:** a regra dita é "< 4 sempre reprovado". O código atual usa 5 como corte na revisão do PDF. Definir qual valor vale entre 4 e o corte de aprovação, e como tratar a situação intermediária (ex.: reprovado por nota vs. aprovado com prova final).
- **Qual curso é "DSI":** nos dados atuais os cursos são Ciência da Computação, Design Digital, Engenharia de Computação, Engenharia de Software, Redes de Computadores e Sistemas de Informação. Confirmar a qual deles os dados já recebidos se referem, pois isso define a chave em `IRA_DISTRIBUTIONS`.
- **Privacidade dos dados do professor:** confirmar com ele o que pode ser publicado (só agregados por curso é o plano).

## Convenções

- Commits no padrão Conventional Commits (`feat(ira): ...`, `fix(...)`).
- Antes de commitar: `cd frontend && npx tsc --noEmit` e `npx oxlint <arquivos alterados>`. O `npm run lint` completo hoje acusa erros preexistentes em outras páginas (hooks após `return`), não relacionados às tarefas acima.
- Backend: `cd backend && npm test`.

