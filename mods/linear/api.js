// Linear API access shared by the panel and the new-issue dialog.
import { exec, home, appHome, readTextFile } from "herdr";
import { API_URL, parseConfig, linearError } from "./linear.js";

export const NO_KEY = "No Linear API key. Add it to ~/.config/herdr-app/linear.json or set LINEAR_API_KEY.";

// LINEAR_API_KEY from the shell agents start in, when linear.json has none.
async function envKey() {
  const r = await exec("sh", ["-c", 'printf %s "$LINEAR_API_KEY"']).catch(() => null);
  return r?.code === 0 && r.stdout.trim() ? r.stdout.trim() : null;
}

export async function loadConfig() {
  const text = await readTextFile(`${appHome()}/linear.json`).catch(() => null);
  const config = parseConfig(text, home());
  if (!config.apiKey && !config.error) config.apiKey = await envKey();
  return config;
}

// One GraphQL request; throws a short message on HTTP or GraphQL errors.
export async function gql(apiKey, query, variables = {}) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(linearError(r.status, body));
  const json = JSON.parse(body);
  const message = json?.errors?.[0]?.extensions?.userPresentableMessage ?? json?.errors?.[0]?.message;
  if (message) throw new Error(message);
  return json.data;
}
