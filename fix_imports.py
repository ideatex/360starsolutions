import os
import re
from pathlib import Path

def resolve_import(filepath, import_path):
    # filepath: e.g., f:/360 Star Solutions/src/server/app.module.ts
    # import_path: e.g., ./app.controller
    dir_path = filepath.parent
    target_path = (dir_path / import_path).resolve()
    
    # Check if target is inside src/client, src/server, src/shared
    root_path = Path(r"f:/360 Star Solutions/src").resolve()
    try:
        rel = target_path.relative_to(root_path)
        parts = rel.parts
        if parts[0] == "client":
            return f"@client/{'/'.join(parts[1:])}"
        elif parts[0] == "server":
            return f"@server/{'/'.join(parts[1:])}"
        elif parts[0] == "shared":
            return f"@shared/{'/'.join(parts[1:])}"
    except ValueError:
        pass
    
    # If the target path points to a file without extension, we might need to handle it.
    # But usually, the resolved path without extension still matches the directory structure.
    return import_path

def process_file(filepath):
    content = filepath.read_text(encoding='utf-8')
    
    # Regex to match import/export statements with relative paths
    # Matches: import ... from './...' or '../...'
    pattern = re.compile(r"""(import|export)(.*?)from\s+['"](\.[^'"]+)['"]""", re.MULTILINE | re.DOTALL)
    
    def replacer(match):
        keyword = match.group(1)
        imports = match.group(2)
        rel_path = match.group(3)
        
        new_path = resolve_import(filepath, rel_path)
        return f"{keyword}{imports}from '{new_path}'"
    
    new_content = pattern.sub(replacer, content)
    
    # Also handle dynamic imports: import('./...')
    pattern_dyn = re.compile(r"""import\(['"](\.[^'"]+)['"]\)""")
    def replacer_dyn(match):
        rel_path = match.group(1)
        new_path = resolve_import(filepath, rel_path)
        return f"import('{new_path}')"
    
    new_content = pattern_dyn.sub(replacer_dyn, new_content)
    
    if new_content != content:
        filepath.write_text(new_content, encoding='utf-8')
        print(f"Updated {filepath}")

def main():
    src_dir = Path(r"f:/360 Star Solutions/src")
    for filepath in src_dir.rglob("*"):
        if filepath.is_file() and filepath.suffix in [".ts", ".tsx"]:
            process_file(filepath)

if __name__ == "__main__":
    main()
