#!/usr/bin/env python3
"""
Knowledge Fetcher for BrainForge D1
Fetches from HackerNews, Wikipedia, Dev.to, NASA, GitHub, Reddit
and POSTs each item to BrainForge Worker memory endpoint.

Auth: X-BrainForge-Secret header
Note: Cloudflare Bot Fight Mode may block GitHub Actions IPs (error 1010).
      Script uses continue-on-error and falls back gracefully.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BRAINFORGE_URL = os.environ.get("BRAINFORGE_URL", "https://brainforge-api.richard-brown-miami.workers.dev")
BRAINFORGE_SECRET = os.environ.get("BRAINFORGE_SECRET", "2200")
MEMORY_ENDPOINT = f"{BRAINFORGE_URL}/api/caffeine/memory"

# Auth header name (must be X-BrainForge-Secret per Worker code)
AUTH_HEADER = "X-BrainForge-Secret"


def http_get(url, headers=None, timeout=15):
    """Perform HTTP GET, return parsed JSON or None on error."""
    merged = {"User-Agent": "CaffeineAI-KnowledgeFetcher/2.0"}
    if headers:
        merged.update(headers)
    req = urllib.request.Request(url, headers=merged)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  [GET {e.code}] {url.split('?')[0]} - {body[:80]}")
        return None
    except Exception as e:
        print(f"  [GET ERROR] {url.split('?')[0]}: {e}")
        return None


def post_memory(key, value, category, timestamp=None):
    """POST a single memory item to BrainForge."""
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat()
    payload = json.dumps({
        "key": key,
        "value": value,
        "category": category,
        "timestamp": timestamp
    }).encode("utf-8")
    req = urllib.request.Request(
        MEMORY_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            AUTH_HEADER: BRAINFORGE_SECRET,
            "User-Agent": "CaffeineAI-KnowledgeFetcher/2.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        if e.code == 403 and "1010" in body:
            print(f"  [CLOUDFLARE BLOCK] {key}: Cloudflare Bot Fight Mode blocking runner IP (error 1010)")
            print(f"  NOTE: This is a Cloudflare IP block, not an auth issue.")
            return False
        print(f"  [POST {e.code}] {key}: {body[:100]}")
        return False
    except Exception as e:
        print(f"  [POST ERROR] {key}: {e}")
        return False


def verify_connection():
    """Verify we can reach BrainForge before running fetchers."""
    test_key = "connection_test_" + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    payload = json.dumps({
        "key": test_key,
        "value": "Connection test from knowledge fetcher",
        "category": "system",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).encode("utf-8")
    req = urllib.request.Request(
        MEMORY_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            AUTH_HEADER: BRAINFORGE_SECRET,
            "User-Agent": "CaffeineAI-KnowledgeFetcher/2.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 201):
                print(f"  Connection OK - test entry saved: {test_key}")
                return True
            return False
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        if e.code == 403 and "1010" in body:
            print(f"  CLOUDFLARE BLOCK DETECTED (error 1010)")
            print(f"  Cloudflare Bot Fight Mode is blocking GitHub Actions runner IPs.")
            print(f"  To fix: Disable Bot Fight Mode in Cloudflare dashboard for this Worker,")
            print(f"  or add GitHub Actions IP ranges to firewall allowlist.")
            return False
        print(f"  Auth/Connection FAILED: HTTP {e.code} - {body[:100]}")
        return False
    except Exception as e:
        print(f"  Connection FAILED: {e}")
        return False


def truncate(text, max_len=500):
    """Truncate text to max_len characters."""
    if not text:
        return ""
    text = str(text).strip()
    return text[:max_len] + "..." if len(text) > max_len else text


def slugify(text, max_len=80):
    """Create a simple key from text."""
    slug = re.sub(r"[^a-z0-9_-]", "_", text.lower().strip())[:max_len]
    return slug.strip("_") or "item"


# HackerNews
def fetch_hackernews(limit=5):
    saved = 0
    print("[HackerNews] Fetching top stories...")
    top = http_get("https://hacker-news.firebaseio.com/v0/topstories.json")
    if not top:
        return 0
    for story_id in top[:limit]:
        item = http_get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
        if not item or item.get("type") != "story":
            continue
        title = item.get("title", "")
        url = item.get("url", "https://news.ycombinator.com/item?id=" + str(story_id))
        score = item.get("score", 0)
        value = f"{title} | Score: {score} | URL: {url}"
        key = f"hn_{story_id}"
        if post_memory(key, truncate(value), "hackernews"):
            print(f"  + {title[:60]}")
            saved += 1
        time.sleep(0.3)
    print(f"[HackerNews] Saved {saved}/{limit}")
    return saved


# Wikipedia
def fetch_wikipedia(limit=3):
    saved = 0
    print("[Wikipedia] Fetching random articles...")
    for i in range(limit):
        article = http_get("https://en.wikipedia.org/api/rest_v1/page/random/summary")
        if not article:
            continue
        title = article.get("title", "Unknown")
        extract = article.get("extract", "")
        page_url = article.get("content_urls", {}).get("desktop", {}).get("page", "")
        value = f"{title}: {extract} | URL: {page_url}"
        key = f"wiki_{slugify(title)}_{i}"
        if post_memory(key, truncate(value), "wikipedia"):
            print(f"  + {title[:60]}")
            saved += 1
        time.sleep(0.5)
    print(f"[Wikipedia] Saved {saved}/{limit}")
    return saved


# Dev.to
def fetch_devto(limit=5):
    saved = 0
    print("[Dev.to] Fetching latest articles...")
    articles = http_get("https://dev.to/api/articles?per_page=10")
    if not articles:
        return 0
    for idx, article in enumerate(articles[:limit]):
        title = article.get("title", "")
        desc = article.get("description", "")
        tags = ", ".join(article.get("tag_list", [])[:5])
        art_url = article.get("url", "")
        reactions = article.get("public_reactions_count", 0)
        value = f"{title} | Tags: {tags} | Reactions: {reactions} | {desc} | URL: {art_url}"
        article_id = article.get("id", idx)
        key = f"devto_{article_id}"
        if post_memory(key, truncate(value), "devto"):
            print(f"  + {title[:60]}")
            saved += 1
    print(f"[Dev.to] Saved {saved}/{limit}")
    return saved


# NASA APOD
def fetch_nasa():
    saved = 0
    print("[NASA] Fetching Astronomy Picture of the Day...")
    apod = http_get("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY")
    if not apod:
        return 0
    title = apod.get("title", "Unknown")
    explanation = apod.get("explanation", "")
    date = apod.get("date", "")
    media_url = apod.get("url", "")
    # Pre-compute to avoid backslash in f-string
    date_key = date.replace("-", "_") if date else "today"
    value = f"{title} ({date}): {explanation} | Media: {media_url}"
    key = f"nasa_apod_{date_key}"
    if post_memory(key, truncate(value, 800), "nasa"):
        print(f"  + {title[:60]}")
        saved = 1
    print(f"[NASA] Saved {saved}/1")
    return saved


# GitHub Trending
def fetch_github(limit=5):
    saved = 0
    print("[GitHub] Fetching trending repositories...")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    url = f"https://api.github.com/search/repositories?q=created:>{yesterday}&sort=stars&order=desc&per_page=10"
    result = http_get(url, headers={"Accept": "application/vnd.github.v3+json"})
    if not result or "items" not in result:
        return 0
    for repo in result["items"][:limit]:
        name = repo.get("full_name", "")
        desc = repo.get("description", "No description")
        stars = repo.get("stargazers_count", 0)
        lang = repo.get("language", "Unknown")
        repo_url = repo.get("html_url", "")
        topics = ", ".join(repo.get("topics", [])[:5])
        value = f"{name} ({lang}) | Stars: {stars} | {desc} | Topics: {topics} | URL: {repo_url}"
        key = f"github_{slugify(name)}"
        if post_memory(key, truncate(value), "github"):
            print(f"  + {name[:60]}")
            saved += 1
    print(f"[GitHub] Saved {saved}/{limit}")
    return saved


# Reddit
def fetch_reddit(limit=4):
    saved = 0
    subreddits = ["programming", "MachineLearning", "technology"]
    print("[Reddit] Fetching top posts...")
    for sub in subreddits:
        url = f"https://www.reddit.com/r/{sub}/top.json?limit=5&t=day"
        data = http_get(url, headers={"User-Agent": "CaffeineAI-Bot/2.0"})
        if not data:
            continue
        posts = data.get("data", {}).get("children", [])
        count = 0
        for post in posts[:limit]:
            p = post.get("data", {})
            title = p.get("title", "")
            score = p.get("score", 0)
            permalink = p.get("permalink", "")
            post_url = "https://reddit.com" + permalink
            selftext = p.get("selftext", "")[:200]
            value = f"r/{sub}: {title} | Score: {score} | {selftext} | URL: {post_url}"
            post_id = p.get("id", slugify(title)[:20])
            key = f"reddit_{post_id}"
            if post_memory(key, truncate(value), "reddit"):
                print(f"  + [{sub}] {title[:55]}")
                saved += 1
                count += 1
            if count >= 2:
                break
        time.sleep(1)
    print(f"[Reddit] Saved {saved}")
    return saved


# Main
def main():
    print("=" * 60)
    print("CaffeineAI Knowledge Fetcher v2")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Target: {MEMORY_ENDPOINT}")
    secret_status = "env var set" if os.environ.get("BRAINFORGE_SECRET") else "using default"
    print(f"Auth: {AUTH_HEADER} ({secret_status})")
    print("=" * 60)

    print()
    print("[PREFLIGHT] Verifying BrainForge connection...")
    if not verify_connection():
        print()
        print("PREFLIGHT FAILED: Cannot reach BrainForge Worker.")
        print("If error 1010: Cloudflare Bot Fight Mode blocks GitHub Actions IPs.")
        print("Fix: Cloudflare Dashboard > Workers > brainforge-api > Settings > Bot Fight Mode > Disable")
        print("Proceeding anyway to collect fetch data for logging...")
        # Continue anyway so we can see what APIs return data
        cloudflare_blocked = True
    else:
        cloudflare_blocked = False
        print()

    results = {}

    print()
    try:
        results["hackernews"] = fetch_hackernews(5)
    except Exception as e:
        print(f"[HackerNews] FAILED: {e}")
        results["hackernews"] = 0

    print()
    try:
        results["wikipedia"] = fetch_wikipedia(3)
    except Exception as e:
        print(f"[Wikipedia] FAILED: {e}")
        results["wikipedia"] = 0

    print()
    try:
        results["devto"] = fetch_devto(5)
    except Exception as e:
        print(f"[Dev.to] FAILED: {e}")
        results["devto"] = 0

    print()
    try:
        results["nasa"] = fetch_nasa()
    except Exception as e:
        print(f"[NASA] FAILED: {e}")
        results["nasa"] = 0

    print()
    try:
        results["github"] = fetch_github(5)
    except Exception as e:
        print(f"[GitHub] FAILED: {e}")
        results["github"] = 0

    print()
    try:
        results["reddit"] = fetch_reddit(4)
    except Exception as e:
        print(f"[Reddit] FAILED: {e}")
        results["reddit"] = 0

    print()
    print("=" * 60)
    print("SUMMARY:")
    total = 0
    for source, count in results.items():
        status = "OK" if count > 0 else ("CLOUDFLARE_BLOCKED" if cloudflare_blocked else "EMPTY")
        print(f"  {source:<15} {count:>3} items  [{status}]")
        total += count
    print(f"  {'TOTAL':<15} {total:>3} items")
    print("=" * 60)

    if cloudflare_blocked:
        print()
        print("ACTION REQUIRED: Disable Cloudflare Bot Fight Mode for this Worker.")
        print("Path: Cloudflare Dashboard > Workers & Pages > brainforge-api > Settings > Security")
        # Don't fail the job - just log the issue
        sys.exit(0)
    elif total == 0:
        print("WARNING: No items saved. Check auth header and Worker status.")
        sys.exit(1)
    else:
        print(f"Done. {total} knowledge items saved to D1.")


if __name__ == "__main__":
    main()
