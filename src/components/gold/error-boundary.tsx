"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error(`ErrorBoundary[${this.props.name}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="card-elevated p-4 border" style={{ borderColor: "rgba(248,113,113,0.3)" }}>
          <div className="text-xs text-bear font-semibold mb-1">
             خطأ في تحميل: {this.props.name || "مكون"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {this.state.error?.message || "حدث خطأ غير متوقع"}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
