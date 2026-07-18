import { type SoftStr } from "plgg";

/**
 * The demo dataset: field notes grouped into sections.
 * Pure data — the app is a browser over it. Everything
 * else (columns, selection, scheme) is derived state.
 */
export type Note = Readonly<{
  id: SoftStr;
  title: SoftStr;
  body: ReadonlyArray<SoftStr>;
}>;

export type Section = Readonly<{
  id: SoftStr;
  label: SoftStr;
  notes: ReadonlyArray<Note>;
}>;

export const sections: ReadonlyArray<Section> = [
  {
    id: "botany",
    label: "Botany",
    notes: [
      {
        id: "moss",
        title: "Moss on the north face",
        body: [
          "The retaining wall's north face carries a continuous moss mat; the south face is bare.",
          "Moisture, not light, appears to be the deciding variable — the mat follows the drainage seam.",
        ],
      },
      {
        id: "maple",
        title: "Maple seedlings in the gutter",
        body: [
          "Six seedlings rooted in composted leaf litter, all first-year.",
          "The gutter is effectively a nursery bed: shaded, damp, and undisturbed.",
        ],
      },
      {
        id: "lichen",
        title: "Lichen ring dating",
        body: [
          "The largest ring on the bench stone measures 92mm across.",
          "At the usual growth rate that puts colonization near the bench's installation year.",
        ],
      },
    ],
  },
  {
    id: "geology",
    label: "Geology",
    notes: [
      {
        id: "strata",
        title: "Cut-bank strata",
        body: [
          "The stream's cut bank exposes three clear bands: topsoil, red clay, and a gravel lens.",
          "The gravel lens carries water after rain — the seep line marks its lower boundary.",
        ],
      },
      {
        id: "erratic",
        title: "The erratic by the gate",
        body: [
          "A rounded granite boulder in a landscape of sedimentary rock.",
          "Nothing nearby could have produced it; it was carried here, most plausibly by ice.",
        ],
      },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    notes: [
      {
        id: "fog",
        title: "Fog pooling in the hollow",
        body: [
          "On still mornings the fog fills the hollow to a consistent height, like water.",
          "The tree line marks the inversion layer almost exactly.",
        ],
      },
      {
        id: "frost",
        title: "First frost map",
        body: [
          "Frost lands first on the open lawn, last under the oak canopy.",
          "The canopy's outline is legible in the frost pattern a full hour after sunrise.",
        ],
      },
    ],
  },
];
