/**
 * PalaceNav — first-person click navigation through the Walrus Memory Palace.
 *
 * Renders the current scene as a full-viewport backdrop with doorway
 * hotspots (graphic-adventure style). Clicking a hotspot zooms the camera
 * toward it and dissolves into the target room. The gates→atrium move can
 * play the rendered "doors open" flight instead (the connect cinematic).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Hotspot, SceneDef } from "./scenes";
import "./palace.css";

interface Props {
    scene: SceneDef;
    onNavigate: (to: SceneDef["id"]) => void;
    /** A chain/relayer error to surface across every room (banner). */
    banner?: string | null;
    /** Glass console content for this room (right side). */
    console?: ReactNode;
    /** Extra in-scene overlay (e.g. shelf shards), rendered under hotspots. */
    overlay?: ReactNode;
    topRight?: ReactNode;
    /** When set, plays this clip full-screen once, then clears via onCinematicEnd. */
    cinematic?: string | null;
    onCinematicEnd?: () => void;
}

export function PalaceNav({
    scene,
    onNavigate,
    banner,
    console: consolePanel,
    overlay,
    topRight,
    cinematic,
    onCinematicEnd,
}: Props) {
    const [shown, setShown] = useState(scene); // scene currently painted
    const [leaving, setLeaving] = useState(false);
    const [cineOut, setCineOut] = useState(false); // fading the clip out onto the still
    const originRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
    const pendingRef = useRef<SceneDef | null>(null);

    // Cross-fade the clip's final frame onto the room still (seedance lands
    // near the --end-image but not pixel-exact), then unmount it.
    const fadeRef = useRef<number | null>(null);
    const finishCinematic = useCallback(() => {
        setCineOut(true);
        if (fadeRef.current) clearTimeout(fadeRef.current);
        fadeRef.current = window.setTimeout(() => {
            fadeRef.current = null;
            setCineOut(false);
            onCinematicEnd?.();
        }, 360);
    }, [onCinematicEnd]);

    // Scene change: zoom toward the clicked hotspot, then swap and settle.
    useEffect(() => {
        if (scene.id === shown.id) {
            // Same room, new content (e.g. the Vault's namespace doorways
            // arriving from chain) — repaint in place without a transition.
            if (scene !== shown) setShown(scene);
            return;
        }
        pendingRef.current = scene;
        setLeaving(true);
        const t = setTimeout(() => {
            setShown(pendingRef.current!);
            setLeaving(false);
        }, 460);
        return () => clearTimeout(t);
    }, [scene, shown.id]);

    const clickHotspot = useCallback(
        (h: Hotspot) => {
            originRef.current = { x: h.x, y: h.y };
            onNavigate(h.to);
        },
        [onNavigate],
    );

    const videoRef = useRef<HTMLVideoElement>(null);
    const [cineIn, setCineIn] = useState(false); // overlay revealed once the clip paints
    useEffect(() => {
        setCineIn(false);
        // A new clip (or none) arrives: drop any pending fade-out from the
        // previous clip, so its 360ms timer can't null this one mid-play.
        setCineOut(false);
        if (fadeRef.current) {
            clearTimeout(fadeRef.current);
            fadeRef.current = null;
        }
        const v = videoRef.current;
        if (!v || !cinematic) return;
        v.playbackRate = 1.9;
        v.play().catch(() => finishCinematic());
        // Safety: if a clip is missing or stalls, reveal the room anyway so
        // navigation never gets stuck on a black overlay.
        const bail = setTimeout(() => finishCinematic(), 6000);
        return () => clearTimeout(bail);
    }, [cinematic, finishCinematic]);

    return (
        <div className="nav-root" data-scene={shown.id} style={{ "--accent": shown.accent } as React.CSSProperties}>
            <div
                key={shown.id}
                className={`nav-scene ${leaving ? "nav-scene--leaving" : "nav-scene--arriving"}`}
                style={
                    {
                        backgroundImage: `url(${shown.still})`,
                        "--origin-x": `${originRef.current.x}%`,
                        "--origin-y": `${originRef.current.y}%`,
                    } as React.CSSProperties
                }
            >
                {overlay && !leaving && <div className="nav-overlay">{overlay}</div>}
                {!leaving &&
                    shown.hotspots.map((h) => (
                        <button
                            key={`${h.to}-${h.x}`}
                            className={`hotspot hotspot--${h.kind}`}
                            style={{ left: `${h.x}%`, top: `${h.y}%` }}
                            onClick={() => clickHotspot(h)}
                        >
                            <span className="hotspot__ring" aria-hidden="true">
                                {h.kind === "back" ? "↩" : "◈"}
                            </span>
                            <span className="hotspot__label">{h.label}</span>
                        </button>
                    ))}
            </div>

            <div className="nav-vignette" aria-hidden="true" />

            <header className="nav-topbar">
                <span className="nav-brand">
                    <span className="nav-brand__mark" aria-hidden="true" />
                    Walrus Memory Palace
                </span>
                <span className="nav-location">{shown.name}</span>
                <span className="nav-actions">{topRight}</span>
            </header>

            {banner && <div className="nav-banner" role="alert">{banner}</div>}

            {consolePanel && (
                <aside className="palace-console palace-console--enter" data-room={shown.id} key={shown.id}>
                    <div className="palace-console__inner">{consolePanel}</div>
                </aside>
            )}

            {cinematic && (
                <div
                    className={`nav-cinematic ${cineIn ? "nav-cinematic--in" : ""} ${cineOut ? "nav-cinematic--out" : ""}`}
                    onClick={() => finishCinematic()}
                >
                    <video
                        ref={videoRef}
                        src={cinematic}
                        muted
                        playsInline
                        preload="auto"
                        onPlaying={() => setCineIn(true)}
                        onEnded={() => finishCinematic()}
                        onError={() => finishCinematic()}
                    />
                    <span className="nav-cinematic__skip">click to skip</span>
                </div>
            )}
        </div>
    );
}
