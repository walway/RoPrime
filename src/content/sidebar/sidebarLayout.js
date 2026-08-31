export const SIDEBAR_FULL_WIDTH_PX = 289;
export const SIDEBAR_FULL_TOUCH_PADDING_PX = 20;
export const SIDEBAR_FULL_RESERVED_PX =
  SIDEBAR_FULL_WIDTH_PX + SIDEBAR_FULL_TOUCH_PADDING_PX;

export function buildSidebarFullLayoutCss() {
  return `
.rollercoaster-background {
  margin-left: ${SIDEBAR_FULL_RESERVED_PX}px !important;
}
.left-nav {
  padding-right: ${SIDEBAR_FULL_TOUCH_PADDING_PX}px !important;
  box-sizing: border-box !important;
}
.left-nav.fixed {
  width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
  min-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
  max-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
.left-nav.fixed .simplebar-wrapper,
.left-nav.fixed .simplebar-mask,
.left-nav.fixed .simplebar-offset,
.left-nav.fixed .simplebar-content-wrapper,
.left-nav.fixed .simplebar-content {
  max-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
`.trim();
}
