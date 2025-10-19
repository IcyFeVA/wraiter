from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:1420")
    page = browser.contexts[0].pages[0]
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()
