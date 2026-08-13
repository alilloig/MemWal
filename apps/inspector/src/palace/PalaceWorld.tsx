/**
 * PalaceWorld — mounts the scroll-world flight (crystal memory palace) and
 * hosts the live "console" React layer on top of it.
 *
 * The scrub engine is vanilla JS that owns its own DOM inside `hostRef`;
 * React never reconciles inside that container. The interactive inspector
 * panels live in a separate fixed layer (`.palace-console`) that swaps with
 * the active room, driven by the engine's `sw:section` event.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { mountScrollWorld, type ScrollWorldSection } from "./scrub-engine";
import "./palace.css";

const A = {
    gates: "#67E8F9",
    atrium: "#A78BFA",
    vault: "#38BDF8",
    observatory: "#F0ABFC",
    scriptorium: "#FBBF24",
};

export const ROOMS: ScrollWorldSection[] = [
    {
        id: "gates",
        label: "Gates",
        still: "/palace/gates.webp",
        clip: "/palace/gates.mp4",
        accent: A.gates,
        scroll: 1.5,
        linger: 0.35,
        eyebrow: "Walrus Memory",
        title: "The Memory Palace.",
        body: "Every memory your agent keeps, kept in crystal. Connect with one click and step inside — your delegate key never leaves this browser.",
        tags: ["zkLogin", "SEAL-encrypted", "On-chain"],
    },
    {
        id: "atrium",
        label: "Atrium",
        still: "/palace/atrium.webp",
        clip: "/palace/atrium.mp4",
        accent: A.atrium,
        scroll: 1.3,
        linger: 0.4,
        eyebrow: "The Atrium",
        title: "One account, on-chain.",
        body: "The palace rests on a MemWalAccount object on Sui. Its owner, its delegate keys, and every shard it holds are public record — only the contents are sealed.",
        tags: ["health()", "MemWalAccount"],
    },
    {
        id: "vault",
        label: "Vault",
        still: "/palace/vault.webp",
        clip: "/palace/vault.mp4",
        accent: A.vault,
        scroll: 1.7,
        linger: 0.45,
        eyebrow: "The Vault",
        title: "Sealed in crystal.",
        body: "Each shard is a Walrus blob you own, inventoried straight from Sui and organized by its metadata. Contents stay SEAL-encrypted until you ask the relayer to reveal them.",
        tags: ["listOwnedObjects", "memwal_* metadata", "recall() join"],
    },
    {
        id: "observatory",
        label: "Observatory",
        still: "/palace/observatory.webp",
        clip: "/palace/observatory.mp4",
        accent: A.observatory,
        scroll: 1.4,
        linger: 0.4,
        eyebrow: "The Observatory",
        title: "Ask the light.",
        body: "recall() is the palace's only lens: it embeds your question, finds the shards that resonate, and decrypts them server-side — nothing else can read them.",
        tags: ["recall()", "vector search"],
    },
    {
        id: "scriptorium",
        label: "Scriptorium",
        still: "/palace/scriptorium.webp",
        clip: "/palace/scriptorium.mp4",
        accent: A.scriptorium,
        scroll: 1.6,
        linger: 0.45,
        eyebrow: "The Scriptorium",
        title: "Inscribe a new memory.",
        body: "remember() carves a new shard: embedded, SEAL-encrypted, stored on Walrus, certified on Sui. analyze() distills facts; restore() re-lights the index from the chain.",
        tags: ["remember()", "analyze()", "restore()"],
    },
];

interface Props {
    /** Rendered inside the fixed console layer, swapped per active room. */
    console: ReactNode;
    /** Extra fixed top-right chrome (settings / disconnect buttons). */
    topRight?: ReactNode;
    onRoomChange?: (index: number) => void;
}

export function PalaceWorld({ console: consolePanel, topRight, onRoomChange }: Props) {
    const hostRef = useRef<HTMLDivElement>(null);
    const consoleRef = useRef<HTMLElement>(null);
    const [room, setRoom] = useState(0);

    // Retrigger the console's entrance animation on every room change without
    // remounting its children (panel state must survive the walk).
    useEffect(() => {
        const el = consoleRef.current;
        if (!el) return;
        el.classList.remove("palace-console--enter");
        // force reflow so the animation restarts
        void el.offsetWidth;
        el.classList.add("palace-console--enter");
    }, [room]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host || host.dataset.swMounted) return;
        host.dataset.swMounted = "1";
        mountScrollWorld(host, {
            brand: { name: "Walrus Memory · Inspector", href: "#" },
            hint: "scroll to enter",
            diveScroll: 1.4,
            crossfade: 0.1,
            sections: ROOMS,
            connectors: [],
        });
    }, []);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const onSection = (e: Event) => {
            const idx = (e as CustomEvent<{ index: number }>).detail.index;
            setRoom(idx);
            onRoomChange?.(idx);
        };
        host.addEventListener("sw:section", onSection);
        return () => host.removeEventListener("sw:section", onSection);
    }, [onRoomChange]);

    return (
        <>
            <div ref={hostRef} className="palace-host" />
            {topRight && <div className="palace-topright">{topRight}</div>}
            {/* Panels stay mounted across room switches (search results and
                form state survive); visibility is toggled by the parent. */}
            <aside ref={consoleRef} className="palace-console" data-room={ROOMS[room].id}>
                <div className="palace-console__inner">{consolePanel}</div>
            </aside>
        </>
    );
}
