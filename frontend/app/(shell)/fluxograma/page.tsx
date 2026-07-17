'use client';

import '@xyflow/react/dist/style.css';

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { disciplines } from '@/data/mock';
import type { FluxogramaEdge, FluxogramaNode } from '@/data/types';
import { useFluxograma } from '@/lib/fluxogramaStore';
import styles from './Fluxograma.module.css';

const RATING_TONE: Record<string, string> = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2-ink)',
  accent3: 'var(--accent-3)',
  accent4: 'var(--accent-4)',
};

function toFlowNode(n: FluxogramaNode): Node {
  const discipline = n.disciplineId ? disciplines.find((d) => d.id === n.disciplineId) : undefined;
  return {
    id: n.id,
    position: n.position,
    data: { label: n.label },
    type: 'default',
    className: n.kind === 'catalog' ? styles.nodeCatalog : styles.nodeCustom,
    style: discipline ? ({ '--node-accent': RATING_TONE[discipline.accent] } as CSSProperties) : undefined,
  };
}

function toFlowEdge(e: FluxogramaEdge): Edge {
  return { id: e.id, source: e.source, target: e.target, animated: e.origin === 'catalog' };
}

function gridLayout(): FluxogramaNode[] {
  const bySemester = new Map<string, typeof disciplines>();
  for (const d of disciplines) {
    if (!bySemester.has(d.semester)) bySemester.set(d.semester, []);
    bySemester.get(d.semester)!.push(d);
  }
  const nodes: FluxogramaNode[] = [];
  let col = 0;
  for (const [, group] of bySemester) {
    group.forEach((d, row) => {
      nodes.push({
        id: `disc:${d.id}`,
        kind: 'catalog',
        disciplineId: d.id,
        label: d.name,
        position: { x: col * 260, y: row * 110 },
      });
    });
    col += 1;
  }
  return nodes;
}

function FluxogramaCanvas() {
  const { state, hydrated, save } = useFluxograma();
  const { show } = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const syncedFromStorage = useRef(false);

  useEffect(() => {
    if (!hydrated || syncedFromStorage.current) return;
    syncedFromStorage.current = true;
    setNodes(state.nodes.map(toFlowNode));
    setEdges(state.edges.map(toFlowEdge));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const placedDisciplineIds = useMemo(
    () => new Set(nodes.filter((n) => n.id.startsWith('disc:')).map((n) => n.id.slice(5))),
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: false }, eds)),
    [setEdges],
  );

  function addCatalogNode() {
    if (!selectedDiscipline) return;
    const discipline = disciplines.find((d) => d.id === selectedDiscipline);
    if (!discipline) return;
    const id = `disc:${discipline.id}`;
    if (nodes.some((n) => n.id === id)) return;
    setNodes((cur) => [
      ...cur,
      toFlowNode({
        id,
        kind: 'catalog',
        disciplineId: discipline.id,
        label: discipline.name,
        position: { x: 80 + (cur.length % 5) * 220, y: 80 + Math.floor(cur.length / 5) * 130 },
      }),
    ]);
    setSelectedDiscipline('');
  }

  function addCustomNode() {
    if (!customLabel.trim()) return;
    const id = `custom:${Date.now()}`;
    setNodes((cur) => [
      ...cur,
      toFlowNode({
        id,
        kind: 'custom',
        label: customLabel.trim(),
        position: { x: 80 + (cur.length % 5) * 220, y: 80 + Math.floor(cur.length / 5) * 130 },
      }),
    ]);
    setCustomLabel('');
  }

  function quickStart() {
    const seeded = gridLayout();
    setNodes(seeded.map(toFlowNode));
  }

  function handleSave() {
    const nextNodes: FluxogramaNode[] = nodes.map((n) => ({
      id: n.id,
      kind: n.id.startsWith('disc:') ? 'catalog' : 'custom',
      disciplineId: n.id.startsWith('disc:') ? n.id.slice(5) : undefined,
      label: typeof n.data.label === 'string' ? n.data.label : n.id,
      position: n.position,
    }));
    const nextEdges: FluxogramaEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      origin: e.animated ? 'catalog' : 'manual',
    }));
    save({ nodes: nextNodes, edges: nextEdges });
    show('Fluxograma salvo!');
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fluxograma</h1>
          <p className={styles.subtitle}>Monte sua trilha de disciplinas e conecte pré-requisitos. Salvo apenas no seu navegador.</p>
        </div>
        <Button onClick={handleSave}>Salvar</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarField}>
          <SelectField
            label="Adicionar disciplina do catálogo"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
          >
            <option value="">Selecione</option>
            {disciplines
              .filter((d) => !placedDisciplineIds.has(d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </SelectField>
        </div>
        <Button variant="secondary" onClick={addCatalogNode} disabled={!selectedDiscipline}>
          Adicionar nó
        </Button>

        <div className={styles.toolbarField}>
          <TextField label="Nó personalizado" placeholder="Ex: Eletiva livre" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={addCustomNode} disabled={!customLabel.trim()}>
          Adicionar nó
        </Button>

        {hydrated && nodes.length === 0 && (
          <Button variant="ghost" onClick={quickStart}>
            Adicionar todas as disciplinas do catálogo
          </Button>
        )}
      </div>

      <div className={styles.canvasWrap}>
        {!hydrated ? null : nodes.length === 0 ? (
          <div className={styles.emptyState}>
            <span>Nenhum nó ainda — adicione uma disciplina do catálogo ou um nó personalizado para começar.</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export default function Fluxograma() {
  return (
    <ReactFlowProvider>
      <FluxogramaCanvas />
    </ReactFlowProvider>
  );
}
