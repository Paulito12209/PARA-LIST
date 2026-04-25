import subprocess
import re
import os

print("Stelle App.jsx aus Git wieder her und teile die Komponenten korrekt auf...")

# 1. Recover App.jsx from Git HEAD
result = subprocess.run(['git', 'show', 'HEAD:src/App.jsx'], capture_output=True, text=True)
if result.returncode != 0:
    print("Fehler beim Lesen aus Git. Kann src/App.jsx nicht wiederherstellen.")
    exit(1)

original_code = result.stdout
lines = original_code.splitlines(True)

def extract_component(name):
    start_idx = -1
    for i, line in enumerate(lines):
        if re.match(r'^export\s+function\s+' + name + r'\b', line) or re.match(r'^function\s+' + name + r'\b', line) or re.match(r'^const\s+' + name + r'\s*=', line):
            start_idx = i
            break
            
    if start_idx == -1:
        return None, -1, -1

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
            
    if end_idx != -1:
        return "".join(lines[start_idx:end_idx+1]), start_idx, end_idx
    return None, -1, -1

components_entry_lists = ["EntryMetaTags", "HomeEntryItem", "TaskList", "NoteList", "CalList", "MediaList", "LinkList"]
components_folder_screens = ["CatListScreen", "BookmarkRail", "CatDetailScreen"]
components_entry_detail = ["EntryDetailScreen"]

extracted = {}
ranges_to_remove = []

for c in components_entry_lists + components_folder_screens + components_entry_detail:
    code, start, end = extract_component(c)
    if code:
        # Make sure it's exported
        if not code.startswith('export '):
            code = 'export ' + code
        extracted[c] = code
        
        # Mark lines for deletion from App.jsx
        comment_start = start
        while comment_start > 0 and (lines[comment_start-1].strip().startswith('/*') or lines[comment_start-1].strip() == ''):
            comment_start -= 1
        ranges_to_remove.append((comment_start, end))

# Remove extracted components from App.jsx
ranges_to_remove.sort(key=lambda x: x[0], reverse=True)
for start, end in ranges_to_remove:
    del lines[start:end+1]

# Export SwipeToDelete
for i, line in enumerate(lines):
    if line.startswith('function SwipeToDelete'):
        lines[i] = 'export ' + line
        break

# Add new imports
import_statement = """
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";
import { CatListScreen, BookmarkRail, CatDetailScreen } from "./FolderScreens";
import { EntryDetailScreen } from "./EntryDetailScreen";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";
"""
for i, line in enumerate(lines):
    if line.startswith('import ') and 'lucide-react' in line:
        lines.insert(i + 1, import_statement)
        break

# Delete helpers block from App.jsx (since it's now in shared.jsx)
start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if '/* ── helpers' in l:
        start_idx = i
        break
if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if '/* ── Command Panel' in lines[i]:
            end_idx = i - 1
            break
    if end_idx != -1:
        del lines[start_idx:end_idx+1]

# Write App.jsx
with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

def write_component_file(path, components):
    with open(path, 'w') as f:
        f.write("import React, { useState, useRef, useEffect, useCallback } from 'react';\n")
        f.write("import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';\n")
        f.write('import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";\n')
        f.write('import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";\n')
        f.write('import { useInactivity } from "./hooks/useInactivity";\n')
        if path != 'src/EntryLists.jsx':
            f.write('import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";\n')
        f.write('\n')
        for c in components:
            if c in extracted:
                f.write(extracted[c])
                f.write("\n\n")

write_component_file('src/EntryLists.jsx', components_entry_lists)
write_component_file('src/FolderScreens.jsx', components_folder_screens)
write_component_file('src/EntryDetailScreen.jsx', components_entry_detail)

print("Der echte Code wurde erfolgreich aus Git wiederhergestellt und korrekt in die 3 Dateien extrahiert!")
