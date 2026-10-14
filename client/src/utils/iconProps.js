// src/utils/iconProps.js
// One place that decides how every lucide icon in the app is drawn, so
// size and stroke weight stay consistent (no mixing of thick/thin icons).
//   <Package {...ICON} />      - navigation and standalone icons (18px)
//   <Search {...ICON_SM} />    - icons inside buttons, inputs and table cells (16px)

export const ICON = { size: 18, strokeWidth: 1.75, 'aria-hidden': true };
export const ICON_SM = { size: 16, strokeWidth: 1.75, 'aria-hidden': true };
