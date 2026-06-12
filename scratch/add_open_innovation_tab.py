import os
import re

directory = '/home/ubuntu/Desktop/PURE AI WEBSITE MAINTANACE/Final Pure AI Website1/Final Pure AI Website/pure ai'

modified_count = 0

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Skip files that don't have the innovation navigation link
            if 'href="./innovation"' not in content:
                continue
            
            # Skip if "Open Innovation" tab is already present (idempotency check)
            if 'Open Innovation' in content:
                print(f"Skipping {file} (already contains 'Open Innovation')")
                continue
            
            new_content = content
            
            # 1. Desktop links with data-cursor (e.g., in index.html)
            # Match line starting with whitespace, then the link
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation" data-cursor>Innovation</a>',
                r'\1<a href="./innovation" data-cursor>Innovation</a>\n\1<a href="./bohrai" data-cursor>Open Innovation</a>',
                new_content
            )
            
            # 2. Desktop link with class="active" (in innovation.html)
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation" class="active">Innovation</a>',
                r'\1<a href="./innovation" class="active">Innovation</a>\n\1<a href="./bohrai">Open Innovation</a>',
                new_content
            )
            
            # 3. Standard desktop/footer links without data-cursor/class (e.g., in services.html)
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation">Innovation</a>',
                r'\1<a href="./innovation">Innovation</a>\n\1<a href="./bohrai">Open Innovation</a>',
                new_content
            )
            
            # 4. Mobile overlay links with data-mobile-link
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation" data-mobile-link>Innovation</a>',
                r'\1<a href="./innovation" data-mobile-link>Innovation</a>\n\1<a href="./bohrai" data-mobile-link>Open Innovation</a>',
                new_content
            )
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Successfully updated: {file}")
                modified_count += 1
            else:
                print(f"Warning: No match found to replace in {file}")

print(f"\nTotal files updated: {modified_count}")
