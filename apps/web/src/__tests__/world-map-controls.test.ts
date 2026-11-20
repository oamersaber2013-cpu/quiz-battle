import { createElement } from "react";
import { WorldMap } from "@/components/WorldMap";

const imageAnchors = [[177, 267], [191, 371], [193, 446], [282, 520], [327, 586], [300, 687], [274, 703], [475, 299], [488, 341], [513, 319], [570, 422], [506, 506], [549, 551], [550, 655], [627, 609], [745, 225], [774, 371], [716, 458], [887, 388], [878, 637]];

const { act, create } = require("react-test-renderer");
jest.mock("framer-motion", () => ({ motion: { div: "div" } }));
jest.mock("@/components/WorldMap.module.css", () => new Proxy({}, { get: (_target, name) => String(name) }));

it("anchors all twenty countries to the actual image and connects displaced buttons to their anchors", () => {
  let rendered: any;
  act(() => {
    rendered = create(createElement(WorldMap, {
      territories: Object.fromEntries(imageAnchors.map((_point, id) => [String(id), null])),
      fortTerritoryId: {}, playerColors: {}, currentPlayerId: "me", isMyTurn: true,
      phase: "draft_selection", language: "ar",
    }));
  });
  imageAnchors.forEach(([x, y], id) => {
    const anchor = rendered.root.findByProps({ "data-territory-anchor": String(id) });
    expect(anchor.props.cx).toBe(x);
    expect(anchor.props.cy).toBe(y);
  });
  const france = rendered.root.findByProps({ "data-territory-leader": "8" });
  expect(france.props).toMatchObject({ x1: 488, y1: 341, x2: 470, y2: 363 });
  act(() => rendered.unmount());
});

it("offers localized native territory buttons only for server-selectable territories", () => {
  const onTerritoryClick = jest.fn();
  let rendered: any;
  act(() => {
    rendered = create(createElement(WorldMap, {
      territories: { "0": null, "1": null }, fortTerritoryId: {}, playerColors: {},
      currentPlayerId: "player-1", isMyTurn: true, phase: "draft_selection",
      language: "ar", availableTerritories: ["1"], onTerritoryClick,
    }));
  });
  const canada = rendered.root.findByProps({ "aria-label": "كندا" });
  const usa = rendered.root.findByProps({ "aria-label": "الولايات المتحدة" });
  expect(canada.type).toBe("button");
  expect(canada.props.disabled).toBe(true);
  expect(usa.type).toBe("button");
  expect(usa.props.disabled).toBe(false);
  act(() => usa.props.onClick());
  expect(onTerritoryClick).toHaveBeenCalledWith("1");
  act(() => rendered.unmount());
});

it("shows troop counts and lets the current Invasion player reinforce an owned country", () => {
  const pick = jest.fn();
  let rendered: any;
  act(() => {
    rendered = create(createElement(WorldMap, {
      territories: { "0": "me", "1": "other" }, fortTerritoryId: {}, playerColors: { me: "#fff", other: "#eee" },
      currentPlayerId: "me", isMyTurn: true, phase: "invasion_selection", troops: { "0": 100, "1": 50 },
      language: "ar", availableTerritories: ["0"], onTerritoryClick: pick,
    }));
  });
  const own = rendered.root.findByProps({ "aria-label": "كندا" });
  expect(own.props["aria-description"]).toContain("100");
  expect(own.props.disabled).toBe(false);
  expect(rendered.root.findByProps({ "aria-label": "الولايات المتحدة" }).props.disabled).toBe(true);
  act(() => own.props.onClick());
  expect(pick).toHaveBeenCalledWith("0");
  act(() => rendered.unmount());
});
