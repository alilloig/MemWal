import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTALLER = resolve(__dirname, "../plugin/scripts/install_codex_hooks.mjs");

test("Codex hook installer forces npx to use the published MCP package", (t) => {
    const home = mkdtempSync(join(tmpdir(), "memwal-codex-hooks-"));
    t.after(() => rmSync(home, { recursive: true, force: true }));

    const result = spawnSync(process.execPath, [INSTALLER], {
        encoding: "utf8",
        env: { ...process.env, HOME: home, USERPROFILE: home },
    });

    assert.equal(result.status, 0, result.stderr);

    const configPath = join(home, ".codex", "config.toml");
    assert.equal(existsSync(configPath), true, "installer should create config.toml");
    assert.match(
        readFileSync(configPath, "utf8"),
        /\[mcp_servers\.memwal\]\ncommand = "npx"\nargs = \["-y", "@mysten-incubation\/memwal-mcp@latest"\]/,
    );
});
