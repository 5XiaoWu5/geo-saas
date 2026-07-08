"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { ProjectErrorState } from "@/features/project-center/components/ProjectStates";

type ProjectErrorBoundaryState = { error: Error | null };

export class ProjectErrorBoundary extends Component<{ children: ReactNode }, ProjectErrorBoundaryState> {
  state: ProjectErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ProjectErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <ProjectErrorState message={this.state.error.message} />;
    }

    return this.props.children;
  }
}
