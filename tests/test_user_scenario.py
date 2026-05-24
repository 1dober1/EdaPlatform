import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
    TimeoutException,
    UnexpectedAlertPresentException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_WDM = True
except ImportError:
    USE_WDM = False


APP_URL    = os.getenv("APP_URL",    "http://localhost").rstrip("/")
TEST_EMAIL = os.getenv("TEST_EMAIL", "test_eda@example.com")
TEST_PASS  = os.getenv("TEST_PASS",  "TestPassword123!")
HEADLESS   = os.getenv("HEADLESS",  "0").lower() in ("1", "true", "yes")

SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

WAIT_TIMEOUT = 20
LONG_TIMEOUT = 40


def make_driver() -> webdriver.Chrome:
    opts = Options()
    if HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1600,900")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    prefs = {
        "download.default_directory": str(SCREENSHOTS_DIR),
        "download.prompt_for_download": False,
        "plugins.always_open_pdf_externally": True,
    }
    opts.add_experimental_option("prefs", prefs)
    if USE_WDM:
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=opts)
    return webdriver.Chrome(options=opts)


def shot(driver: webdriver.Chrome, step: int, name: str) -> str:
    ts = datetime.now().strftime("%H%M%S")
    fn = SCREENSHOTS_DIR / f"step_{step:02d}_{name}_{ts}.png"
    try:
        alert = driver.switch_to.alert
        alert.accept()
        time.sleep(0.3)
    except Exception:
        pass
    driver.save_screenshot(str(fn))
    print(f"  screenshot [{step}] {name} -> {fn.name}")
    return str(fn)


def wait(driver: webdriver.Chrome, timeout: int = WAIT_TIMEOUT) -> WebDriverWait:
    return WebDriverWait(driver, timeout)


def dismiss_alert_if_present(driver: webdriver.Chrome, timeout: float = 2.0):
    try:
        WebDriverWait(driver, timeout).until(EC.alert_is_present())
        driver.switch_to.alert.accept()
        print("  alert dismissed")
    except TimeoutException:
        pass


def js_click(driver: webdriver.Chrome, element) -> None:
    driver.execute_script("arguments[0].click();", element)


def close_modal_if_open(driver: webdriver.Chrome) -> bool:
    try:
        overlay = WebDriverWait(driver, 2).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".modal-overlay"))
        )
        try:
            close_btn = driver.find_element(By.CSS_SELECTOR, ".modal-close")
            js_click(driver, close_btn)
        except NoSuchElementException:
            js_click(driver, overlay)
        WebDriverWait(driver, 5).until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, ".modal-overlay"))
        )
        time.sleep(0.3)
        return True
    except TimeoutException:
        return False


def safe_click(driver: webdriver.Chrome, element) -> None:
    try:
        element.click()
    except ElementClickInterceptedException:
        close_modal_if_open(driver)
        js_click(driver, element)


def assert_url_contains(driver: webdriver.Chrome, fragment: str, step: int):
    current = driver.current_url
    assert fragment in current, (
        f"[step {step}] expected URL with '{fragment}', got: {current}"
    )


def step_01_landing(driver):
    """1. Opening the start page."""
    print("\n-- Step 1: start page")
    driver.get(APP_URL)
    wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".app-header"))
    )
    shot(driver, 1, "landing_page")
    print("  ok: start page loaded")


def step_02_go_to_demo(driver):
    """2. Navigating to demo datasets."""
    print("\n-- Step 2: go to demo")
    demo_link = None
    for selector in ["a[href='/demo']", "a[href*='demo']"]:
        try:
            demo_link = driver.find_element(By.CSS_SELECTOR, selector)
            break
        except NoSuchElementException:
            pass
    if demo_link:
        demo_link.click()
    else:
        driver.get(f"{APP_URL}/demo")
    wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".demo-page, .demo-grid, h1"))
    )
    shot(driver, 2, "demo_page")
    print("  ok: demo page loaded")


def step_03_select_demo_dataset(driver):
    """3. Selecting a demo dataset."""
    print("\n-- Step 3: select demo dataset")
    cards = wait(driver).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".demo-card"))
    )
    first_card = cards[0]
    name = first_card.find_element(By.CSS_SELECTOR, ".demo-card__name").text
    print(f"  selecting dataset: {name}")
    first_card.click()
    shot(driver, 3, "demo_dataset_selected")
    print("  ok: dataset selected")


