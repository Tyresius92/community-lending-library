import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type {
  Breakpoint,
  ColorOption,
  SpaceOption,
} from "../_global_styles/types";

import styles from "./box.module.css";

type SpacingBreakpoint = "xs" | Breakpoint;

const BREAKPOINT_ORDER: readonly SpacingBreakpoint[] = [
  "xs",
  "s",
  "m",
  "l",
  "xl",
];

type SpaceProp = SpaceOption | Partial<Record<SpacingBreakpoint, SpaceOption>>;

type SpacingSide =
  | "pl"
  | "pr"
  | "pt"
  | "pb"
  | "ml"
  | "mr"
  | "mt"
  | "mb"
  | "row-gap"
  | "col-gap";
type SpacingVar = `--box-${SpacingSide}-${SpacingBreakpoint}`;
type BoxCSSProperties = CSSProperties & Partial<Record<SpacingVar, string>>;

interface BaseBoxProps
  extends Pick<HTMLAttributes<HTMLElement>, "id" | "role"> {
  children?: ReactNode;
  as?: "div" | "article" | "section";

  p?: SpaceProp;
  px?: SpaceProp;
  py?: SpaceProp;
  pt?: SpaceProp;
  pb?: SpaceProp;
  pl?: SpaceProp;
  pr?: SpaceProp;

  m?: SpaceProp;
  mx?: SpaceProp;
  my?: SpaceProp;
  mt?: SpaceProp;
  mb?: SpaceProp;
  ml?: SpaceProp;
  mr?: SpaceProp;

  gap?: SpaceProp;
  rowGap?: SpaceProp;
  columnGap?: SpaceProp;

  bg?: ColorOption;
  color?: ColorOption;

  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?:
    | "auto"
    | "flex-start"
    | "flex-end"
    | "center"
    | "baseline"
    | "stretch";
}

interface BlockBoxProps extends BaseBoxProps {
  display?: "block";
}

interface FlexBoxProps extends BaseBoxProps {
  display: "flex";
  flexDirection?: "row" | "row-reverse" | "column" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "flex-end" | "center" | "baseline";
  alignContent?:
    | "stretch"
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around";
}

export type BoxProps = BlockBoxProps | FlexBoxProps;

function toBreakpointMap(
  value: SpaceProp | undefined,
): Partial<Record<SpacingBreakpoint, SpaceOption>> | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === "number" ? { xs: value } : value;
}

function sv(value: SpaceOption | undefined): string | undefined {
  return value !== undefined ? `var(--space-${value})` : undefined;
}

export const Box = (props: BoxProps) => {
  const {
    id,
    role,
    children,
    as = "div",

    p,
    px,
    py,
    pt,
    pb,
    pl,
    pr,

    m,
    mx,
    my,
    mt,
    mb,
    ml,
    mr,

    gap,
    rowGap,
    columnGap,

    bg,
    color,

    flexGrow,
    flexShrink,
    flexBasis,
    alignSelf,
  } = props;

  const Tag = as;

  const pMap = toBreakpointMap(p);
  const pxMap = toBreakpointMap(px);
  const pyMap = toBreakpointMap(py);
  const ptMap = toBreakpointMap(pt);
  const pbMap = toBreakpointMap(pb);
  const plMap = toBreakpointMap(pl);
  const prMap = toBreakpointMap(pr);

  const mMap = toBreakpointMap(m);
  const mxMap = toBreakpointMap(mx);
  const myMap = toBreakpointMap(my);
  const mtMap = toBreakpointMap(mt);
  const mbMap = toBreakpointMap(mb);
  const mlMap = toBreakpointMap(ml);
  const mrMap = toBreakpointMap(mr);

  const gapMap = toBreakpointMap(gap);
  const rowGapMap = toBreakpointMap(rowGap);
  const columnGapMap = toBreakpointMap(columnGap);

  const spacingVars: Partial<Record<SpacingVar, string>> = Object.fromEntries(
    BREAKPOINT_ORDER.flatMap((bp) => {
      const pxVal = pxMap?.[bp] ?? pMap?.[bp];
      const pyVal = pyMap?.[bp] ?? pMap?.[bp];
      const mxVal = mxMap?.[bp] ?? mMap?.[bp];
      const myVal = myMap?.[bp] ?? mMap?.[bp];
      const gapVal = gapMap?.[bp];

      const entries: [SpacingVar, string | undefined][] = [
        [`--box-pl-${bp}`, sv(plMap?.[bp] ?? pxVal)],
        [`--box-pr-${bp}`, sv(prMap?.[bp] ?? pxVal)],
        [`--box-pt-${bp}`, sv(ptMap?.[bp] ?? pyVal)],
        [`--box-pb-${bp}`, sv(pbMap?.[bp] ?? pyVal)],
        [`--box-ml-${bp}`, sv(mlMap?.[bp] ?? mxVal)],
        [`--box-mr-${bp}`, sv(mrMap?.[bp] ?? mxVal)],
        [`--box-mt-${bp}`, sv(mtMap?.[bp] ?? myVal)],
        [`--box-mb-${bp}`, sv(mbMap?.[bp] ?? myVal)],
        [`--box-row-gap-${bp}`, sv(rowGapMap?.[bp] ?? gapVal)],
        [`--box-col-gap-${bp}`, sv(columnGapMap?.[bp] ?? gapVal)],
      ];

      return entries.filter(
        (entry): entry is [SpacingVar, string] => entry[1] !== undefined,
      );
    }),
  );

  const hasSpacing = Object.keys(spacingVars).length > 0;

  const style: BoxCSSProperties = {
    ...spacingVars,
    ...(bg && { backgroundColor: `var(--color-${bg})` }),
    ...(color && { color: `var(--color-${color})` }),
    ...(flexGrow !== undefined && { flexGrow }),
    ...(flexShrink !== undefined && { flexShrink }),
    ...(flexBasis !== undefined && { flexBasis }),
    ...(alignSelf && { alignSelf }),
    ...(props.display === "flex"
      ? {
          display: "flex",
          ...(props.flexDirection && { flexDirection: props.flexDirection }),
          ...(props.flexWrap && { flexWrap: props.flexWrap }),
          ...(props.justifyContent && {
            justifyContent: props.justifyContent,
          }),
          ...(props.alignItems && { alignItems: props.alignItems }),
          ...(props.alignContent && { alignContent: props.alignContent }),
        }
      : {}),
  };

  return (
    <Tag
      id={id}
      role={role}
      className={hasSpacing ? styles.box : undefined}
      style={style}
    >
      {children}
    </Tag>
  );
};
