import { createElement } from "react";
import { RoomPasswordPrompt } from "@/components/RoomPasswordPrompt";

const { act, create } = require("react-test-renderer");
jest.mock("@/components/account/AccountShell", () => ({
  AccountShell: ({ children }: { children: React.ReactNode }) => children,
}));

it("lets a player correct a rejected password and hides its value during submission", () => {
  const onSubmit = jest.fn();
  const props = { language: "en" as const, error: null as string | null, pending: false, onSubmit, onCancel: jest.fn() };
  let view: any;
  act(() => { view = create(createElement(RoomPasswordPrompt, props)); });
  const input = () => view.root.findByType("input");
  const type = (value: string) => act(() => input().props.onChange({ target: { value } }));
  const submit = () => act(() => view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }));
  const toggle = () => view.root.findByProps({ "aria-controls": "room-password" });

  type(" incorrect ");
  act(() => toggle().props.onClick());
  expect(input().props.type).toBe("text");
  submit();
  expect(input().props.type).toBe("password");
  expect(onSubmit).toHaveBeenCalledWith(" incorrect ");

  act(() => view.update(createElement(RoomPasswordPrompt, { ...props, error: "Incorrect room password." })));
  expect(input().props.value).toBe(" incorrect ");
  expect(input().props["aria-invalid"]).toBe(true);
  expect(input().props["aria-describedby"]).toBe(view.root.findByProps({ role: "alert" }).props.id);
  type(" corrected ");
  expect(input().props["aria-invalid"]).toBe(false);
  submit();
  expect(onSubmit).toHaveBeenLastCalledWith(" corrected ");
  act(() => view.unmount());
});
