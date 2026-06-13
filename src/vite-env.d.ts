/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Anthropic API key. Lives in .env (gitignored) — never in .env.example. */
  readonly VITE_ANTHROPIC_API_KEY?: string
  /** 'true' to enable LLM planning. Default (anything else) = fallback only, $0 spend. */
  readonly VITE_USE_LLM?: string
  /** Per-session USD auto-stop for LLM calls (default 5). Resets on page reload. */
  readonly VITE_LLM_BUDGET_USD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
