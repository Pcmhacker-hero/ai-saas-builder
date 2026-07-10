import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-100">Something went wrong</h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              An unexpected error occurred while rendering this component. 
              {this.state.error?.message && (
                <code className="block mt-2 p-2 bg-black/50 rounded text-xs text-rose-400 font-mono">
                  {this.state.error.message}
                </code>
              )}
            </p>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
