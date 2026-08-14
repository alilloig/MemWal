import { Component, type ReactNode } from "react";
import { clearSettings } from "./config";

/**
 * Last-resort recovery. A malformed delegate key persisted in localStorage
 * would throw inside MemWal.create() during render and white-screen every
 * reload with no reachable Disconnect. This boundary catches that and offers
 * a way out.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="boundary">
                <h1>The palace could not open</h1>
                <p>{this.state.error.message}</p>
                <p className="hint">
                    This usually means the saved delegate key or account ID is malformed.
                </p>
                <button
                    className="primary"
                    onClick={() => {
                        clearSettings();
                        location.reload();
                    }}
                >
                    Clear saved settings & reload
                </button>
            </div>
        );
    }
}
