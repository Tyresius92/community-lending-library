import type { colors } from "./colors";

export type FontSizeOption =
  | 12
  | 14
  | 16
  | 18
  | 20
  | 24
  | 30
  | 36
  | 48
  | 60
  | 72
  | 88;

export type SpaceOption =
  | 0
  | 1
  | 2
  | 4
  | 6
  | 8
  | 10
  | 12
  | 14
  | 16
  | 20
  | 24
  | 28
  | 32
  | 36
  | 40
  | 44
  | 48
  | 56
  | 64
  | 80
  | 96
  | 112
  | 128
  | 144
  | 160
  | 176
  | 192
  | 208
  | 224
  | 240
  | 256
  | 288
  | 320
  | 384;

export type ColorOption = keyof typeof colors;

export interface StrokeValue {
  color: ColorOption;
  width?: 1 | 2 | 3;
  style?: "solid" | "dotted" | "dashed";
}

export const BREAKPOINTS = {
  s: 480,
  m: 768,
  l: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
