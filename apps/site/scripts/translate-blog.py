#!/usr/bin/env python3
"""
Batch translate a new blog post to 47 languages using translate-tool.
Usage: /root/projects/.venv/bin/python3 scripts/translate-blog.py <slug>
"""

import sys, os, re, json, time, shutil
from pathlib import Path

os.environ["translators_default_region"] = "EN"
sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

PROJECT = Path(__file__).parent.parent
BLOG_EN_DIR = PROJECT / "content/blog/en"

engine = TranslationEngine(caller="sinotradecompliance")


def parse_mdx(filepath):
    """Parse MDX into frontmatter dict + body string"""
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    
    if not content.startswith("---"):
        return None, content
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return None, content
    
    raw_fm = parts[1]
    body = parts[2]
    
    # Parse YAML-like frontmatter manually (avoid pyyaml dependency)
    fm = {}
    current_key = None
    in_array = False
    array_items = []
    
    for line in raw_fm.split("\n"):
        line_stripped = line.strip()
        
        if in_array:
            if line_stripped.startswith("- "):
                # Array item
                val = line_stripped[2:].strip()
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                elif val.startswith("'") and val.endswith("'"):
                    val = val[1:-1]
                array_items.append(val)
                continue
            else:
                # End of array
                if current_key and array_items:
                    fm[current_key] = array_items
                in_array = False
                current_key = None
                array_items = []
        
        if ":" in line_stripped and not line_stripped.startswith("-"):
            key, _, value = line_stripped.partition(":")
            key = key.strip()
            value = value.strip()
            
            if value == "":
                # Could be start of array
                in_array = True
                current_key = key
                array_items = []
            else:
                # Remove quotes
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                fm[key] = value
    
    # Handle last array
    if in_array and current_key and array_items:
        fm[current_key] = array_items
    
    return fm, body


def build_mdx(fm, body):
    """Rebuild MDX from frontmatter dict + body"""
    lines = ["---"]
    for key, value in fm.items():
        if key in ("slug", "date", "coverImage"):
            lines.append(f'{key}: {json.dumps(value)}' if isinstance(value, str) else f'{key}: {value}')
        elif isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                if isinstance(item, dict):
                    lines.append(f"  - title: {json.dumps(item.get('title', ''))}")
                    lines.append(f"    url: {json.dumps(item.get('url', ''))}")
                else:
                    lines.append(f"  - {json.dumps(item)}")
        elif isinstance(value, str):
            # Check if value contains quotes that need special handling
            if '"' in value:
                lines.append(f"{key}: '{value}'")
            else:
                lines.append(f'{key}: "{value}"')
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    lines.append(body)
    return "\n".join(lines)


def translate_text(text, target_lang, source_lang="en"):
    """Translate text using translate-tool engine"""
    if not text or not text.strip():
        return text
    try:
        result = engine.translate(text, src=source_lang, tgt=target_lang)
        if result and result.strip():
            return result
    except Exception as e:
        print(f"  ⚠ Translation error: {e}")
    return text


def translate_frontmatter(fm, target_lang):
    """Translate frontmatter fields"""
    translated = dict(fm)
    
    # Translate title
    if "title" in translated and translated["title"]:
        translated["title"] = translate_text(translated["title"], target_lang)
        time.sleep(0.15)
    
    # Translate excerpt
    if "excerpt" in translated and translated["excerpt"]:
        translated["excerpt"] = translate_text(translated["excerpt"], target_lang)
        time.sleep(0.15)
    
    # Translate category
    if "category" in translated and translated["category"]:
        translated["category"] = translate_text(translated["category"], target_lang)
        time.sleep(0.15)
    
    # Keep slug, date unchanged
    # Keep references unchanged
    
    return translated


def translate_body(body, target_lang):
    """Translate body content"""
    if not body or not body.strip():
        return body
    
    return translate_text(body, target_lang)


def verify_mdx(filepath):
    """Verify MDX file has valid frontmatter"""
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    
    if not content.startswith("---"):
        return False, "Missing frontmatter"
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return False, "Malformed frontmatter"
    
    fm_text = parts[1]
    body = parts[2]
    
    # Check required fields
    for field in ["title", "slug", "date", "category", "excerpt"]:
        if field not in fm_text:
            return False, f"Missing field: {field}"
    
    if not body.strip():
        return False, "Empty body"
    
    return True, "OK"


def batch_translate(slug, locales):
    """Translate blog post to multiple locales"""
    source_file = BLOG_EN_DIR / f"{slug}.mdx"
    
    if not source_file.exists():
        print(f"❌ Source file not found: {source_file}")
        return
    
    print(f"📖 Source: {source_file}")
    fm, body = parse_mdx(source_file)
    if not fm:
        print("❌ Failed to parse frontmatter")
        return
    
    print(f"   Title: {fm.get('title', '?')}")
    print(f"   Body: {len(body)} chars")
    print()
    
    success = 0
    skipped = 0
    errors = []
    
    for i, locale in enumerate(locales, 1):
        print(f"[{i}/{len(locales)}] {locale}...", end=" ", flush=True)
        
        target_dir = PROJECT / "content/blog" / locale
        target_file = target_dir / f"{slug}.mdx"
        
        # Check if already exists and verified
        if target_file.exists():
            ok, msg = verify_mdx(target_file)
            if ok:
                print(f"⏭ (exists)")
                skipped += 1
                continue
        
        target_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Translate frontmatter
            translated_fm = translate_frontmatter(fm, locale)
            
            # Translate body
            translated_body = translate_body(body, locale)
            
            # Build MDX
            mdx_content = build_mdx(translated_fm, translated_body)
            
            # Write
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(mdx_content)
            
            # Verify
            ok, msg = verify_mdx(target_file)
            if ok:
                print(f"✅")
                success += 1
            else:
                print(f"⚠️ {msg}")
                errors.append((locale, msg))
        
        except Exception as e:
            print(f"❌ {e}")
            errors.append((locale, str(e)))
        
        # Rate limit: 0.3s between languages
        time.sleep(0.3)
    
    print(f"\n{'='*50}")
    print(f"✅ {success} languages translated")
    if skipped:
        print(f"⏭ {skipped} already existed")
    if errors:
        print(f"❌ {len(errors)} errors:")
        for loc, err in errors[:5]:
            print(f"   {loc}: {err}")
    print(f"{'='*50}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 translate-blog.py <slug>")
        sys.exit(1)
    
    slug = sys.argv[1]
    
    # Get all locales except en
    blog_dir = PROJECT / "content/blog"
    all_locales = sorted([
        d.name for d in blog_dir.iterdir()
        if d.is_dir() and d.name != "en"
    ])
    
    print(f"🌐 Translating '{slug}' to {len(all_locales)} languages...")
    batch_translate(slug, all_locales)
