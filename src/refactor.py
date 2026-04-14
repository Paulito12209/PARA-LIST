import re

app_path = '/Users/paulangeleschaquire/Documents/1 - Projekte/PARA-LIST/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { useState, useRef, useCallback } from "react";',
    'import { useState, useRef, useCallback } from "react";\nimport { I18N, getCC, getTABS } from "./i18n";'
)

# 2. Strip old CC and TABS
content = re.sub(r'const CC = \{[\s\S]*?dim: "#081408" \},\n\};\n', '', content)
content = re.sub(r'const TABS = \[[\s\S]*?Icon: Calendar \},\n\];\n', '', content)

# 3. fmtDate
content = content.replace('const fmtDate = (d) =>', 'const fmtDate = (d, locale) =>')
content = content.replace('toLocaleDateString("de-DE",', 'toLocaleDateString(locale,')

# 4. App component setup
content = content.replace(
    '  const theme = state.theme || "dark";',
    '  const theme = state.theme || "dark";\n  const lang = state.lang || "de";\n  const t = I18N[lang];\n  const CC = getCC(t);\n  const TABS = getTABS(t);'
)

content = content.replace(
    'SettingsModal({ theme, setTheme, onClose })',
    'SettingsModal({ theme, setTheme, lang, setLang, t, onClose })'
)

# Pass them down
content = content.replace(
    '<CommandPanel',
    '<CommandPanel\n        t={t}\n        lang={lang}'
)

content = content.replace(
    '<HomeScreen',
    '<HomeScreen\n            t={t}\n            CC={CC}\n            TABS={TABS}\n            lang={lang}'
)

content = content.replace(
    '<CatListScreen',
    '<CatListScreen\n            t={t}\n            CC={CC}'
)

content = content.replace(
    '<CatDetailScreen',
    '<CatDetailScreen\n                t={t}\n                CC={CC}'
)

content = content.replace(
    '<CreateModal',
    '<CreateModal\n          t={t}\n          CC={CC}'
)

content = content.replace(
    '<NewCatModal',
    '<NewCatModal\n          t={t}\n          CC={CC}'
)

content = content.replace(
    '<SettingsModal',
    '<SettingsModal\n          t={t}\n          lang={lang}\n          setLang={(l) => setState(s => ({ ...s, lang: l }))}'
)

# Update Component definitions
content = content.replace('function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings }) {', 'function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings, t, lang }) {')
content = content.replace('function TaskList({ entries, cats, onToggle, onDelete }) {', 'function TaskList({ entries, cats, onToggle, onDelete, t, CC, lang }) {')
content = content.replace('function NoteList({ entries, cats, onDelete }) {', 'function NoteList({ entries, cats, onDelete, t, CC }) {')
content = content.replace('function CalList({ entries, cats, onDelete }) {', 'function CalList({ entries, cats, onDelete, t, CC, lang }) {')
content = content.replace('function MediaList({ entries, onDelete }) {', 'function MediaList({ entries, onDelete, t }) {')
content = content.replace('function LinkList({ entries, onDelete }) {', 'function LinkList({ entries, onDelete, t }) {')

content = content.replace('function HomeScreen({', 'function HomeScreen({\n  t,\n  CC,\n  TABS,\n  lang,')
content = content.replace('function CatListScreen({ type, cats, onOpen, onAdd, onBack }) {', 'function CatListScreen({ type, cats, onOpen, onAdd, onBack, t, CC }) {')
content = content.replace('function CatDetailScreen({', 'function CatDetailScreen({\n  t,\n  CC,')
content = content.replace('function CreateModal({ type, cats, initialCatId, onSave, onClose }) {', 'function CreateModal({ type, cats, initialCatId, onSave, onClose, t, CC }) {')
content = content.replace('function NewCatModal({ type, onSave, onClose }) {', 'function NewCatModal({ type, onSave, onClose, t, CC }) {')

# Pass props into lists inside HomeScreen and CatDetailScreen
# Wait, let's just do a blanket regex for lists
content = re.sub(r'<TaskList\n\s*entries', r'<TaskList\n                entries', content)
content = content.replace('<TaskList', '<TaskList t={t} CC={CC} lang={lang}')
content = content.replace('<NoteList', '<NoteList t={t} CC={CC}')
content = content.replace('<CalList', '<CalList t={t} CC={CC} lang={lang}')
content = content.replace('<MediaList', '<MediaList t={t}')
content = content.replace('<LinkList', '<LinkList t={t}')

# Remove GREET definition
content = re.sub(r'const greet = \(n\) =>[\s\S]*?\`,\s*\$\{n\}\`;\n', '', content)

# Inner text replacements
content = content.replace('greet(user.name)', 't.greeting(new Date().getHours(), user.name)')
content = content.replace('new Date().toLocaleDateString("de-DE",', 'new Date().toLocaleDateString(t.locale,')
content = content.replace('"de-DE", {', 't.locale, {') # just in case
content = content.replace('Keine offenen Einträge für heute 🎉', '{t.emptyDrawer}')
content = content.replace('"überfällig"', 't.overdue')
content = content.replace('"heute"', 't.today')
content = content.replace('"Heute"', 't.todayCap')
content = content.replace('e.time + " Uhr"', 'e.time + (t.oclock ? " " + t.oclock : "")')

