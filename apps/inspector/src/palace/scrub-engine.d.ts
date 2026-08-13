export interface ScrollWorldSection {
    id: string;
    label: string;
    still: string;
    clip?: string;
    clipMobile?: string;
    accent?: string;
    scroll?: number;
    linger?: number;
    eyebrow?: string;
    title?: string;
    body?: string;
    tags?: string[];
    cta?: {
        primary?: { label: string; href: string };
        secondary?: { label: string; href: string };
    };
}

export interface ScrollWorldConfig {
    brand?: { name: string; href?: string };
    diveScroll?: number;
    connScroll?: number;
    crossfade?: number;
    hint?: string;
    nav?: boolean;
    atmosphere?: boolean;
    sections: ScrollWorldSection[];
    connectors?: (string | null)[];
    connectorsMobile?: (string | null)[];
}

/**
 * Mounts the scroll-world flight into `container`. Dispatches a
 * `sw:section` CustomEvent<{index: number; id: string}> on the container
 * whenever the active room changes (inspector-local patch).
 */
export function mountScrollWorld(container: HTMLElement, config: ScrollWorldConfig): void;
