import { PathLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Agent, Scenario } from "../../app/types";

export function makePathsLayer(agents: Agent[], nodes: Scenario["nodes"]): Layer[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));

    // 只要状态是 moving，且有路径的 agent
    const movingAgents = agents.filter(
        (a) => a.status === "moving" && (a.path?.length ?? 0) > 0
    );

    const pathData = movingAgents.map((agent) => {
        const path = agent.path ?? [];
        const startIndex = agent.pathIndex ?? 0;
        // 路径坐标：从 agent 当前位置开始，连接剩余的所有目标节点
        const coords: [number, number][] = [[agent.lng, agent.lat]];

        for (let i = startIndex; i < path.length; i += 1) {
            const nodeId = path[i];
            const node = nodeId ? nodeMap.get(nodeId) : undefined;
            if (node) {
                coords.push([node.lng, node.lat]);
            }
        }

        // 颜色区分：
        // 引导员 = 绿色显眼，跟着引导员的居民 = 绿色半透明，自己找路的居民 = 蓝色半透明
        const color: [number, number, number, number] =
            agent.kind === "guide"
                ? [16, 185, 129, 200]
                : agent.followingGuideId
                    ? [16, 185, 129, 80]
                    : [37, 99, 235, 80];

        return {
            path: coords,
            color,
            width: agent.kind === "guide" ? 4 : 2,
        };
    });

    return [
        new PathLayer({
            id: "agent-paths",
            data: pathData,
            getPath: (d: any) => d.path,
            getColor: (d: any) => d.color,
            getWidth: (d: any) => d.width,
            widthUnits: "pixels",
            widthMinPixels: 1,
            jointRounded: true,
            capRounded: true,
            parameters: { depthTest: false } as any,
        }) as any,
    ];
}
