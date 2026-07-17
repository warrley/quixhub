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

const RATING_TONE: Record<string, string> = {
  accent: 'var(--color-accent)',
  accent2: 'var(--color-accent-2-ink)',
  accent3: 'var(--color-accent-3)',
  accent4: 'var(--color-accent-4)',
};

const NODE_CATALOG = 'border-l-4 border-l-[var(--node-accent,var(--color-accent))]';
const NODE_CUSTOM = 'border-dashed text-ink-2';

function toFlowNode(n: FluxogramaNode): Node {
  const discipline = n.disciplineId ? disciplines.find((d) => d.id === n.disciplineId) : undefined;
  return {
    id: n.id,
    position: n.position,
    data: { label: n.label },
    type: 'default',
    className: n.kind === 'catalog' ? NODE_CATALOG : NODE_CUSTOM,
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
      <div className="flex justify-between items-start gap-4 my-2 mb-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-22 mb-1">Fluxograma</h1>
          <p className="text-13 text-ink-2">Monte sua trilha de disciplinas e conecte pré-requisitos. Salvo apenas no seu navegador.</p>
        </div>
        <Button onClick={handleSave}>Salvar</Button>
      </div>

      <div className="flex gap-3 items-end flex-wrap mb-4">
        <div className="min-w-[220px]">
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

        <div className="min-w-[220px]">
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

      <div className="h-[62vh] min-h-[420px] rounded-lg border border-line overflow-hidden bg-surface-sunken">
        {!hydrated ? null : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-ink-3 text-13">
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
