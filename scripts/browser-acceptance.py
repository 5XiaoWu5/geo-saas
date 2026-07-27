"""Real Chromium acceptance for GeoPilot AI Sprint 19-B.

Credentials are read from environment variables and are never written to artifacts:
GEOPILOT_TEST_EMAIL, GEOPILOT_TEST_PASSWORD, GEOPILOT_TEST_EMAIL_2,
GEOPILOT_TEST_PASSWORD_2, and optional GEOPILOT_BASE_URL.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import BrowserContext, Page, sync_playwright


BASE_URL = os.environ.get("GEOPILOT_BASE_URL", "https://geopilotapp.com").rstrip("/")
ARTIFACT_DIR = Path("output/playwright/sprint-19-b")
VIEWPORTS = [
    ("desktop-1440", 1440, 900),
    ("mobile-375", 375, 812),
    ("mobile-390", 390, 844),
    ("mobile-430", 430, 932),
]


def chromium_executable() -> str | None:
    configured = os.environ.get("GEOPILOT_CHROMIUM_EXECUTABLE", "").strip()
    if configured:
        return configured
    browser_root = Path.home() / "AppData/Local/ms-playwright"
    candidates = sorted(browser_root.glob("chromium-*/chrome-win*/chrome.exe"))
    return str(candidates[0]) if candidates else None


def required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"MISSING_ENV_{name}")
    return value


def login(page: Page, email: str, password: str, remember: bool) -> dict[str, Any]:
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=15_000)
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    checkbox = page.get_by_label("保持登录状态")
    if remember:
        checkbox.check()
    else:
        checkbox.uncheck()
    page.get_by_role("button", name="进入 GeoPilot AI").click()
    page.wait_for_url(re.compile(r"/dashboard(?:\?.*)?$"), timeout=30_000)
    page.wait_for_load_state("domcontentloaded")
    cookies = page.context.cookies(BASE_URL)
    session = next((cookie for cookie in cookies if "session" in cookie["name"].lower()), None)
    if not session:
        raise AssertionError("SESSION_COOKIE_MISSING")
    return {
        "name": session["name"],
        "httpOnly": session["httpOnly"],
        "secure": session["secure"],
        "sameSite": session["sameSite"],
        "expires": session["expires"],
        "persistent": session["expires"] > time.time(),
    }


def api_json(response: Any) -> dict[str, Any]:
    try:
        return response.json()
    except Exception as error:
        raise AssertionError(f"INVALID_API_JSON_{response.status}") from error


def create_project(context: BrowserContext) -> str:
    response = context.request.post(
        f"{BASE_URL}/api/projects",
        data={
            "name": f"Sprint 19-B Browser Acceptance {int(time.time())}",
            "websiteUrl": "https://example.com",
            "language": "English",
            "country": "United States",
            "industry": "SaaS",
            "description": "Temporary isolated browser acceptance project.",
        },
    )
    if response.status not in (200, 201):
        raise AssertionError(f"PROJECT_CREATE_{response.status}_{api_json(response).get('error')}")
    return str(api_json(response)["project"]["id"])


def cleanup_stale_projects(context: BrowserContext) -> None:
    response = context.request.get(f"{BASE_URL}/api/projects")
    if response.status != 200:
        return
    for project in api_json(response).get("projects", []):
        if str(project.get("name", "")).startswith("Sprint 19-B Browser Acceptance"):
            context.request.delete(f"{BASE_URL}/api/projects/{project['id']}")


def provider_interactions(page: Page, project_id: str, evidence: dict[str, Any]) -> None:
    page.goto(f"{BASE_URL}/projects/{project_id}/geo/monitoring", wait_until="domcontentloaded")
    page.wait_for_selector("#OPENAI-api-key")
    card = page.locator("article").filter(has_text="OpenAI").first
    key_link = card.get_by_role("link", name=re.compile("获取 API Key|Get API Key"))
    docs_link = card.get_by_role("link", name=re.compile("查看官方文档|Official documentation"))
    evidence["providerLinks"] = {
        "apiKey": key_link.get_attribute("href"),
        "apiKeyTarget": key_link.get_attribute("target"),
        "docs": docs_link.get_attribute("href"),
        "docsTarget": docs_link.get_attribute("target"),
    }
    if evidence["providerLinks"] != {
        "apiKey": "https://platform.openai.com/api-keys",
        "apiKeyTarget": "_blank",
        "docs": "https://platform.openai.com/docs/overview",
        "docsTarget": "_blank",
    }:
        raise AssertionError("OFFICIAL_PROVIDER_LINKS_INVALID")

    field = card.locator("#OPENAI-api-key")
    field.fill("sk-sprint19b-invalid-credential-0001")
    card.get_by_role("button", name=re.compile("显示 API Key|Show API Key")).click()
    if field.get_attribute("type") != "text":
        raise AssertionError("API_KEY_SHOW_FAILED")
    card.get_by_role("button", name=re.compile("隐藏 API Key|Hide API Key")).click()
    if field.get_attribute("type") != "password":
        raise AssertionError("API_KEY_HIDE_FAILED")

    with page.expect_response(lambda response: "/api/ai-search-providers/" in response.url and response.request.method == "PUT") as saved:
        card.get_by_role("button", name=re.compile("保存配置|Save configuration")).click()
    if saved.value.status != 200:
        raise AssertionError(f"PROVIDER_SAVE_{saved.value.status}")
    page.wait_for_timeout(300)

    card = page.locator("article").filter(has_text="OpenAI").first
    with page.expect_response(lambda response: response.url.endswith("/test") and response.request.method == "POST", timeout=30_000) as tested:
        card.get_by_role("button", name=re.compile("测试连接|Test connection")).click()
        page.get_by_role("button", name=re.compile("确认并测试|Confirm and test")).click()
    evidence["invalidProviderTestStatus"] = tested.value.status
    evidence["invalidProviderTestBody"] = api_json(tested.value).get("error")
    if tested.value.status not in (401, 422):
        raise AssertionError(f"INVALID_PROVIDER_TEST_{tested.value.status}")

    card = page.locator("article").filter(has_text="OpenAI").first
    field = card.locator("#OPENAI-api-key")
    field.fill("sk-sprint19b-replacement-credential-0002")
    with page.expect_response(lambda response: "/api/ai-search-providers/" in response.url and response.request.method == "PUT") as replaced:
        card.get_by_role("button", name=re.compile("保存配置|Save configuration")).click()
    if replaced.value.status != 200:
        raise AssertionError(f"PROVIDER_REPLACE_{replaced.value.status}")

    card = page.locator("article").filter(has_text="OpenAI").first
    card.get_by_role("button", name=re.compile("删除 API Key|Delete API Key")).click()
    page.get_by_role("button", name=re.compile("^取消$|^Cancel$")).click()
    if page.get_by_role("dialog").count():
        raise AssertionError("PROVIDER_DELETE_CANCEL_FAILED")
    card.get_by_role("button", name=re.compile("删除 API Key|Delete API Key")).click()
    with page.expect_response(lambda response: "/api/ai-search-providers/" in response.url and response.request.method == "DELETE") as deleted:
        page.get_by_role("dialog").get_by_role("button", name=re.compile("删除 API Key|Delete API Key")).click()
    if deleted.value.status != 200:
        raise AssertionError(f"PROVIDER_DELETE_{deleted.value.status}")


def automation_interaction(page: Page, project_id: str, evidence: dict[str, Any]) -> None:
    page.goto(f"{BASE_URL}/projects/{project_id}/automation", wait_until="domcontentloaded")
    page.get_by_role("button", name=re.compile("Standard Mode|标准模式")).click()
    with page.expect_response(lambda response: response.url.endswith("/automation/preview") and response.request.method == "POST") as preview:
        page.get_by_role("button", name=re.compile("生成预演|Create preview")).click()
    if preview.value.status != 200:
        raise AssertionError(f"AUTOMATION_PREVIEW_{preview.value.status}")
    with page.expect_response(lambda response: response.url.endswith("/start") and response.request.method == "POST") as started:
        page.get_by_role("button", name=re.compile("确认并开始|Confirm and start")).click()
    if started.value.status != 200:
        raise AssertionError(f"AUTOMATION_START_{started.value.status}")
    page.wait_for_timeout(1_500)
    evidence["automationTimelineVisible"] = page.get_by_text(re.compile("执行时间线|Execution Timeline")).count() > 0
    evidence["activityLogVisible"] = page.get_by_text(re.compile("活动日志|Activity Log")).count() > 0
    evidence["beforeAfterVisible"] = page.get_by_text(re.compile("优化前后对比|Before / After")).count() > 0
    if not all((evidence["automationTimelineVisible"], evidence["activityLogVisible"], evidence["beforeAfterVisible"])):
        raise AssertionError("AUTOMATION_AUDIT_UI_MISSING")


def locale_and_tooltip(page: Page, project_id: str, evidence: dict[str, Any]) -> None:
    page.goto(f"{BASE_URL}/projects/{project_id}/geo/command-center", wait_until="domcontentloaded")
    switch = page.get_by_role("button", name="Switch to English")
    if switch.count():
        switch.click()
        page.wait_for_timeout(200)
    evidence["englishTitle"] = page.get_by_text("AI Search Command Center", exact=True).count() > 0
    help_button = page.locator('button[aria-label$=" help"]').first
    if help_button.count():
        help_button.click()
        page.wait_for_selector('[role="tooltip"]')
        evidence["tooltipOpened"] = True
        page.keyboard.press("Escape")
    else:
        evidence["tooltipOpened"] = False
    switch_back = page.get_by_role("button", name="切换到中文")
    if switch_back.count():
        switch_back.click()
        page.wait_for_timeout(200)
    evidence["chineseTitle"] = page.get_by_text("AI 搜索增长驾驶舱", exact=True).count() > 0
    if not all((evidence["englishTitle"], evidence["tooltipOpened"], evidence["chineseTitle"])):
        raise AssertionError("LOCALE_OR_TOOLTIP_FAILED")


def viewport_acceptance(context: BrowserContext, project_id: str, results: dict[str, Any]) -> None:
    routes = {
        "dashboard": "/dashboard",
        "provider-settings": f"/projects/{project_id}/geo/monitoring",
        "automation-list-detail": f"/projects/{project_id}/automation",
        "growth-action": f"/projects/{project_id}/growth/actions",
        "growth-agent": f"/projects/{project_id}/growth/agent",
        "growth-report": f"/projects/{project_id}/reports",
        "geo-analyzer": "/analyzer",
        "ai-search-monitoring": f"/projects/{project_id}/geo/monitoring-center",
        "ai-command-center": f"/projects/{project_id}/geo/command-center",
    }
    for label, width, height in VIEWPORTS:
        page = context.new_page()
        page.set_viewport_size({"width": width, "height": height})
        console_errors: list[str] = []
        page_errors: list[str] = []
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        viewport_result: dict[str, Any] = {"width": width, "height": height, "pages": {}}
        for route_name, route in routes.items():
            response = page.goto(f"{BASE_URL}{route}", wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(350)
            if not response or response.status >= 400:
                raise AssertionError(f"PAGE_LOAD_{label}_{route_name}_{response.status if response else 'none'}")
            metrics = page.evaluate(
                """() => {
                  const root = document.documentElement;
                  const body = document.body;
                  const visibleButtons = [...document.querySelectorAll(
                    'button, a[role="button"], a[class*="min-h-11"], a[class*="size-11"]'
                  )]
                    .filter(el => {
                      const style = getComputedStyle(el);
                      const rect = el.getBoundingClientRect();
                      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
                    });
                  const undersized = visibleButtons
                    .filter(el => el.getBoundingClientRect().height < 43.5)
                    .slice(0, 10)
                    .map(el => ({ text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80), height: el.getBoundingClientRect().height }));
                  return {
                    overflow: Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
                    rootWidth: root.scrollWidth,
                    bodyWidth: body.scrollWidth,
                    viewportWidth: window.innerWidth,
                    undersized
                  };
                }"""
            )
            if metrics["overflow"]:
                raise AssertionError(f"HORIZONTAL_OVERFLOW_{label}_{route_name}_{metrics}")
            if metrics["undersized"]:
                raise AssertionError(f"UNDERSIZED_TARGET_{label}_{route_name}_{metrics['undersized']}")
            screenshot = ARTIFACT_DIR / f"{label}-{route_name}.png"
            page.screenshot(path=str(screenshot), full_page=True)
            viewport_result["pages"][route_name] = {
                "status": response.status,
                "overflow": metrics["overflow"],
                "screenshot": str(screenshot),
            }
        viewport_result["consoleErrors"] = console_errors
        viewport_result["pageErrors"] = page_errors
        if console_errors or page_errors:
            raise AssertionError(f"BROWSER_ERRORS_{label}_{console_errors}_{page_errors}")
        results["viewports"][label] = viewport_result
        page.close()


def main() -> int:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    email = required("GEOPILOT_TEST_EMAIL")
    password = required("GEOPILOT_TEST_PASSWORD")
    email_2 = required("GEOPILOT_TEST_EMAIL_2")
    password_2 = required("GEOPILOT_TEST_PASSWORD_2")
    results: dict[str, Any] = {"baseUrl": BASE_URL, "viewports": {}, "api": {}, "interactions": {}}
    project_id: str | None = None
    with sync_playwright() as playwright:
        executable = chromium_executable()
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=executable,
        )
        session_context = browser.new_context(viewport={"width": 1440, "height": 900})
        session_page = session_context.new_page()
        session_cookie = login(session_page, email, password, remember=False)
        results["sessionCookie"] = session_cookie
        if session_cookie["persistent"]:
            raise AssertionError("SESSION_COOKIE_SHOULD_NOT_PERSIST")
        session_context.close()

        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            remember_cookie = login(page, email, password, remember=True)
            results["rememberCookie"] = remember_cookie
            remaining_days = (remember_cookie["expires"] - time.time()) / 86_400
            if not 29 <= remaining_days <= 31:
                raise AssertionError(f"REMEMBER_COOKIE_DURATION_{remaining_days}")

            cleanup_stale_projects(context)
            project_id = create_project(context)
            results["projectId"] = project_id

            unauthenticated = playwright.request.new_context(base_url=BASE_URL)
            unauthenticated_response = unauthenticated.get(f"/api/ai-search-providers/{project_id}")
            results["api"]["unauthenticated"] = unauthenticated_response.status
            unauthenticated.dispose()
            if results["api"]["unauthenticated"] != 401:
                raise AssertionError("UNAUTHENTICATED_API_NOT_401")

            normal = context.request.get(f"{BASE_URL}/api/ai-search-providers/{project_id}")
            results["api"]["normal"] = normal.status
            if normal.status != 200:
                raise AssertionError("NORMAL_API_NOT_200")
            body = api_json(normal)
            serialized = json.dumps(body)
            if "sk-sprint19b" in serialized or "encryptedApiKey" in serialized or "apiKeyAuthTag" in serialized:
                raise AssertionError("PROVIDER_API_LEAKED_SECRET_FIELDS")

            second = browser.new_context(viewport={"width": 1440, "height": 900})
            second_page = second.new_page()
            login(second_page, email_2, password_2, remember=False)
            forbidden = second.request.get(f"{BASE_URL}/api/ai-search-providers/{project_id}")
            results["api"]["crossUser"] = forbidden.status
            second.close()
            if results["api"]["crossUser"] != 403:
                raise AssertionError("CROSS_USER_API_NOT_403")

            provider_interactions(page, project_id, results["interactions"])
            automation_interaction(page, project_id, results["interactions"])
            locale_and_tooltip(page, project_id, results["interactions"])
            report = context.request.post(f"{BASE_URL}/api/projects/{project_id}/reports")
            results["api"]["reportGenerate"] = report.status
            if report.status != 200:
                raise AssertionError(f"REPORT_GENERATE_{report.status}")

            viewport_acceptance(context, project_id, results)
            reopened = context.new_page()
            reopened.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
            results["rememberReopen"] = "/dashboard" in reopened.url
            reopened.close()
            if not results["rememberReopen"]:
                raise AssertionError("REMEMBER_REOPEN_FAILED")
        finally:
            if project_id:
                cleanup = context.request.delete(f"{BASE_URL}/api/projects/{project_id}")
                results["cleanupStatus"] = cleanup.status
            page.close()
            context.close()
            browser.close()
    (ARTIFACT_DIR / "acceptance-results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "baseUrl": BASE_URL,
        "viewports": list(results["viewports"]),
        "api": results["api"],
        "cleanupStatus": results.get("cleanupStatus"),
        "artifact": str(ARTIFACT_DIR / "acceptance-results.json"),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        (ARTIFACT_DIR / "failure.txt").write_text(str(error), encoding="utf-8")
        print(json.dumps({"ok": False, "error": str(error), "artifact": str(ARTIFACT_DIR / "failure.txt")}, ensure_ascii=False))
        raise
