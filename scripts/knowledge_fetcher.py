#!/usr/bin/env python3
"""
Knowledge Fetcher for BrainForge D1
Fetches from HackerNews, Wikipedia, Dev.to, NASA, GitHub, Reddit
and POSTs each item to BrainForge Worker memory endpoint.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BRAINFORGE_URL = os.environ.get("BRAINFORGE_URL", "https://brainforge-api.richard-brown-miami.workers.dev")
BRAINFORGE_SECRET = os.environ.get("BRAINFORGE_SECRET", "2200")
MEMORY_ENDPOINT = f"{BRAINFORGE_URL}/api/caffeine/memory"

def http_get(url, headers=None, timeout=15):
    """Perform HTTP GET, return parsed JSON or None on error."""
    req = urllib.request.Request(url, headers=headers or {})
    req.add_header("User-Agent", "CaffeineAI-KnowledgeFetcher/1.0")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception as e:
        print(f"  [GET ERROR] {url}: {e}")
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
            "X-Caffeine-Secret": BRAINFORGE_SECRET
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"  [POST ERROR] {key}: {e}")
        return False

def truncate(text, max_len=500):
    """Truncate text to max_len characters."""
    if not text:
        return ""
    text = str(text).strip()
    return text[:max_len] + "..." if len(text) > max_len else text

def slugify(text, max_len=80):
    """Create a simple key from text."""
    import re
    slug = re.sub(r"[^a-z0-9_-]", "_", text.lower().strip())[:max_len]
    return slug.strip("_") or "item"

# ─── HackerNews ───────────────────────────────────────────────────────────────
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
        url = item.get("url", f"https://news.ycombinator.com/item?id={story_id}")
        score = item.get("score", 0)
        value = f"{title} | Score: {score} | URL: {url}"
        key = f"hn_{story_id}"
        if post_memory(key, truncate(value), "hackernews"):
            print(f"  + {title[:60]}")
            saved += 1
        time.sleep(0.3)
    print(f"[HackerNews] Saved {saved}/{limit}")
    return saved

# ─── Wikipedia ────────────────────────────────────────────────────────────────
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

# ─── Dev.to ───────────────────────────────────────────────────────────────────
def fetch_devto(limit=5):
    saved = 0
    print("[Dev.to] Fetching latest articles...")
    articles = http_get("https://dev.to/api/articles?per_page=10")
    if not articles:
        return 0
    for article in articles[:limit]:
        title = article.get("title", "")
        desc = article.get("description", "")
        tags = ", ".join(article.get("tag_list", [])[:5])
        art_url = article.get("url", "")
        reactions = article.get("public_reactions_count", 0)
        value = f"{title} | Tags: {tags} | Reactions: {reactions} | {desc} | URL: {art_url}"
        key = f"devto_{article.get('id', i)}"
        if post_memory(key, truncate(value), "devto"):
            print(f"  + {title[:60]}")
            saved += 1
    print(f"[Dev.to] Saved {saved}/{limit}")
    return saved

# ─── NASA APOD ────────────────────────────────────────────────────────────────
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
    value = f"{title} ({date}): {explanation} | Media: {media_url}"
    key = f"nasa_apod_{date.replace(\'-\', \'_\') if date else \'today\'}"
    if post_memory(key, truncate(value, 800), "nasa"):
        print(f"  + {title[:60]}")
        saved = 1
    print(f"[NASA] Saved {saved}/1")
    return saved

# ─── GitHub Trending ──────────────────────────────────────────────────────────
def fetch_github(limit=5):
    saved = 0
    print("[GitHub] Fetching trending repositories...")
    from datetime import timedelta
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

# ─── Reddit ───────────────────────────────────────────────────────────────────
def fetch_reddit(limit=4):
    saved = 0
    subreddits = ["programming", "MachineLearning", "technology"]
    print("[Reddit] Fetching top posts...")
    for sub in subreddits:
        url = f"https://www.reddit.com/r/{sub}/top.json?limit=5&t=day"
        data = http_get(url, headers={"User-Agent": "CaffeineAI-Bot/1.0"})
        if not data:
            continue
        posts = data.get("data", {}).get("children", [])
        count = 0
        for post in posts[:limit]:
            p = post.get("data", {})
            title = p.get("title", "")
            score = p.get("score", 0)
            post_url = f"https://reddit.com{p.get(\'permalink\', \'\')}"
            selftext = p.get("selftext", "")[:200]
            value = f"r/{sub}: {title} | Score: {score} | {selftext} | URL: {post_url}"
            key = f"reddit_{p.get(\'id\', slugify(title)[:20])}"
            if post_memory(key, truncate(value), "reddit"):
                print(f"  + [{sub}] {title[:55]}")
                saved += 1
                count += 1
            if count >= 2:
                break
        time.sleep(1)
    print(f"[Reddit] Saved {saved}")
    return saved

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("="*60)
    print(f"CaffeineAI Knowledge Fetcher")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Target: {MEMORY_ENDPOINT}")
    print("="*60)

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
    print("="*60)
    print("SUMMARY:")
    total = 0
    for source, count in results.items():
        status = "OK" if count > 0 else "EMPTY"
        print(f"  {source:<15} {count:>3} items  [{status}]")
        total += count
    print(f"  {"TOTAL":<15} {total:>3} items")
    print("="*60)

    if total == 0:
        print("WARNING: No items saved. Check BRAINFORGE_SECRET and endpoint.")
        sys.exit(1)
    else:
        print(f"Done. {total} knowledge items saved to D1.")

if __name__ == "__main__":
    main()
