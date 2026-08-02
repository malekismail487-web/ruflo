export type KnowledgeNodeKind = "TASK" | "FILE" | "CLASS" | "FUNCTION" | "API" | "DEPENDENCY" | "TEST" | "DOC" | "ASSET";
export type KnowledgeEdgeKind = "DEPENDS_ON" | "CALLS" | "TESTS" | "IMPLEMENTS" | "DOCUMENTS" | "PRODUCES";

export interface KnowledgeNode {
    id: string;
    kind: KnowledgeNodeKind;
    name: string;
    filePath?: string;
    metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
    sourceId: string;
    targetId: string;
    kind: KnowledgeEdgeKind;
}

export class ProjectKnowledgeGraph {
    private nodes: Map<string, KnowledgeNode> = new Map();
    private edges: KnowledgeEdge[] = [];

    addNode(node: KnowledgeNode): KnowledgeNode {
        this.nodes.set(node.id, node);
        return node;
    }

    addEdge(sourceId: string, targetId: string, kind: KnowledgeEdgeKind): KnowledgeEdge {
        const edge: KnowledgeEdge = { sourceId, targetId, kind };
        this.edges.push(edge);
        return edge;
    }

    getNode(id: string): KnowledgeNode | undefined {
        return this.nodes.get(id);
    }

    queryGraph(kind?: KnowledgeNodeKind, searchTerm?: string): KnowledgeNode[] {
        let results = Array.from(this.nodes.values());
        if (kind) {
            results = results.filter(n => n.kind === kind);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(n => n.name.toLowerCase().includes(term) || (n.filePath && n.filePath.toLowerCase().includes(term)));
        }
        return results;
    }

    getRelatedNodes(nodeId: string, edgeKind?: KnowledgeEdgeKind): KnowledgeNode[] {
        const matchingEdges = this.edges.filter(e => e.sourceId === nodeId && (!edgeKind || e.kind === edgeKind));
        const relatedIds = new Set(matchingEdges.map(e => e.targetId));
        return Array.from(relatedIds).map(id => this.nodes.get(id)!).filter(Boolean);
    }

    getStats(): { totalNodes: number; totalEdges: number; nodeKinds: Record<string, number> } {
        const nodeKinds: Record<string, number> = {};
        for (const node of this.nodes.values()) {
            nodeKinds[node.kind] = (nodeKinds[node.kind] || 0) + 1;
        }
        return {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.length,
            nodeKinds
        };
    }
}

export const projectKnowledgeGraph = new ProjectKnowledgeGraph();
