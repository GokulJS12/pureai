import os
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(f"Root directory: {ROOT_DIR}")

# Exclude list
EXCLUDE_DIRS = {'.git', 'scratch'}

def get_og_image(filepath, root_dir):
    rel_dir = os.path.dirname(os.path.relpath(filepath, root_dir))
    if rel_dir == '.' or rel_dir == '':
        return './pure-logo-v4.png'
    elif rel_dir == 'digital-twin-page':
        return 'assets/pure-logo.png'
    elif rel_dir == 'BlogEdu':
        return 'logo.png'
    else:
        depth = len(rel_dir.split(os.sep))
        dots = '../' * depth
        return f"{dots}pure-logo-v4.png"

def clean_title(title):
    if not title:
        return ""
    # strip HTML tags if any
    title = re.sub(r'<[^>]*>', '', title)
    title = title.replace('\n', ' ').replace('\r', '').strip()
    # clean extra spaces
    title = re.sub(r'\s+', ' ', title)
    return title

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find title
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = clean_title(title_match.group(1))
    else:
        # Fallback to filename
        base = os.path.basename(filepath)
        name, _ = os.path.splitext(base)
        title = name.replace('-', ' ').replace('_', ' ').title()

    # Find description
    desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', content, re.IGNORECASE | re.DOTALL)
    if not desc_match:
        # try the other attribute order
        desc_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', content, re.IGNORECASE | re.DOTALL)
    
    if desc_match:
        desc = desc_match.group(1).replace('\n', ' ').strip()
        desc = re.sub(r'\s+', ' ', desc)
    else:
        desc = f"Explore Pure AI's {title}. Discover our state-of-the-art autonomous systems, intelligent agents, and custom enterprise robotics."

    has_desc = re.search(r'<meta[^>]*name=["\']description["\']', content, re.IGNORECASE)
    has_og_title = re.search(r'<meta[^>]*property=["\']og:title["\']', content, re.IGNORECASE)
    has_og_desc = re.search(r'<meta[^>]*property=["\']og:description["\']', content, re.IGNORECASE)
    has_og_image = re.search(r'<meta[^>]*property=["\']og:image["\']', content, re.IGNORECASE)

    to_inject = []
    
    if not has_desc:
        to_inject.append(f'    <meta name="description" content="{desc}">')
    if not has_og_title:
        to_inject.append(f'    <meta property="og:title" content="{title}">')
    if not has_og_desc:
        to_inject.append(f'    <meta property="og:description" content="{desc}">')
    if not has_og_image:
        og_image = get_og_image(filepath, ROOT_DIR)
        to_inject.append(f'    <meta property="og:image" content="{og_image}">')

    if not to_inject:
        return False, []

    # Inject before </head>
    head_end_match = re.search(r'</head>', content, re.IGNORECASE)
    if not head_end_match:
        print(f"Warning: </head> not found in {filepath}")
        return False, []

    # Insert with some nice spacing matching head
    injection_str = "\n".join(to_inject) + "\n"
    idx = head_end_match.start()
    
    new_content = content[:idx] + injection_str + content[idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, to_inject

def main():
    html_files = []
    for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith('.html'):
                html_files.append(os.path.join(dirpath, f))

    modified_count = 0
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, ROOT_DIR)
        modified, injected = process_file(filepath)
        if modified:
            modified_count += 1
            print(f"Modified {rel_path}:")
            for line in injected:
                print(f"  + {line.strip()}")

    print(f"\nDone. Successfully injected metadata into {modified_count} files.")

if __name__ == '__main__':
    main()
