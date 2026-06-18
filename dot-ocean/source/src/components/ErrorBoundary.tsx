import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Dot Ocean error:', error, info); }
  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="fatal-screen" role="alert">
          <div className="fatal-card">
            <h1>🌊 Dot Ocean</h1>
            <p>화면을 그리는 중 문제가 발생했어요. 페이지를 새로고침하거나 다른 브라우저에서 열어 보세요.</p>
            <p className="en">Something went wrong while rendering. Please refresh, or try another browser.</p>
            <button className="btn-primary" onClick={() => location.reload()}>새로고침 / Reload</button>
            <pre className="fatal-detail">{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
