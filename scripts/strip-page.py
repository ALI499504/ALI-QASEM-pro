#!/usr/bin/env python3
"""
Strip everything from page.tsx except: top ticker, header, and the live chart section.
Delete: Account Summary, Signal Card + Live Price, all sections from 3.5 onward,
and the AIChatAssistant floating panel.
"""
import re

PAGE = "/home/z/my-project/src/app/page.tsx"

with open(PAGE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find line indexes (0-indexed)
def find_line(needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1

# Locate boundaries
start_sec1 = find_line("=== SECTION 1: Account Summary ===")
start_sec3 = find_line("=== SECTION 3: Full-Width Live Chart ===")
end_sec3_close = -1
# Find the </section> that closes SECTION 3 (it's the next </section> after SECTION 3 starts)
# But SECTION 3 contains nested divs and one </section> at the end
# Walk forward to find the </section> at depth 0 from the section start
depth = 0
in_section_3 = False
for i in range(start_sec3, len(lines)):
    line = lines[i]
    if "<section" in line:
        depth += 1
        in_section_3 = True
    if "</section>" in line:
        depth -= 1
        if in_section_3 and depth == 0:
            end_sec3_close = i
            break

print(f"SECTION 1 starts at line {start_sec1 + 1}")
print(f"SECTION 3 starts at line {start_sec3 + 1}")
print(f"SECTION 3 closes at line {end_sec3_close + 1}")

# Find </main>
end_main = find_line("</main>", end_sec3_close)
print(f"</main> at line {end_main + 1}")

# Find <AIChatAssistant
ai_chat = find_line("<AIChatAssistant", end_main)
print(f"<AIChatAssistant /> at line {ai_chat + 1}")

# Build new file:
# 1. Keep everything up to and including the line "<main ...>" (line 362)
main_open_idx = find_line('<main className="flex-1 w-full max-w-[1700px]')
print(f"<main> opens at line {main_open_idx + 1}")

new_lines = []
# Keep everything up to and including <main> opening
new_lines.extend(lines[:main_open_idx + 1])

# Add the chart section (SECTION 3) — preserve indentation (8 spaces)
# We need to take lines from start_sec3 to end_sec3_close (inclusive), preserving them
chart_lines = lines[start_sec3:end_sec3_close + 1]
new_lines.extend(chart_lines)

# Add a blank line then </main>
new_lines.append("\n      </main>\n")

# Skip everything else up to and including </main>
# Then keep the rest (which includes auth modals etc.) but DELETE <AIChatAssistant />
# Find what comes after </main>
after_main_idx = end_main + 1
# Add everything after </main> except <AIChatAssistant /> line
for i in range(after_main_idx, len(lines)):
    line = lines[i]
    if "<AIChatAssistant" in line:
        continue  # skip
    new_lines.append(line)

with open(PAGE, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"\nDone. New file has {len(new_lines)} lines (was {len(lines)}).")
