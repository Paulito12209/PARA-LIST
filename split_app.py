import re

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

def extract_component(name):
    start_idx = -1
    for i, line in enumerate(lines):
        if re.match(r'^function\s+' + name + r'\b', line) or re.match(r'^const\s+' + name + r'\s*=', line):
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
        extracted[c] = code
        # expand to include preceding comments/newlines if they look like section headers
        # Let's check for comments just above start_idx
        comment_start = start
        while comment_start > 0 and (lines[comment_start-1].strip().startswith('/*') or lines[comment_start-1].strip() == ''):
            comment_start -= 1
        ranges_to_remove.append((comment_start, end))
    else:
        print(f"Could not find {c}")

ranges_to_remove.sort(key=lambda x: x[0], reverse=True)

# Delete from bottom to top to preserve indices
for start, end in ranges_to_remove:
    del lines[start:end+1]

with open('src/App_new.jsx', 'w') as f:
    f.writelines(lines)

with open('src/EntryLists.jsx', 'w') as f:
    f.write("import React, { useState, useRef, useEffect, useCallback } from 'react';\n")
    f.write("import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';\n")
    f.write('import { isOld, isToday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, SwipeToDelete } from "./App.jsx";\n\n')
    f.write('import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./App.jsx";\n\n')
    for c in components_entry_lists:
        f.write("export " + extracted.get(c, ''))
        f.write("\n\n")

with open('src/FolderScreens.jsx', 'w') as f:
    f.write("import React, { useState, useRef, useEffect, useCallback } from 'react';\n")
    f.write("import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';\n")
    f.write('import { isOld, isToday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, ID_BIRTHDAYS, BOOKMARKS, CAT_ICONS } from "./App.jsx";\n\n')
    f.write('import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./App.jsx";\n\n')
    f.write('import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists.jsx";\n')
    f.write('import { useInactivity } from "./hooks/useInactivity";\n\n')
    for c in components_folder_screens:
        f.write("export " + extracted.get(c, ''))
        f.write("\n\n")

with open('src/EntryDetailScreen.jsx', 'w') as f:
    f.write("import React, { useState, useRef, useEffect, useCallback } from 'react';\n")
    f.write("import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';\n")
    f.write('import { isOld, isToday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, CAT_ICONS } from "./App.jsx";\n\n')
    f.write('import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./App.jsx";\n')
    f.write('import { useInactivity } from "./hooks/useInactivity";\n\n')
    for c in components_entry_detail:
        f.write("export " + extracted.get(c, ''))
        f.write("\n\n")

