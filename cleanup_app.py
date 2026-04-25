import re

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

def find_component_bounds(name):
    start_idx = -1
    for i, line in enumerate(lines):
        if re.match(r'^export\s+function\s+' + name + r'\b', line) or re.match(r'^function\s+' + name + r'\b', line) or re.match(r'^const\s+' + name + r'\s*=', line):
            start_idx = i
            break
            
    if start_idx == -1:
        return -1, -1

    brace_count = 0
    in_component = False
    end_idx = -1
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        if not in_component and brace_count > 0:
            in_component = True
            
        if in_component and brace_count == 0:
            end_idx = i
            break
            
    return start_idx, end_idx

components_to_remove = [
    "EntryMetaTags", "HomeEntryItem", "TaskList", "NoteList", "CalList", "MediaList", "LinkList",
    "CatListScreen", "BookmarkRail", "CatDetailScreen",
    "EntryDetailScreen"
]

ranges_to_remove = []

for c in components_to_remove:
    start, end = find_component_bounds(c)
    if start != -1 and end != -1:
        # include preceding comments
        comment_start = start
        while comment_start > 0 and (lines[comment_start-1].strip().startswith('/*') or lines[comment_start-1].strip() == ''):
            comment_start -= 1
        ranges_to_remove.append((comment_start, end))

ranges_to_remove.sort(key=lambda x: x[0], reverse=True)

for start, end in ranges_to_remove:
    del lines[start:end+1]

# Make sure SwipeToDelete is exported
for i, line in enumerate(lines):
    if line.startswith('function SwipeToDelete'):
        lines[i] = 'export ' + line
        break

# Add new imports near the top
import_statement = """
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";
import { CatListScreen, BookmarkRail, CatDetailScreen } from "./FolderScreens";
import { EntryDetailScreen } from "./EntryDetailScreen";
"""
for i, line in enumerate(lines):
    if line.startswith('import ') and 'lucide-react' in line:
        lines.insert(i + 1, import_statement)
        break

# Make helpers exported
exports = ["uid", "TODAY", "isOld", "isToday", "getNextBirthday", "fmtDate", "fmtRelative", "getTaskGroup", "getYouTubeVideoId", "BOOKMARKS", "NOTIF_RED", "NOTIF_NAVY", "NOTIF_VIOL", "CAT_ICONS", "SEED", "computeNotif", "ID_BIRTHDAYS", "TagIcon", "ArchiveIcon", "BookmarkIcon", "CustomSettingsIcon"]

for i, line in enumerate(lines):
    for exp in exports:
        if line.startswith(f"const {exp} =") or line.startswith(f"function {exp}(") or line.startswith(f"const {exp}="):
            if not line.startswith("export"):
                lines[i] = "export " + line

with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("App.jsx has been cleaned up and imports added.")
