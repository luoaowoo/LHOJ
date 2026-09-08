# LH-oj Design Baseline

This document records the implemented UI baseline. Stitch resources were not
available during implementation, so values below come from the active MUI
theme and rendered application rather than inferred Stitch measurements.

## Layout

| Item | Implemented value |
| --- | --- |
| Phone navigation | Bottom navigation below 600 px |
| Tablet navigation | 80 px navigation rail from 600 px |
| Desktop navigation | 248 px drawer from 1200 px |
| Collapsed desktop drawer | 80 px |
| Content maximum width | 1280 px |
| Page padding | 14.4 px phone, 20.8 px tablet, 22.4 px desktop |
| Top app bar | 58 px phone, 64 px desktop |
| Minimum touch target | 44 px |
| Base corner radius | 8 px |

## Typography

- Font stack: Inter, PingFang SC, Microsoft YaHei, Segoe UI, sans-serif.
- Body text: 15.04 px with 1.6 line height.
- Dense body text: 13.44 px with 1.55 line height.
- Headings use 650 weight and no negative letter spacing.
- Code uses the platform monospace stack; Markdown code falls back to
  Cascadia Code, JetBrains Mono, and Consolas.

## Color And Surfaces

- Default primary: `#2563eb`, with six user-selectable accent colors.
- Secondary: `#00897b`.
- Success: `#2e7d32`; warning: `#f59e0b`; error: `#dc2626`; info: `#0ea5e9`.
- Light surfaces: `#f4f6fa` background and `#ffffff` paper.
- Dark surfaces: `#15181d` background and `#1d2128` paper.
- Cards and panels use outlined surfaces without decorative shadows.
- Semantic colors come from the MUI theme; feature pages do not define a
  separate design system.

## Components And Motion

- Buttons, icon buttons, toggles, and navigation targets are at least 44 px.
- Cards, list items, buttons, and code blocks use an 8 px radius.
- Chips use a 6 px radius and 28 px height.
- Standard transitions are 160 ms; MUI navigation width transitions use the
  theme default duration.
- `prefers-reduced-motion` reduces animations and transitions to 0.01 ms.
- Keyboard users receive a skip link to `#main-content` and visible native/MUI
  focus indicators.

## Responsive Rules

- Tables keep a stable minimum width and scroll inside their own container.
- Content grids collapse to one column on phones.
- The phone bottom bar reserves safe-area padding.
- Markdown images are responsive; code, formula, and table overflow remains
  locally scrollable instead of widening the page.

## Verification Gap

Pixel comparison against Stitch is pending because no Stitch MCP server or
exported reference screens are available in this workspace. Runtime behavior,
responsive breakpoints, light/dark themes, and reduced-motion behavior remain
the authoritative baseline until those assets are supplied.
