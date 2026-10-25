import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isModuleFetchError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Importing a module script failed');

      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="ui-card max-w-md w-full p-6">
            <div className="text-4xl mb-3">{isModuleFetchError ? '🔄' : '⚠️'}</div>
            <h2 className="text-xl font-['Chakra_Petch'] font-black uppercase text-red-400 mb-2">
              {isModuleFetchError ? 'Nova Atualização Disponível' : 'Ocorreu um erro inesperado'}
            </h2>
            <p className="text-sm font-mono text-slate-300 mb-4 leading-relaxed">
              {isModuleFetchError
                ? 'Os ficheiros da aplicação foram atualizados no servidor. Clica abaixo para recarregar com as novidades.'
                : 'A aplicação intercetou um problema de renderização e evitou o fecho do ecrã.'}
            </p>

            {this.state.error && (
              <div className="ui-inset p-3 text-left mb-5 overflow-x-auto">
                <p className="text-xs font-mono text-red-300 font-bold mb-1">Detalhes:</p>
                <code className="text-[11px] font-mono text-slate-400 block whitespace-pre-wrap">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="ui-btn ui-btn-primary flex-1 py-2.5 px-4 text-xs"
              >
                Recarregar Aplicação ↻
              </button>
              {!isModuleFetchError && (
                <button
                  type="button"
                  onClick={this.handleResetState}
                  className="ui-btn ui-btn-secondary flex-1 py-2.5 px-4 text-xs"
                >
                  Tentar Novamente ↺
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
