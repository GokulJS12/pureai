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
            
            # Skip if doesn't contain Open Innovation
            if 'Open Innovation' not in content:
                continue
            
            new_content = content
            
            # 1. Remove standalone BOHRAI Hub link in index.html (header, mobile menu, and footer)
            new_content = re.sub(r'[ \t]*<a href="\./bohrai" data-cursor>BOHRAI Hub</a>\n?', '', new_content)
            new_content = re.sub(r'[ \t]*<a href="\./bohrai" data-mobile-link>BOHRAI Hub</a>\n?', '', new_content)
            
            # 2. Desktop Header: Dropdown with data-cursor (e.g. index.html)
            # Find Innovation, Open Innovation, and the Contact button
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation" data-cursor>Innovation</a>\n\1<a href="\./bohrai" data-cursor>Open Innovation</a>\n\1<a href="([^"]*)" class="cta" data-cursor>Contact</a>',
                r'\1<a href="./innovation" data-cursor>Innovation</a>\n\1<div class="nav-dropdown">\n\1    <a href="#" data-cursor>Open Innovation <i class="ph ph-caret-down dd-arrow"></i></a>\n\1    <div class="dd-menu">\n\1        <a href="./bohrai"><i class="ph ph-lightbulb"></i> BOHRAI Hub</a>\n\1    </div>\n\1</div>\n\1<a href="\2" class="cta" data-cursor>Contact</a>',
                new_content
            )
            
            # 3. Desktop Header: Dropdown with class="active" (e.g. innovation.html)
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation" class="active">Innovation</a>\n\1<a href="\./bohrai">Open Innovation</a>\n\1<a href="([^"]*)" class="cta">Contact</a>',
                r'\1<a href="./innovation" class="active">Innovation</a>\n\1<div class="nav-dropdown">\n\1    <a href="#">Open Innovation <i class="ph ph-caret-down dd-arrow"></i></a>\n\1    <div class="dd-menu">\n\1        <a href="./bohrai"><i class="ph ph-lightbulb"></i> BOHRAI Hub</a>\n\1    </div>\n\1</div>\n\1<a href="\2" class="cta">Contact</a>',
                new_content
            )
            
            # 4. Desktop Header: Dropdown without data-cursor (e.g. services.html)
            new_content = re.sub(
                r'([ \t]*)<a href="\./innovation">Innovation</a>\n\1<a href="\./bohrai">Open Innovation</a>\n\1<a href="([^"]*)" class="cta">Contact</a>',
                r'\1<a href="./innovation">Innovation</a>\n\1<div class="nav-dropdown">\n\1    <a href="#">Open Innovation <i class="ph ph-caret-down dd-arrow"></i></a>\n\1    <div class="dd-menu">\n\1        <a href="./bohrai"><i class="ph ph-lightbulb"></i> BOHRAI Hub</a>\n\1    </div>\n\1</div>\n\1<a href="\2" class="cta">Contact</a>',
                new_content
            )
            
            # 5. Mobile Menu: Accordion toggle for Open Innovation
            new_content = re.sub(
                r'([ \t]*)<a href="\./bohrai" data-mobile-link>Open Innovation</a>\n\1<a href="([^"]*)" data-mobile-link>Contact</a>',
                r'\1<div class="mob-accordion">\n\1    <button class="mob-accordion-toggle" aria-expanded="false">Open Innovation <i class="ph ph-caret-down"></i></button>\n\1    <div class="mob-accordion-body">\n\1        <a href="./bohrai" data-mobile-link><i class="ph ph-lightbulb"></i> BOHRAI Hub</a>\n\1    </div>\n\1</div>\n\1<a href="\2" data-mobile-link>Contact</a>',
                new_content
            )
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Rearranged navigation in: {file}")
                modified_count += 1
            else:
                print(f"Warning: No match found to rearrange in {file}")

print(f"\nTotal files updated: {modified_count}")
