import { Component, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

type State = { readonly kind: "running" } | { readonly kind: "stopped"; readonly detail: string };

/**
 * An error in a render or in an effect unmounts the whole tree, and the page is then black with no text.
 * This boundary shows what stopped and gives a control that loads the page again.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { kind: "running" };

  static getDerivedStateFromError(error: unknown): State {
    return { kind: "stopped", detail: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    if (this.state.kind === "running") return this.props.children;
    return (
      <div className="stopped" role="alert">
        <p>The skill explorer stopped because of an error in the page.</p>
        <p className="detail">{this.state.detail}</p>
        <button type="button" className="text-button" onClick={() => window.location.reload()}>
          Load the page again
        </button>
      </div>
    );
  }
}
