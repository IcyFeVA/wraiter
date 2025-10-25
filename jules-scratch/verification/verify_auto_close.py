
from playwright.sync_api import sync_playwright, Page, expect
import time

def run_test(page: Page):
    try:
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        # The webview is already running, so we don't need to navigate
        # Give the app time to load
        page.wait_for_selector(".inner", timeout=15000)
        print("App loaded.")

        # Go to settings
        page.click('button:has-text("APP SETTINGS")')
        page.wait_for_selector('h3:has-text("Global Keyboard Shortcut")', timeout=5000)
        print("Navigated to settings.")

        # Enable auto-close
        auto_close_checkbox = page.locator('input[type="checkbox"] + span:has-text("Close window after copying result")')
        if not auto_close_checkbox.is_checked():
            auto_close_checkbox.click()
            print("Enabled auto-close.")

        # Go back to the main overlay
        page.click('button:has-text("MAIN")')
        page.wait_for_selector(".action-buttons-container", timeout=5000)
        print("Navigated back to overlay.")

        # Select the 'Draft' action
        page.click('button:has-text("Draft")')
        print("Selected 'Draft' action.")

        # Enter text
        page.fill('textarea', 'This is a test draft.')
        print("Entered text.")

        # Click "Send to AI"
        page.click('button:has-text("Send to AI")')
        print("Clicked 'Send to AI'.")

        # Poll for the window to be hidden
        for _ in range(10):
            if not page.is_visible('body'):
                print("Window closed as expected.")
                page.screenshot(path="jules-scratch/verification/verification.png")
                return
            time.sleep(1)

        print("Window did not close.")
        page.screenshot(path="jules-scratch/verification/error.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    context = browser.contexts[0]
    page = context.pages[0]
    run_test(page)
    browser.close()
