import re

try:
    print('Starting login...')
    with open('orig_files/login_page.tsx.clean', 'r', encoding='utf-8') as f:
        login_content = f.read()
    
    # Remove register links more robustly by splitting lines
    new_login_lines = []
    skip = False
    for line in login_content.split('\n'):
        if "Don't have an account?" in line or 'href="/auth/register"' in line:
            skip = True
        if skip and '</div>' in line:
            skip = False
            continue
        if skip and '</Link>' in line:
            skip = False
            continue
        if not skip:
            new_login_lines.append(line)
            
    with open(r'f:\360 Star Solutions\frontend\src\app\auth\login\page.tsx', 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_login_lines))
    print('Updated login_page.tsx')

    print('Starting landing...')
    with open('orig_files/page.tsx.clean', 'r', encoding='utf-8') as f:
        landing_content = f.read()

    landing_content = re.sub(r'<Link href="/auth/register">[\s\S]*?</Link>', '', landing_content)

    with open(r'f:\360 Star Solutions\frontend\src\app\page.tsx', 'w', encoding='utf-8') as f:
        f.write(landing_content)
    print('Updated page.tsx')
except Exception as e:
    import traceback
    traceback.print_exc()
