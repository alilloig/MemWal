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
    console: consolePanel,
    overlay,
    topRight,
    cinematic,
    onCinematicEnd,
}: Props) {
    const [shown, setShown] = useState(scene); // scene currently painted
    const [leaving, setLeaving] = useState(false);
    const originRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
    const pendingRef = useRef<SceneDef | null>(null);

    // Scene change: zoom toward the clicked hotspot, then swap and settle.
    useEffect(() => {
        if (scene.id === shown.id) return;
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
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !cinematic) return;
        v.playbackRate = 1.9;
        v.play().catch(() => onCinematicEnd?.());
    }, [cinematic, onCinematicEnd]);

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

            {consolePanel && (
                <aside className="palace-console palace-console--enter" data-room={shown.id} key={shown.id}>
                    <div className="palace-console__inner">{consolePanel}</div>
                </aside>
            )}

            {cinematic && (
                <div className="nav-cinematic" onClick={() => onCinematicEnd?.()}>
                    <video
                        ref={videoRef}
                        src={cinematic}
                        muted
                        playsInline
                        onEnded={() => onCinematicEnd?.()}
                    />
                    <span className="nav-cinematic__skip">click to skip</span>
                </div>
            )}
        </div>
    );
}
