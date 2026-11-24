import { drawFlow } from "plgg-flow/viewport";
import { movingRooms } from "plgg-flow/roomCamera";
import { spaceScenery } from "plgg-flow/roomView";
export const flowView = (
  ...args: Parameters<typeof drawFlow>
) => {
  const [flow, label, registry] = args;
  if (!flow.rooms)
    return drawFlow(flow, label, registry);
  const state = movingRooms(flow);
  return drawFlow(
    {
      ...state,
      scenery: [
        ...spaceScenery(state.rooms!, state),
        ...(state.scenery ?? []),
      ],
    },
    label,
    registry,
  );
};
