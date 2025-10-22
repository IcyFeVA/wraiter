from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:1420/")

    # Click the "App Settings" tab
    page.click("button:has-text('APP SETTINGS')")

    # Check that the "Start on OS Boot" checkbox is visible
    checkbox = page.locator("input[type='checkbox']")
    if not checkbox.is_visible():
        raise Exception("Checkbox not visible")

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
