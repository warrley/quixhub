import 'dotenv/config';
import { db } from './client.js';
import { disciplines } from './schema.js';

// Mirrors frontend/src/data/mock.ts so local dev has the same catalog
// whether pointed at the mock data or the real API.
const CATALOG = [
  {
    id: 'estrutura-de-dados',
    code: 'QXD0248',
    name: 'Estrutura de Dados',
    professor: 'David Sena Oliveira',
    workload: 64,
    semester: '2025.2',
    description: 'Listas, pilhas, filas, árvores, grafos e análise de complexidade de algoritmos.',
    prerequisites: ['Introdução à Programação'],
    accent: 'accent' as const,
  },
  {
    id: 'banco-de-dados',
    code: 'QXD0251',
    name: 'Fundamentos de Banco de Dados',
    professor: 'Francisco Victor da Silva Pinheiro',
    workload: 64,
    semester: '2025.2',
    description: 'Modelagem relacional, SQL, normalização e transações.',
    prerequisites: ['Estrutura de Dados'],
    accent: 'accent2' as const,
  },
  {
    id: 'sistemas-operacionais',
    code: 'QXD0253',
    name: 'Sistemas Operacionais',
    professor: 'Pedro Henrique Magalhães Botelho',
    workload: 64,
    semester: '2025.2',
    description: 'Processos, threads, escalonamento, memória e sistemas de arquivos.',
    prerequisites: ['Arquitetura de Computadores'],
    accent: 'accent3' as const,
  },
  {
    id: 'linguagens-de-programacao',
    code: 'QXD0260',
    name: 'Linguagens de Programação',
    professor: 'Lucas I. Bezerra Freitas',
    workload: 64,
    semester: '2025.2',
    description: 'Paradigmas de programação, semântica formal e implementação de interpretadores.',
    prerequisites: ['Estrutura de Dados'],
    accent: 'accent4' as const,
  },
  {
    id: 'programacao-funcional',
    code: 'QXD0262',
    name: 'Programação Funcional',
    professor: 'Ricardo Reis Pereira',
    workload: 32,
    semester: '2025.2',
    description: 'Funções puras, imutabilidade, recursão e tipos algébricos com Haskell.',
    prerequisites: ['Linguagens de Programação'],
    accent: 'accent' as const,
  },
  {
    id: 'requisitos-de-software',
    code: 'QXD0270',
    name: 'Requisitos de Software',
    professor: 'Rainara Maia Carvalho',
    workload: 64,
    semester: '2025.2',
    description: 'Elicitação, especificação, validação e gestão de requisitos.',
    prerequisites: ['Engenharia de Software I'],
    accent: 'accent2' as const,
  },
];

await db.insert(disciplines).values(CATALOG).onConflictDoNothing({ target: disciplines.id });
console.log(`Seeded ${CATALOG.length} disciplines (existing rows left untouched).`);
process.exit(0);
