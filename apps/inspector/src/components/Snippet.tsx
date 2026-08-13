/**
 * Collapsible "how the SDK does this" block — every panel shows the exact
 * SDK (or Sui client) call it runs, so the dashboard doubles as a code tour.
 */
export function Snippet({ title, code }: { title?: string; code: string }) {
    return (
        <details className="snippet">
            <summary>{title ?? "Show the SDK call"}</summary>
            <pre>
                <code>{code}</code>
            </pre>
        </details>
    );
}
