### 🧾 **Project Brief: AI Quick Actions Desktop Tool**

**Overview:**
This project is a lightweight, cross-platform desktop tool (Windows + macOS) that allows users to interact with AI models from anywhere on their system via a simple keyboard shortcut. When invoked, it displays a minimal overlay where users can perform quick text-based actions such as proofreading, rewriting in a different tone, or drafting new content.

---

### 🎯 **Core Features**

* **Global Shortcut:** System-wide hotkey opens the overlay instantly (e.g., `Ctrl+Shift+Alt+a`).
* **Smart Overlay:** A small, centered window appears over any active application.
* **Text Actions:**

  * **Proofread** selected text
  * **Change tone of voice** (formal, casual, friendly, etc.)
  * **Draft new text** based on user input or selected text (e.g., email replies)
* **Model Selection:** Integrates with **OpenRouter**, allowing users to choose their preferred AI model.
* **Clipboard Integration:** Automatically uses the selected text or clipboard contents.
* **Settings Storage:** Saves user preferences (API key, default model (Google Gemini 2.0 Flash), shortcuts, etc.) locally.
* Tray Icon to open settings panel and exit application

---

### ⚙️ **Tech Stack**

**Framework:** [Tauri](https://tauri.app)
**Frontend:** React (TypeScript)
**Backend:** Rust (via Tauri commands)
**API:** OpenRouter (REST endpoints)
**State Management:** Zustand or Recoil
**Styling:** TailwindCSS or CSS Modules
**Storage:** `tauri-plugin-store` (persistent local config)
**System Integrations:**

* `tauri-plugin-global-shortcut` for keyboard shortcuts
* `tauri-plugin-clipboard` for reading/writing text
* Optional `tauri-plugin-window-state` for remembering overlay size/position

---

### 🧩 **Architecture Overview**

1. **Frontend (React):**

   * Displays overlay UI with text input, buttons, and result area.
   * Manages user preferences and model selection.

2. **Backend (Rust via Tauri):**

   * Handles global keyboard shortcuts.
   * Accesses clipboard or selected text.
   * Sends/receives data from OpenRouter API.

3. **API Layer:**

   * Communicates with OpenRouter endpoints.
   * Handles authentication and error responses.

---

### 💡 **Example User Flow**

1. User presses the global shortcut (`Ctrl+Space`).
2. Overlay appears, showing buttons: *Proofread*, *Change Tone*, *Draft*.
3. If text is selected in another app, it’s auto-fetched from clipboard.
4. The selected action sends text to the chosen OpenRouter model.
5. AI response replaces original text, or inserts text where the cursor was in the other app.

