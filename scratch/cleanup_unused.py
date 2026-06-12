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

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Track anchors defined in the page via id or name
        if 'id' in attrs_dict:
            self.anchors.add(attrs_dict['id'])
        if tag == 'a' and 'name' in attrs_dict:
            self.anchors.add(attrs_dict['name'])
        
        if tag == 'link':
            rel = attrs_dict.get('rel', '').lower()
            href = attrs_dict.get('href')
            if href:
                if 'stylesheet' in rel:
                    self.stylesheets.append(href)
                elif 'icon' in rel or 'shortcut' in rel:
                    self.images.append(href)

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

def resolve_path(source_file, target_path):
    if not target_path:
        return None
    parsed = urlparse(target_path)
    if parsed.scheme in ('http', 'https', 'ftp', 'mailto', 'tel', 'javascript', 'data'):
        return None
    if target_path.startswith('//'):
        return None
    path_part = parsed.path
    if not path_part:
        return None
    path_part = unquote(path_part)
    if path_part.startswith('/'):
        abs_path = os.path.join(ROOT_DIR, path_part.lstrip('/'))
    else:
        source_dir = os.path.dirname(source_file)
        abs_path = os.path.join(source_dir, path_part)
    return os.path.normpath(abs_path)

def find_html_files(root):
    html_files = []
    for dirpath, dirnames, filenames in os.walk(root):
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
    if os.path.exists(abs_path):
        return True, abs_path
    if not abs_path.endswith('.html'):
        candidate = abs_path + '.html'
        if os.path.exists(candidate):
            return True, candidate
        candidate_dir = os.path.join(abs_path, 'index.html')
        if os.path.exists(candidate_dir):
            return True, candidate_dir
    return False, abs_path

def cleanup():
    html_files = find_html_files(ROOT_DIR)
    all_files_on_disk = find_all_files(ROOT_DIR)
    
    referenced_files = set()
    referenced_files.add(os.path.normpath(os.path.join(ROOT_DIR, 'index.html')))
    
    for filepath in html_files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            parser = PageParser(filepath)
            parser.feed(content)
            
            
            # Stylesheets
            for sheet in parser.stylesheets:
                abs_path = resolve_path(filepath, sheet)
                if abs_path:
                    exists, resolved = test_on_disk(abs_path)
                    if exists:
                        referenced_files.add(resolved)
            # Scripts
            for script in parser.scripts:
                abs_path = resolve_path(filepath, script)
                if abs_path:
                    exists, resolved = test_on_disk(abs_path)
                    if exists:
                        referenced_files.add(resolved)
            # Images
            for img in parser.images:
                abs_path = resolve_path(filepath, img)
                if abs_path:
                    exists, resolved = test_on_disk(abs_path)
                    if exists:
                        referenced_files.add(resolved)
            # Links
            for link, _ in parser.links:
                abs_path = resolve_path(filepath, link)
                if abs_path:
                    exists, resolved = test_on_disk(abs_path)
                    if exists:
                        referenced_files.add(resolved)
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
            
    unused_files = []
    for f in all_files_on_disk:
        if os.path.isdir(f):
            continue
        norm_f = os.path.normpath(f)
        if norm_f not in referenced_files:
            unused_files.append(norm_f)
            
    print(f"Found {len(unused_files)} unused files to delete.")
    for f in sorted(unused_files):
        rel_f = os.path.relpath(f, ROOT_DIR)
        try:
            os.remove(f)
            print(f"Deleted: {rel_f}")
        except Exception as e:
            print(f"Error deleting {rel_f}: {e}")
            
    print("\nCleanup completed.")

if __name__ == '__main__':
    cleanup()