content = content.replace('Keine ${tabCfg?.label} · Doppeltippe zum Erstellen', '{t.noEntries(tabCfg?.label)}')
content = content.replace('Noch keine {cfg.label} erstellt.', '{t.noCats(cfg.label).split("\\n")[0]}')
content = content.replace('Tippe auf + um zu starten.', '{t.noCats(cfg.label).split("\\n")[1]}')
content = content.replace('Neue {label}', '{t.newLabel(label)}')
content = content.replace('Neues {cfg.sing}', '{t.newSing(cfg.sing)}')
content = content.replace('placeholder="Titel…"', 'placeholder={t.titlePlaceholder}')
content = content.replace('placeholder="Notiz hinzufügen…"', 'placeholder={t.addNotePlaceholder}')
content = content.replace('placeholder="Notiz schreiben…"', 'placeholder={t.writeNotePlaceholder}')
content = content.replace('Kein Projekt / Bereich', '{t.noProject}')
content = content.replace('placeholder={`${cfg.sing} benennen…`}', 'placeholder={t.namePlaceholder(cfg.sing)}')
content = content.replace('>Erstellen<', '>{t.createBtn}<')
content = content.replace('>Einstellungen<', '>{t.settings}<')
content = content.replace('>Erscheinungsbild<', '>{t.appearance}<')
content = content.replace('>Dunkel<', '>{t.dark}<')
content = content.replace('>Hell<', '>{t.light}<')
content = content.replace('>Schließen<', '>{t.closeBtn}<')
content = content.replace('+ Datum', '{t.addDate}')
content = content.replace('placeholder="Schreib hier deine Gedanken, Ideen und Notizen..."', 'placeholder={t.writeThoughts}')
content = content.replace('`"${cat.name}" wirklich löschen?`', 't.confirmDelete(cat.name)')
content = content.replace('>Keine Aufgaben<', '>{t.noTasks}<')
content = content.replace('>Keine Termine<', '>{t.noCal}<')
content = content.replace('>Keine Ressourcen<', '>{t.noMedia}<')
content = content.replace('>Keine Quellen<', '>{t.noLink}<')
content = content.replace('label: "Bild"', 'label: t.image')
content = content.replace('label: "Video"', 'label: t.video')
content = content.replace('label: "Audio"', 'label: t.audio')
content = content.replace('label: "Dokument"', 'label: t.document')
content = content.replace('label: "Datei"', 'label: t.file')
content = content.replace('? "Aufgabe"', '? t.task')
content = content.replace(': "Notiz"', ': t.note')
content = content.replace(': "Termin"', ': t.calSing')
content = content.replace(': "Ressource"', ': t.mediaSing')
content = content.replace(': "Quelle"', ': t.linkSing')

# Additional tweaks for Tasks
content = content.replace('isToday(e.due) ? "Heute" : fmtDate(e.due)', 'isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)')
content = content.replace('fmtDate(cat.date)', 'fmtDate(cat.date, t.locale)')

# The modal title uses new {label} but label is computed
# const label = type === "task" ? "Aufgabe" : ...
# Let's replace the label computation
label_computed = """const label =
    type === "task" ? t.task : 
    type === "note" ? t.note : 
    type === "calendar" ? t.calSing : 
    type === "media" ? t.mediaSing : 
    t.linkSing;"""

content = re.sub(r'const label =\n    type === "task" \? "Aufgabe" : [\s\S]*?"Quelle";', label_computed, content)

# Settings modal inject: Language Switcher
settings_toggle = """            <div className="theme-toggle">
              <button 
                className={`theme-toggle__btn ${theme === "dark" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                {t.dark}
              </button>
              <button 
                className={`theme-toggle__btn ${theme === "light" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setTheme("light")}
              >
                {t.light}
              </button>
            </div>
          </div>
          
          <div className="settings-row" style={{ marginTop: 24 }}>
            <span className="settings-label">{t.language}</span>
            <div className="theme-toggle">
              <button 
                className={`theme-toggle__btn ${lang === "de" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("de")}
              >
                DE
              </button>
              <button 
                className={`theme-toggle__btn ${lang === "en" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button 
                className={`theme-toggle__btn ${lang === "es" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("es")}
              >
                ES
              </button>
            </div>
          </div>"""

content = re.sub(r'            <div className="theme-toggle">[\s\S]*?            </div>\n          </div>', settings_toggle, content)

# Ensure fmtDate usages are complete! 
# We caught `isToday(e.due) ? "Heute" : fmtDate(e.due)` and `fmtDate(cat.date)`
# Any other fmtDate? Let's check with replacing remaining
content = re.sub(r'fmtDate\(([^,]+)\)', r'fmtDate(\g<1>, t.locale)', content)

# Check component prop definitions inside map
content = content.replace('onClick={() => name.trim() && onSave(name.trim())}', 'onClick={() => name.trim() && onSave(name.trim())}')

# Finally write file
with open(app_path, 'w') as f:
    f.write(content)
