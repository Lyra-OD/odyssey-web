/** Craft defaults — constellation slots + bridge families (lab onglet 2). */

export type SlotStarsCraft = {
  sizeBright: number;
  sizeMedium: number;
  sizeDim: number;
  glow: number;
  breath: number;
  ghostSize: number;
  ghostDim: number;
};

export type BridgeLineStyle = "solid" | "dotted" | "dashed" | "glow";

export type BridgeFamilyCraft = {
  style: BridgeLineStyle;
  width: number;
  opacity: number;
  /** solid / dotted / dashed */
  color: string;
  /** glow — noyau */
  coreColor: string;
  /** glow — halo */
  haloColor: string;
};

export type BridgesCraft = {
  major: BridgeFamilyCraft;
  minor: BridgeFamilyCraft;
};

export const DEFAULT_SLOT_STARS: SlotStarsCraft = {
  sizeBright: 1.2,
  sizeMedium: 1.1,
  sizeDim: 1,
  glow: 1,
  breath: 1,
  ghostSize: 1,
  ghostDim: 1,
};

export const DEFAULT_BRIDGE_MAJOR: BridgeFamilyCraft = {
  style: "solid",
  width: 1,
  opacity: 1,
  color: "#5eead4",
  coreColor: "#ccfbf1",
  haloColor: "#5eead4",
};

export const DEFAULT_BRIDGE_MINOR: BridgeFamilyCraft = {
  style: "solid",
  width: 0.65,
  opacity: 0.85,
  color: "#5eead4",
  coreColor: "#99f6e4",
  haloColor: "#2dd4bf",
};

export const DEFAULT_BRIDGES: BridgesCraft = {
  major: DEFAULT_BRIDGE_MAJOR,
  minor: DEFAULT_BRIDGE_MINOR,
};
