import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { isConnectReturn, finishConnectReturn } from "./lib/connect";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

if (isConnectReturn()) {
    // This window is the dashboard connect popup returning. Signal the palace
    // tab and close — don't boot the whole app in a throwaway popup.
    const status = finishConnectReturn();
    root.render(
        <div className="boundary">
            <h1>{status === "sent" ? "Connected" : "Connection incomplete"}</h1>
            <p className="hint">
                {status === "sent"
                    ? "Return to the palace — you can close this tab."
                    : "Something went wrong. Close this tab and try again from the palace."}
            </p>
        </div>,
    );
} else {
    root.render(
        <StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </StrictMode>,
    );
}
