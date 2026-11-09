import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; sectionName?: string; }
interface State { hasError: boolean; error?: Error; }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.sectionName ?? 'Section'}] Error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 24px',
          textAlign: 'center',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(27,67,50,0.08)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontWeight: 700, color: '#1b4332', fontSize: 15 }}>
            Une erreur est survenue dans cette section.
          </p>
          <p style={{ color: '#4d6b52', fontSize: 13, marginTop: 6 }}>
            Rechargez la page pour réessayer.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: 14,
              padding: '9px 20px',
              background: '#40916c',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
