// The `Space` button's popup: what a new space for the issue starts with.
// Opened by the panel as an overlay of this same mod with props { dialog: "space", name, folder }.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, props, closeOverlay, theme } from "herdr";

const ROW = 31, PADDING = 5;
const CHOICES = [
  { id: "terminal", label: "Terminal", icon: "icons/shell.svg" },
  { id: "claude", label: "claude", icon: "icons/claude.svg", argv: ["claude"] },
];

export const MENU_WIDTH = 170;
export const MENU_HEIGHT = CHOICES.length * ROW + PADDING * 2;

export class SpaceMenu {
  open({ argv }) {
    const { name, folder, overlay } = props();
    closeOverlay(overlay);
    run("space.new", { name, ...(folder ? { folder } : {}), ...(argv ? { argv } : {}) });
  }

  render() {
    const t = theme();
    return v_flex().id("linear-space-menu").size_full().p(PADDING).bg(t.popover).text_color(t.foreground).text_size(12.8)
      .children(CHOICES.map((c) => h_flex().id(`space-${c.id}`).h(ROW).px(9).gap(10).flex_none().items_center()
        .rounded(7).cursor_pointer().hover((s) => s.bg(t.selected)).on_click(() => this.open(c))
        .child(svg(c.icon).size(14).text_color(t.foreground)).child(div().flex_1().child(c.label))));
  }
}
