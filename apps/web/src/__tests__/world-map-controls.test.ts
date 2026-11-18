import { createElement } from "react";
import { WorldMap } from "@/components/WorldMap";

const { act, create } = require("react-test-renderer");
jest.mock("framer-motion", () => ({ motion: { div: "div" } }));
jest.mock("@/components/WorldMap.module.css", () => new Proxy({}, { get: (_target, name) => String(name) }));

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
