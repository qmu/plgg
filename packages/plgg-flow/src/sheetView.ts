import { drawFlow } from "plgg-flow/viewport";
import { movingRooms } from "plgg-flow/roomCamera";
import { spaceScenery } from "plgg-flow/roomView";
import { plotScenery } from "plgg-flow/plot";
export const flowView = (
  ...args: Parameters<typeof drawFlow>
) => {
  const [flow, label, registry] = args;
  if (flow.plot)
    return drawFlow(
      {
        ...flow,
        showWorldGrid: false,
        scenery: [
          ...plotScenery(flow.plot, flow.nodes),
          ...(flow.scenery ?? []),
        ],
      },
      label,
      registry,
    );
  if (!flow.rooms)
    return drawFlow(flow, label, registry);
  const state = movingRooms(flow);
  return drawFlow(
    {
      ...state,
      showWorldGrid: false,
      scenery: [
        ...spaceScenery(state.rooms!, state),
        ...(state.scenery ?? []),
      ],
    },
    label,
    registry,
  );
};
