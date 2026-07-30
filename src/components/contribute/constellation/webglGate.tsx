"use client";

import {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";

type BoundaryProps = {
  children: ReactNode;
  fallback: ReactNode | ((message: string) => ReactNode);
};
type BoundaryState = { hasError: boolean; message: string };

export class WebGLErrorBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[WebGL]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      return typeof fallback === "function"
        ? fallback(this.state.message)
        : fallback;
    }
    return this.props.children;
  }
}

/** Monte les enfants uniquement côté client. */
export function ClientWebGLGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: BoundaryProps["fallback"];
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black" />
    );
  }

  return (
    <WebGLErrorBoundary fallback={fallback}>{children}</WebGLErrorBoundary>
  );
}
