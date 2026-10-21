from fastapi.testclient import TestClient

from main import app


def _preflight(origin):
    return TestClient(app).options(
        "/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


def test_configured_origins_are_allowed():
    r = _preflight("https://www.axishousings.com")
    assert r.headers.get("access-control-allow-origin") == "https://www.axishousings.com"


def test_an_arbitrary_vercel_site_is_not():
    """*.vercel.app used to be allowed, which admitted every project on Vercel."""
    for origin in ("https://attacker.vercel.app", "https://afodabohousing-evil.vercel.app"):
        assert "access-control-allow-origin" not in _preflight(origin).headers


def test_an_explicit_preview_pattern_can_be_opted_into(monkeypatch):
    import re

    from config import Settings

    pattern = r"^https://afodabohousing-[a-z0-9-]+-team\.vercel\.app$"
    assert Settings(cors_origin_regex=pattern).cors_origin_regex == pattern
    assert re.match(pattern, "https://afodabohousing-git-fix-team.vercel.app")
    assert not re.match(pattern, "https://attacker.vercel.app")


def test_regex_is_off_by_default():
    from config import Settings

    assert Settings().cors_origin_regex == ""


def test_no_developer_machine_path_remains_in_startup():
    import inspect

    import main

    assert "/home/joel" not in inspect.getsource(main)


def test_git_sha_comes_from_the_environment(monkeypatch, caplog):
    import logging

    monkeypatch.setenv("RENDER_GIT_COMMIT", "abcdef1234567890")
    with caplog.at_level(logging.INFO):
        with TestClient(app):
            pass
    assert "abcdef1" in caplog.text