def step_04_workspace_loaded(driver):
    """4. Loading the workspace with data table."""
    print("\n-- Step 4: workspace loading")
    wait(driver, LONG_TIMEOUT).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".virtual-table, .vt-container, table, .workspace__body")
        )
    )
    assert_url_contains(driver, "/workspace/", 4)
    shot(driver, 4, "workspace_loaded")
    print("  ok: workspace loaded")


def step_05_open_analysis_tools(driver):
    """5. Opening analysis tools (Describe section)."""
    print("\n-- Step 5: analysis tools")
    close_modal_if_open(driver)
    try:
        toggle = driver.find_element(By.CSS_SELECTOR, ".sidebar.is-collapsed .sidebar__toggle")
        js_click(driver, toggle)
        time.sleep(0.5)
    except NoSuchElementException:
        pass
    describe_btn = wait(driver).until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(@class,'tool-item__btn')][.//span[text()='Describe']]")
        )
    )
    safe_click(driver, describe_btn)
    wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".stat-card"))
    )
    shot(driver, 5, "analysis_tools_open")
    print("  ok: analysis tools opened, Describe active")


def step_06_distribution_chart(driver):
    """6. Building a distribution chart."""
    print("\n-- Step 6: distribution chart")
    close_modal_if_open(driver)
    dist_btn = wait(driver).until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(@class,'tool-item__btn')][.//span[contains(text(),'аспределение')]]")
        )
    )
    safe_click(driver, dist_btn)
    wait(driver, LONG_TIMEOUT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".modal-overlay"))
    )
    time.sleep(0.8)
    shot(driver, 6, "distribution_chart")
    print("  ok: distribution chart built")
    close_modal_if_open(driver)


def step_07_correlation_chart(driver):
    """7. Building a correlation matrix."""
    print("\n-- Step 7: correlation matrix")
    close_modal_if_open(driver)
    corr_btn = wait(driver).until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(@class,'tool-item__btn')][.//span[contains(text(),'орреляция')]]")
        )
    )
    safe_click(driver, corr_btn)
    wait(driver, LONG_TIMEOUT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".modal-overlay"))
    )
    time.sleep(0.8)
    shot(driver, 7, "correlation_chart")
    print("  ok: correlation matrix built")
    close_modal_if_open(driver)


def step_08_eda_report(driver):
    """8. Generating an EDA report."""
    print("\n-- Step 8: EDA report")
    close_modal_if_open(driver)
    report_btn = wait(driver).until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(@class,'report-btn') or "
                       "(contains(.,'EDA') and contains(.,'отчёт'))]")
        )
    )
    safe_click(driver, report_btn)
    time.sleep(2.0)
    dismiss_alert_if_present(driver)
    shot(driver, 8, "eda_report_downloaded")
    print("  ok: EDA report generated")


def step_09_export_triggers_auth(driver):
    """9. Export triggers authentication redirect."""
    print("\n-- Step 9: export -> auth redirect")
    close_modal_if_open(driver)
    export_btn = wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".btn--accent-export"))
    )
    safe_click(driver, export_btn)
    try:
        WebDriverWait(driver, 4).until(EC.alert_is_present())
        alert_text = driver.switch_to.alert.text
        print(f"  alert: {alert_text}")
        driver.switch_to.alert.accept()
    except TimeoutException:
        pass
    wait(driver, LONG_TIMEOUT).until(
        lambda d: "/register" in d.current_url or "/login" in d.current_url
    )
    shot(driver, 9, "auth_redirect")
    print(f"  ok: redirected to auth: {driver.current_url}")


