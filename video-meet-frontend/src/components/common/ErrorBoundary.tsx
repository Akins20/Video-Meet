"use client";
import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        // Could send to monitoring service
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-center text-red-600">
                    <p>Something went wrong. Please refresh the page.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
