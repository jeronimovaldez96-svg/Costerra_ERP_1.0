import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-surface-base shadow-glass backdrop-blur-xl">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-red-500/10 p-3 text-red-500">
                <AlertCircle size={32} />
              </div>
              <h1 className="mb-2 text-xl font-semibold text-white">Something went wrong</h1>
              <p className="mb-6 text-sm text-slate-400">
                An unexpected error occurred in the application interface. Your data is safe.
              </p>
              
              <div className="mb-6 w-full rounded-lg bg-black/40 p-3 text-left text-xs font-mono text-red-400 overflow-x-auto">
                {this.state.error?.message || 'Unknown error'}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { window.location.reload(); }}>
                  Reload App
                </Button>
                <Button variant="primary" onClick={this.handleReset}>
                  <RefreshCcw size={16} className="mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
