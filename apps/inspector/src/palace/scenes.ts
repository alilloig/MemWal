/**
 * Walrus Memory Palace — scene graph for click-navigation.
 *
 * The palace is a set of first-person "scenes" (rooms). Each scene shows a
 * full-viewport still and a set of clickable hotspots (doorways) that move
 * you to the next room, graphic-adventure style. Namespace rooms are
 * generated on the fly from the account's on-chain namespaces: each
 * namespace hashes to one of six library variants, so every namespace looks
 * different at first sight — the palace remembers where things live.
 */

export type SceneId =
    | "gates"
    | "atrium"
    | "vault"
    | "observatory"
    | "scriptorium"
    | `ns:${string}`;

export interface Hotspot {
    /** Navigation target. */
    to: SceneId;
    label: string;
    /** Position of the hotspot center, in % of the viewport. */
    x: number;
    y: number;
    kind: "door" | "back";
}

export interface SceneDef {
    id: SceneId;
    /** Room name shown in the location chip. */
    name: string;
    still: string;
    accent: string;
    hotspots: Hotspot[];
}

export const LIBRARY_VARIANTS = [
    { key: "glacial", still: "/palace/lib_glacial.webp", accent: "#9BE8FF" },
    { key: "amethyst", still: "/palace/lib_amethyst.webp", accent: "#C4B5FD" },
    { key: "amber", still: "/palace/lib_amber.webp", accent: "#FCD34D" },
    { key: "emerald", still: "/palace/lib_emerald.webp", accent: "#6EE7B7" },
    { key: "rose", still: "/palace/lib_rose.webp", accent: "#F9A8D4" },
    { key: "sapphire", still: "/palace/lib_sapphire.webp", accent: "#93C5FD" },
] as const;

/** Stable namespace → library variant (FNV-1a over the name). */
export function variantFor(namespace: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < namespace.length; i++) {
        h ^= namespace.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return LIBRARY_VARIANTS[(h >>> 0) % LIBRARY_VARIANTS.length];
}

/**
 * Doorway slots around the rotunda wall, left to right — aligned to the seven
 * glowing doors in rotunda.webp.
 */
export const ROTUNDA_SLOTS: Array<{ x: number; y: number }> = [
    { x: 10, y: 62 },
    { x: 25, y: 60 },
    { x: 37.5, y: 59 },
    { x: 50, y: 59 },
    { x: 62, y: 59 },
    { x: 74, y: 60 },
    { x: 90, y: 62 },
];

export const STATIC_SCENES: Record<Exclude<SceneId, `ns:${string}`>, SceneDef> = {
    gates: {
        id: "gates",
        name: "The Gates",
        still: "/palace/gates.webp",
        accent: "#67E8F9",
        hotspots: [],
    },
    atrium: {
        id: "atrium",
        name: "The Atrium",
        still: "/palace/atrium.webp",
        accent: "#A78BFA",
        hotspots: [
            { to: "observatory", label: "Observatory", x: 15, y: 54, kind: "door" },
            { to: "vault", label: "The Vault", x: 50, y: 46, kind: "door" },
            // Sits below the console panel that occupies the upper right.
            { to: "scriptorium", label: "Scriptorium", x: 84, y: 80, kind: "door" },
        ],
    },
    vault: {
        id: "vault",
        name: "The Vault",
        still: "/palace/rotunda.webp",
        accent: "#38BDF8",
        // Namespace doorways are added dynamically per account.
        hotspots: [{ to: "atrium", label: "Atrium", x: 50, y: 92, kind: "back" }],
    },
    observatory: {
        id: "observatory",
        name: "The Observatory",
        still: "/palace/observatory.webp",
        accent: "#F0ABFC",
        hotspots: [{ to: "atrium", label: "Atrium", x: 50, y: 92, kind: "back" }],
    },
    scriptorium: {
        id: "scriptorium",
        name: "The Scriptorium",
        still: "/palace/scriptorium.webp",
        accent: "#FBBF24",
        hotspots: [{ to: "atrium", label: "Atrium", x: 50, y: 92, kind: "back" }],
    },
};

export function namespaceScene(namespace: string): SceneDef {
    const v = variantFor(namespace);
    return {
        id: `ns:${namespace}`,
        name: namespace,
        still: v.still,
        accent: v.accent,
        hotspots: [{ to: "vault", label: "The Vault", x: 50, y: 92, kind: "back" }],
    };
}
