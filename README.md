
# Wraiter — AI Quick Actions Desktop Tool

Wraiter is a lightweight, cross-platform desktop utility (Windows + macOS) that gives you access to AI-powered quick text actions from anywhere on your system via a global shortcut. It opens a minimal overlay where you can proofread, rewrite with a different tone, or draft new content using OpenRouter-backed models.

Key goals:
- Fast global shortcut to open a small overlay window
- Use selected text or clipboard contents as input
- Proofread, change tone, or draft text quickly
- Persist user settings locally (API key, default model, shortcuts)

This repository uses Tauri for the desktop shell, React + TypeScript for the UI, and Rust for native integrations.

## Features

- Global system-wide hotkey to open the overlay
- Minimal, centered overlay UI for quick text edits
- Actions: Proofread, Change Tone (formal/casual/etc.), Draft
- Model selection (OpenRouter integration)
- Clipboard integration and optional selected-text capture
- Persistent settings via a local store
- Tray icon for quick access to settings and quitting the app

## Tech stack

- Tauri (desktop shell)
- React + TypeScript + Vite (frontend)
- Rust (Tauri backend for system integrations)
- OpenRouter API for model access
- Zustand for lightweight state management
- Tauri plugins: global-shortcut, clipboard, store

## Getting started (development)

Prerequisites:

- Node.js (v18+ recommended)
- Yarn or npm
- Rust toolchain (stable) and cargo
- Recommended IDE: VS Code with the Tauri and rust-analyzer extensions

Install dependencies:

```bash
# from project root
yarn install
```

Run the app in development mode (frontend + Tauri):

```bash
yarn dev
# in another terminal (optional) to run tauri commands directly
yarn tauri dev
```

Available scripts (defined in `package.json`):

- `yarn dev` — run Vite dev server
- `yarn build` — compile TypeScript and build production bundle
- `yarn preview` — preview the built web bundle
- `yarn tauri` — run Tauri CLI (use e.g. `yarn tauri dev`)

## Configuration & Secrets

Wraiter requires an OpenRouter (or compatible) API key to call models. Store keys in the app settings UI; they are persisted locally using the Tauri store plugin. Do not commit secrets to source control.

## Architecture notes

- Frontend: overlay UI, actions, settings management, local state
- Backend (Rust via Tauri): global shortcut registration, clipboard access, invoking OS-level integrations, and calling remote APIs when appropriate
- API layer: lightweight wrapper around OpenRouter REST endpoints with error handling and retries

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repo and create a feature branch
2. Run the dev setup and ensure the app builds
3. Open a pull request with a clear description of your changes

If you're adding features that touch native code (Tauri/Rust), please include notes on how to test them on Windows and macOS.

## Notes & next steps

- The project brief lives in `projectbrief.md` with more background on user flows.
- Consider adding automated tests for core actions and a CI pipeline that runs type checks and builds for both frontend and the Tauri app.

## License

DO NOT REDISTRIBUTE, SELL AND COPY THIS PROJECT
