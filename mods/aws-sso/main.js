// Status bar item: how long until the AWS SSO session expires. Click to run `aws sso login`.
// Reads only `expiresAt` from ~/.aws/sso/cache/*.json; tokens are never shown or sent anywhere.
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, readTextFile, run, theme, home } from "herdr";

const CHECK_MS = 60000;
const WARN_MS = 60 * 60 * 1000;

// The latest expiry among cached SSO access tokens (not client registrations), or null.
async function readExpiry() {
  const dir = `${home()}/.aws/sso/cache`;
  const r = await exec("ls", [dir]).catch(() => null);
  if (r?.code !== 0) return null;
  let latest = null;
  for (const name of r.stdout.split("\n").filter((n) => n.endsWith(".json"))) {
    const text = await readTextFile(`${dir}/${name}`).catch(() => null);
    let json;
    try { json = JSON.parse(text); } catch { continue; }
    if (!json?.accessToken || !json?.startUrl || !json?.expiresAt) continue;
    const at = Date.parse(json.expiresAt);
    if (!Number.isNaN(at) && (latest === null || at > latest)) latest = at;
  }
  return latest;
}

function remaining(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default class AwsSso extends View {
  init(_props, cx) {
    this.expiresAt = undefined;
    this.check(cx);
    cx.timer.every(CHECK_MS, (cx) => this.check(cx));
  }

  check(cx) {
    cx.spawn(async (cx) => {
      this.expiresAt = await readExpiry().catch(() => null);
      cx.notify();
    });
  }

  login(cx) {
    run("tab.new", { name: "AWS login", argv: ["aws", "sso", "login"] });
    for (const ms of [20000, 60000, 180000]) cx.timer.after(ms, (cx) => this.check(cx));
  }

  render() {
    const t = theme();
    const left = this.expiresAt ? this.expiresAt - Date.now() : null;
    let dot = t.dim, text = "AWS …";
    if (this.expiresAt === null || (left !== null && left <= 0)) { dot = t.ansi1; text = "AWS expired · log in"; }
    else if (left !== null) { dot = left < WARN_MS ? t.ansi3 : t.ansi2; text = `AWS ${remaining(left)}`; }
    return h_flex().id("aws-sso").size_full().px(14).gap(6).items_center().justify_end().cursor_pointer()
      .bg(t.chrome).border_t(1).border_color(t.border).text_size(11.8).text_color(t.muted)
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => this.login(cx))
      .child(div().size(6).rounded(3).bg(dot))
      .child(text);
  }
}
