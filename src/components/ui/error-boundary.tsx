import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full p-6 bg-card rounded-lg border border-destructive/20 shadow-lg text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
                        <p className="text-foreground-muted mb-6">
                            The application encountered a critical error.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-left bg-secondary p-4 rounded mb-6 overflow-auto max-h-40 text-destructive">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <Button onClick={() => window.location.reload()}>
                            Reload Application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
