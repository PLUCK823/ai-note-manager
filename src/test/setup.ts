import "@testing-library/jest-dom/vitest";
import { mockConvertFileSrc } from "@tauri-apps/api/mocks";

mockConvertFileSrc("macos");

const emptyRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

Range.prototype.getBoundingClientRect = () => emptyRect;
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
