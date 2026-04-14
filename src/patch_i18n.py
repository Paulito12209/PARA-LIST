import re
import os

app_path = '/Users/paulangeleschaquire/Documents/1 - Projekte/PARA-LIST/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { useState, useRef, useCallback } from "react";',
    'import { useState, useRef, useCallback, createContext, useContext } from "react";\nimport { I18N, getCC, getTABS } from "./i18n";'
)

# 2. Context creation
content = content.replace(
    '/* ── seed data',
    'export const LangContext = createContext();\n\n/* ── seed data'
)

# 3. Strip old CC and TABS
content = re.sub(r'const CC = \{[\s\S]*?dim: "#081408" \},\n\};\n\n', '', content)
content = re.sub(r'const TABS = \[[\s\S]*?Icon: Calendar \},\n\];\n\n', '', content)

# 4. Remove greet helper
content = re.sub(r'const greet = \(n\) =>\n  \(H < 12 \? "Guten Morgen" : H < 18 \? "Guten Tag" : "Guten Abend"\) \+ `, \$\{n\}`;', '', content)

# 5. Fix fmtDate to accept locale
content = content.replace('const fmtDate = (d) =>', 'const fmtDate = (d, locale) =>')
content = content.replace('toLocaleDateString("de-DE",', 'toLocaleDateString(locale,')

# Update all fmtDate usages to pass locale. Since it's used inside components, we can replace fmtDate( with fmtDate(..., t.locale)
# There are usages like: fmtDate(cat.date) -> fmtDate(cat.date, t.locale)
content = re.sub(r'fmtDate\(([^)]+)\)', r'fmtDate(\g<1>, t.locale)', content)

# 6. App component changes
content = content.replace('export default function App() {', 'function AppRoot() {\n  const { lang } = useContext(LangContext);\n  const t = I18N[lang];\n  const CC = getCC(t);\n  const TABS = getTABS(t);\n')
content = content.replace('const [state, setState, isLoaded] = usePersistedState(SEED);', 'const [state, setState] = useContext(LangContext);') # wait, no

# Wait, it's better to structure App as:
# function AppContent() {
#   const [state, setState] = usePersistedState(SEED);
#   ...
# }
# But we need lang from state to provide it!
# Let's use multi_replace_file_content carefully later if python breaks. 

