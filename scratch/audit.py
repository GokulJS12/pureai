import os
import re
from urllib.parse import urlparse, unquote
from html.parser import HTMLParser

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(f"Root directory set to: {ROOT_DIR}")

# Exclude list for disk scan
EXCLUDE_DIRS = {'.git', 'scratch'}
EXCLUDE_FILES = {'dev-server.py', '.htaccess', 'vercel.json', 'netlify.toml', '.DS_Store'}

class PageParser(HTMLParser):
    def __init__(self, filepath):
        super().__init__()
        self.filepath = filepath
        self.links = []
        self.images = []
        self.scripts = []
        self.stylesheets = []
        self.anchors = set()
        self.forms = []
        self.current_form = None
        self.title = None
        self.meta_desc = None
        self.og_tags = {}
        self.twitter_tags = {}
        self.canonical = None
        self.headings = []
        self.in_title = False
        self.in_body = False
        self.text_content = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        if tag == 'body':
            self.in_body = True
        
        # Track anchors defined in the page via id or name
        if 'id' in attrs_dict:
            self.anchors.add(attrs_dict['id'])
        if tag == 'a' and 'name' in attrs_dict:
            self.anchors.add(attrs_dict['name'])

        if tag == 'title':
            self.in_title = True
        
        elif tag == 'meta':
            name = attrs_dict.get('name', '').lower()
            prop = attrs_dict.get('property', '').lower()
            content = attrs_dict.get('content', '')
            if name == 'description':
                self.meta_desc = content
            elif name.startswith('twitter:'):
                self.twitter_tags[name] = content
            elif prop.startswith('og:'):
                self.og_tags[prop] = content

        elif tag == 'link':
            rel = attrs_dict.get('rel', '').lower()
            href = attrs_dict.get('href')
            if href:
                if 'stylesheet' in rel:
                    self.stylesheets.append(href)
                elif 'canonical' in rel:
                    self.canonical = href
                elif 'icon' in rel or 'shortcut' in rel:
                    self.images.append(href) # Favicon behaves like an image reference

        elif tag == 'script':
            src = attrs_dict.get('src')
            if src:
                self.scripts.append(src)

        elif tag == 'img':
            src = attrs_dict.get('src')
            if src:
                self.images.append(src)

        elif tag == 'a':
            href = attrs_dict.get('href')
            if href is not None:
                self.links.append((href, self.getpos()))

        elif tag == 'form':
            self.current_form = {
                'action': attrs_dict.get('action', ''),
                'method': attrs_dict.get('method', 'get').lower(),
                'inputs': [],
                'buttons': []
            }
            self.forms.append(self.current_form)

        elif tag in ['input', 'select', 'textarea']:
            if self.current_form:
                self.current_form['inputs'].append({
                    'tag': tag,
                    'type': attrs_dict.get('type', 'text').lower(),
                    'name': attrs_dict.get('name', ''),
                    'id': attrs_dict.get('id', ''),
                    'required': 'required' in attrs_dict
                })

        elif tag == 'button':
            if self.current_form:
                self.current_form['buttons'].append({
                    'type': attrs_dict.get('type', 'submit').lower(),
                    'id': attrs_dict.get('id', '')
                })

        elif tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            self.headings.append(tag)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        elif tag == 'form':
            self.current_form = None
        elif tag == 'body':
            self.in_body = False

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or '') + data
        if self.in_body:
            self.text_content.append(data)

def resolve_path(source_file, target_path):
    """
    Resolves target_path relative to source_file.
    If target_path starts with '/', it is relative to ROOT_DIR.
    Returns absolute path on disk, or None if external.
    """
    if not target_path:
        return None
    
    # Check if external URL
    parsed = urlparse(target_path)
    if parsed.scheme in ('http', 'https', 'ftp', 'mailto', 'tel', 'javascript', 'data'):
        return None
    
    if target_path.startswith('//'):
        return None # External schematic URL
        
    path_part = parsed.path
    if not path_part:
        # Same page anchor check
        return None

    # URL-decode path
    path_part = unquote(path_part)

    if path_part.startswith('/'):
        # Root relative
        abs_path = os.path.join(ROOT_DIR, path_part.lstrip('/'))
    else:
        # Relative to source file's directory
        source_dir = os.path.dirname(source_file)
        abs_path = os.path.join(source_dir, path_part)
    
    abs_path = os.path.normpath(abs_path)
    return abs_path

