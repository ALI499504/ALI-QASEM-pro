"use client";

import { Component, ReactNode } from "react";

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<{ children: ReactNode; name?: string }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`ErrorBoundary[${this.props.name}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center", background: "#1e1e1e", color: "#d4d4d4", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
          <div style={{ color: "#ff4d4d", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Application Error</div>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
            {this.state.error?.message || "حدث خطأ غير متوقع"}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload(); }}
            style={{ padding: "8px 16px", background: "#007acc", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