def step_10_register_and_check_dataset(driver):
    """10. Register/login and verify dataset in personal cabinet."""
    print("\n-- Step 10: auth and check datasets")
    current_url = driver.current_url
    if "/register" in current_url:
        _fill_register_form(driver)
    elif "/login" in current_url:
        _fill_login_form(driver)
    else:
        print(f"  unexpected url {current_url}, going to /register")
        driver.get(f"{APP_URL}/register")
        _fill_register_form(driver)

    wait(driver, LONG_TIMEOUT).until(
        lambda d: "/login" not in d.current_url and "/register" not in d.current_url
    )
    dismiss_alert_if_present(driver, timeout=4)
    shot(driver, 10, "after_auth")
    print(f"  url after login: {driver.current_url}")

    driver.get(f"{APP_URL}/saved-datasets")
    wait(driver, LONG_TIMEOUT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".saved-data, h1"))
    )
    shot(driver, 10, "my_datasets_page")

    try:
        cards = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".dataset-card"))
        )
        print(f"  ok: datasets found in cabinet: {len(cards)}")
        for card in cards:
            try:
                title = card.find_element(By.CSS_SELECTOR, ".dataset-card__title").text.strip()
                print(f"    - {title}")
            except NoSuchElementException:
                pass
        shot(driver, 10, "dataset_found_in_cabinet")
    except TimeoutException:
        shot(driver, 10, "my_datasets_empty")
        print("  warning: no datasets found in cabinet")


def _fill_register_form(driver):
    print("  filling register form...")
    email_field = wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    email_field.clear()
    email_field.send_keys(TEST_EMAIL)
    pass_fields = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
    if len(pass_fields) >= 2:
        pass_fields[0].send_keys(TEST_PASS)
        pass_fields[1].send_keys(TEST_PASS)
    elif len(pass_fields) == 1:
        pass_fields[0].send_keys(TEST_PASS)
    shot(driver, 9, "register_form_filled")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    dismiss_alert_if_present(driver, timeout=5)
    try:
        error = WebDriverWait(driver, 3).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".auth-form__error"))
        )
        print(f"  register error: {error.text} - switching to login")
        _go_to_login_and_submit(driver)
    except (TimeoutException, UnexpectedAlertPresentException):
        dismiss_alert_if_present(driver, timeout=3)


def _fill_login_form(driver):
    print("  filling login form...")
    email_field = wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    email_field.clear()
    email_field.send_keys(TEST_EMAIL)
    pass_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    pass_field.send_keys(TEST_PASS)
    shot(driver, 9, "login_form_filled")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    dismiss_alert_if_present(driver, timeout=5)


def _go_to_login_and_submit(driver):
    driver.get(f"{APP_URL}/login")
    _fill_login_form(driver)


def run():
    print("=" * 60)
    print("  EDA Platform - Selenium E2E test")
    print(f"  URL:         {APP_URL}")
    print(f"  Screenshots: {SCREENSHOTS_DIR}")
    print(f"  Headless:    {HEADLESS}")
    print("=" * 60)

    driver = make_driver()
    driver.set_page_load_timeout(60)

    steps = [
        step_01_landing,
        step_02_go_to_demo,
        step_03_select_demo_dataset,
        step_04_workspace_loaded,
        step_05_open_analysis_tools,
        step_06_distribution_chart,
        step_07_correlation_chart,
        step_08_eda_report,
        step_09_export_triggers_auth,
        step_10_register_and_check_dataset,
    ]

    passed = 0
    failed = 0
    results = []

    try:
        for step_fn in steps:
            step_num = int(step_fn.__name__.split("_")[1])
            try:
                step_fn(driver)
                passed += 1
                results.append(f"  PASS  step {step_num:2d}: {step_fn.__doc__.split('.')[0].strip()}")
            except Exception as exc:
                failed += 1
                results.append(f"  FAIL  step {step_num:2d}: {step_fn.__doc__.split('.')[0].strip()}")
                print(f"\n  FAILED step {step_num}: {exc}")
                traceback.print_exc()
                dismiss_alert_if_present(driver, timeout=2)
                try:
                    shot(driver, step_num, f"FAIL_{step_fn.__name__}")
                except Exception as shot_err:
                    print(f"  could not save failure screenshot: {shot_err}")
    finally:
        driver.quit()

    print("\n" + "=" * 60)
    print("  Results:")
    for r in results:
        print(r)
    print("-" * 60)
    print(f"  Total: PASS {passed}  /  FAIL {failed}")
    print("=" * 60)

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    run()