def find_html_files(root):
    html_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Exclude directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith('.html'):
                html_files.append(os.path.join(dirpath, f))
    return html_files

def find_all_files(root):
    all_files = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f not in EXCLUDE_FILES:
                all_files.add(os.path.normpath(os.path.join(dirpath, f)))
    return all_files

def test_on_disk(abs_path):
    """
    Given a resolved path on disk, verifies if it exists.
    Handles extension-free URLs: e.g., if checking `/innovation` (which points to `innovation` on disk),
    we verify if `innovation.html` exists.
    """
    if os.path.exists(abs_path):
        return True, abs_path
    
    # Check clean URL rewrite (append .html)
    if not abs_path.endswith('.html'):
        candidate = abs_path + '.html'
        if os.path.exists(candidate):
            return True, candidate
        
        # Check index.html inside a directory (e.g. /digital-twin-page/)
        candidate_dir = os.path.join(abs_path, 'index.html')
        if os.path.exists(candidate_dir):
            return True, candidate_dir
            
    return False, abs_path

def audit():
    html_files = find_html_files(ROOT_DIR)
    all_files_on_disk = find_all_files(ROOT_DIR)
    
    parsed_pages = {}
    referenced_files = set()
    
    # Add files that are entry points or config files to referenced_files to avoid false warnings
    referenced_files.add(os.path.normpath(os.path.join(ROOT_DIR, 'index.html')))
    
    print(f"Found {len(html_files)} HTML files to parse.")
    
    # First pass: parse all HTML files
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, ROOT_DIR)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            parser = PageParser(filepath)
            parser.feed(content)
            parsed_pages[filepath] = parser
        except Exception as e:
            print(f"Error parsing {rel_path}: {e}")
            
    # Track link / image errors
    broken_links = []
    broken_images = []
    broken_scripts = []
    broken_stylesheets = []
    seo_warnings = []
    
    # Second pass: validate references and build graph
    for filepath, parser in parsed_pages.items():
        rel_src = os.path.relpath(filepath, ROOT_DIR)
        
        # 1. Stylesheets
        for sheet in parser.stylesheets:
            abs_path = resolve_path(filepath, sheet)
            if abs_path:
                exists, resolved = test_on_disk(abs_path)
                if exists:
                    referenced_files.add(resolved)
                else:
                    broken_stylesheets.append((rel_src, sheet, abs_path))
                    
        # 2. Scripts
        for script in parser.scripts:
            abs_path = resolve_path(filepath, script)
            if abs_path:
                exists, resolved = test_on_disk(abs_path)
                if exists:
                    referenced_files.add(resolved)
                else:
                    broken_scripts.append((rel_src, script, abs_path))
                    
        # 3. Images / Favicons
        for img in parser.images:
            abs_path = resolve_path(filepath, img)
            if abs_path:
                exists, resolved = test_on_disk(abs_path)
                if exists:
                    referenced_files.add(resolved)
                else:
                    broken_images.append((rel_src, img, abs_path))
                    
        # 4. Links and Anchors
        for link, _ in parser.links:
            # We want to check anchors as well
            parsed_url = urlparse(link)
            fragment = parsed_url.fragment
            
            abs_path = resolve_path(filepath, link)
            if abs_path:
                exists, resolved = test_on_disk(abs_path)
                if exists:
                    referenced_files.add(resolved)
                    # Verify anchor if fragment is present
                    if fragment and resolved in parsed_pages:
                        target_parser = parsed_pages[resolved]
                        if fragment not in target_parser.anchors:
                            broken_links.append((rel_src, link, f"Anchor #{fragment} not found in {os.path.relpath(resolved, ROOT_DIR)}"))
                else:
                    broken_links.append((rel_src, link, "Page not found on disk"))
            else:
                # Relative anchor in same page
                if not parsed_url.path and fragment:
                    if fragment not in parser.anchors:
                        broken_links.append((rel_src, link, f"Self-anchor #{fragment} not found"))
                        
        # 5. SEO Check
        seo_issues = []
        if not parser.title:
            seo_issues.append("Missing <title> tag")
        elif len(parser.title.strip()) < 5:
            seo_issues.append(f"Title too short: '{parser.title.strip()}'")
            
        if not parser.meta_desc:
            seo_issues.append("Missing meta description")
            
        if 'og:title' not in parser.og_tags:
            seo_issues.append("Missing og:title")
        if 'og:description' not in parser.og_tags:
            seo_issues.append("Missing og:description")
        if 'og:image' not in parser.og_tags:
            seo_issues.append("Missing og:image")
            
        h1_count = parser.headings.count('h1')
        if h1_count == 0:
            seo_issues.append("Missing <h1> tag")
        elif h1_count > 1:
            seo_issues.append(f"Multiple <h1> tags ({h1_count} found)")
            
        if seo_issues:
            seo_warnings.append((rel_src, seo_issues))

    # Identify unused files on disk
    unused_files = []
    # Any HTML, CSS, JS, image, or PDF files on disk that are NOT in referenced_files
    for f in all_files_on_disk:
        # Exclude directories
        if os.path.isdir(f):
            continue
        # Check if file has been referenced
        norm_f = os.path.normpath(f)
        if norm_f not in referenced_files:
            rel_f = os.path.relpath(norm_f, ROOT_DIR)
            # Make sure we don't flag the entry point index.html or server scripts
            unused_files.append(rel_f)

    # Security check for secrets/keys
    security_issues = []
    keyword_pat = re.compile(r'(api_key|apikey|secret|password|private_key|token|auth_key|credentials)\s*=\s*[\'"][^\'"]+[\'"]', re.IGNORECASE)
    # Scan files for these
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, ROOT_DIR)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            matches = keyword_pat.findall(content)
            if matches:
                security_issues.append((rel_path, f"Potential hardcoded credentials/secrets found: {matches}"))
        except Exception as e:
            pass

    # Print summary
    print("\n" + "="*50)
    print("AUDIT RESULTS SUMMARY")
    print("="*50)
    
    print(f"\n[STYLING] Broken Stylesheet References: {len(broken_stylesheets)}")
    for src, sheet, abs_p in broken_stylesheets:
        print(f"  - In {src}: target '{sheet}' not found")
        
    print(f"\n[SCRIPTS] Broken Script References: {len(broken_scripts)}")
    for src, script, abs_p in broken_scripts:
        print(f"  - In {src}: target '{script}' not found")
        
    print(f"\n[IMAGES] Broken Image References: {len(broken_images)}")
    for src, img, abs_p in broken_images:
        print(f"  - In {src}: target '{img}' not found")
        
    print(f"\n[LINKS] Broken Link/Anchor References: {len(broken_links)}")
    for src, link, reason in broken_links:
        print(f"  - In {src}: target '{link}' -> {reason}")
        
    print(f"\n[SEO] Pages with SEO Issues: {len(seo_warnings)}")
    for src, issues in seo_warnings:
        print(f"  - In {src}:")
        for iss in issues:
            print(f"    * {iss}")
            
    print(f"\n[SECURITY] Potential Security Issues: {len(security_issues)}")
    for src, iss in security_issues:
        print(f"  - In {src}: {iss}")
        
    print(f"\n[UNUSED] Unreferenced files on disk (excluding server script/configs): {len(unused_files)}")
    # Print first 20 unused files for preview
    for f in sorted(unused_files)[:30]:
        print(f"  - {f}")
    if len(unused_files) > 30:
        print(f"  - ... and {len(unused_files)-30} more")

if __name__ == '__main__':
    audit()
