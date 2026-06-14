import { Component, type ReactNode } from 'react'

/**
 * ModelBoundary — a tiny React error boundary for GLB-loading subtrees.
 *
 * useGLTF throws (via React Suspense) and, on a failed/missing asset, surfaces a
 * real error that would otherwise unmount the whole suburb. Wrapping each
 * model-loading unit here means one bad GLB degrades to its `fallback` (a simple
 * placeholder primitive) instead of blanking the entire scene.
 *
 * Deliberately minimal: no retry, no logging UI — just catch and render fallback.
 */
interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ModelBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Non-fatal: a single missing/broken GLB shouldn't take down the suburb.
    console.warn('[ModelBoundary] model failed to load, rendering fallback:', error)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
