#!/usr/bin/env python3
"""
Generate a frontend-friendly sitemap JSON by scanning the backend AI_ROUTE_SITEMAP.

Place this in the repo and run it when server routes change to regenerate
`frontend/src/lib/aiSitemap.json`.
"""
import ast
import json
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
AI_PY = REPO_ROOT / "backend" / "app" / "api" / "ai.py"
OUT_JSON = REPO_ROOT / "frontend" / "src" / "lib" / "aiSitemap.json"


def extract_ai_route_sitemap(text: str):
    idx = text.find("AI_ROUTE_SITEMAP")
    if idx == -1:
        raise RuntimeError("AI_ROUTE_SITEMAP not found in ai.py")

    # find the '=' after the name and then the first '[' after that (avoid type annotations)
    eq = text.find("=", idx)
    if eq == -1:
        raise RuntimeError("Could not find '=' for AI_ROUTE_SITEMAP assignment")
    start = text.find("[", eq)
    if start == -1:
        raise RuntimeError("Could not find start of list for AI_ROUTE_SITEMAP")

    # find matching closing bracket
    depth = 0
    end = start
    for i, ch in enumerate(text[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i
                break

    snippet = text[start : end + 1]

    # Use ast.literal_eval to safely evaluate the Python literal
    parsed = ast.literal_eval(snippet)
    return parsed


def build_frontend_sitemap(parsed_list):
    filtered = []
    exclude_prefixes = ("/admin",)
    exclude_exact = {"/login", "/register", "/profile"}
    for item in parsed_list:
        p = item.get("path")
        t = item.get("title") or item.get("path")
        if not p:
            continue
        if any(p.startswith(pref) for pref in exclude_prefixes):
            continue
        if p in exclude_exact:
            continue
        filtered.append({"path": p, "title": t})
    # dedupe while preserving order
    seen = set()
    out = []
    for it in filtered:
        if it["path"] in seen:
            continue
        seen.add(it["path"])
        out.append(it)
    return out


def main():
    text = AI_PY.read_text(encoding="utf-8")
    parsed = extract_ai_route_sitemap(text)
    sitemap = build_frontend_sitemap(parsed)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(sitemap, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON} with {len(sitemap)} entries")


if __name__ == "__main__":
    main()
