import ftfy

file_path = r"C:\HRSuite_Project\frontend\src\App.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Before: {len(content)} chars")

# Use ftfy to fix encoding issues only, keeping JSX syntax intact
fixed = ftfy.fix_text(
    content,
    fix_entities=False,       # don't change &apos; etc.
    fix_latin_ligatures=False, # don't change character sequences
    fix_character_width=False,
    uncurl_quotes=False,       # don't change quote styles
    fix_line_breaks=False,
    normalization=None         # don't normalize Unicode
)

print(f"After:  {len(fixed)} chars")

# Show a sample of fixes
sample_lines = [l for l in fixed.split('\n') if any(c > '\x7f' for c in l)]
print(f"Non-ASCII lines: {len(sample_lines)}")
for ln in sample_lines[:15]:
    print(f"  {ln.strip()[:100]}")

# Write back without BOM, preserving LF line endings
with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(fixed)

print("\nDone - file written.")
