// ============================================================
// PARA·LIST – Flashcard preset decks
// 10 Sprachen × 15 Karten = 150 Vokabeln (Grundwortschatz).
// Reine Daten – keine React-Komponenten (Fast-Refresh-safe).
// Karten-`front` = Fremdsprache, `back` = Deutsch.
// Übernommen als Datengrundlage aus der Glaze-FlashCard-Referenz.
// ============================================================

/**
 * @typedef {Object} FlashCard
 * @property {string} id
 * @property {string} front  Fremdsprachiges Wort
 * @property {string} back   Deutsche Übersetzung
 * @property {number} createdAt
 *
 * @typedef {Object} FlashDeck
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} description
 * @property {[string, string]} languagePair  [from, to]
 * @property {string[]} tags
 * @property {boolean} isPreset
 * @property {string|null} catId  Verknüpfte Ressourcen-Kategorie (Spiegel)
 * @property {FlashCard[]} cards
 * @property {number} createdAt
 */

const PRESETS = [
  {
    id: "preset-english",
    name: "Englisch Vokabeln",
    emoji: "🇬🇧",
    description: "Grundwortschatz Englisch — die häufigsten Wörter",
    languagePair: ["Englisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["hello", "hallo"],
      ["thank you", "danke"],
      ["please", "bitte"],
      ["yes / no", "ja / nein"],
      ["good morning", "guten Morgen"],
      ["how are you?", "wie geht es dir?"],
      ["water", "Wasser"],
      ["bread", "Brot"],
      ["friend", "Freund / Freundin"],
      ["house", "Haus"],
      ["to learn", "lernen"],
      ["to understand", "verstehen"],
      ["beautiful", "schön"],
      ["important", "wichtig"],
      ["today", "heute"],
    ],
  },
  {
    id: "preset-spanish",
    name: "Spanisch Vokabeln",
    emoji: "🇪🇸",
    description: "Grundwortschatz Spanisch",
    languagePair: ["Spanisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["hola", "hallo"],
      ["gracias", "danke"],
      ["por favor", "bitte"],
      ["sí / no", "ja / nein"],
      ["buenos días", "guten Morgen"],
      ["¿cómo estás?", "wie geht es dir?"],
      ["agua", "Wasser"],
      ["pan", "Brot"],
      ["amigo / amiga", "Freund / Freundin"],
      ["casa", "Haus"],
      ["aprender", "lernen"],
      ["entender", "verstehen"],
      ["bonito / bonita", "schön"],
      ["importante", "wichtig"],
      ["hoy", "heute"],
    ],
  },
  {
    id: "preset-french",
    name: "Französisch Vokabeln",
    emoji: "🇫🇷",
    description: "Grundwortschatz Französisch",
    languagePair: ["Französisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["bonjour", "hallo / guten Tag"],
      ["merci", "danke"],
      ["s'il vous plaît", "bitte"],
      ["oui / non", "ja / nein"],
      ["bonne nuit", "gute Nacht"],
      ["comment ça va ?", "wie geht es dir?"],
      ["l'eau", "Wasser"],
      ["le pain", "Brot"],
      ["ami / amie", "Freund / Freundin"],
      ["la maison", "Haus"],
      ["apprendre", "lernen"],
      ["comprendre", "verstehen"],
      ["beau / belle", "schön"],
      ["important", "wichtig"],
      ["aujourd'hui", "heute"],
    ],
  },
  {
    id: "preset-italian",
    name: "Italienisch Vokabeln",
    emoji: "🇮🇹",
    description: "Grundwortschatz Italienisch",
    languagePair: ["Italienisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["ciao", "hallo / tschüss"],
      ["grazie", "danke"],
      ["per favore", "bitte"],
      ["sì / no", "ja / nein"],
      ["buongiorno", "guten Tag"],
      ["come stai?", "wie geht es dir?"],
      ["acqua", "Wasser"],
      ["pane", "Brot"],
      ["amico / amica", "Freund / Freundin"],
      ["casa", "Haus"],
      ["imparare", "lernen"],
      ["capire", "verstehen"],
      ["bello / bella", "schön"],
      ["importante", "wichtig"],
      ["oggi", "heute"],
    ],
  },
  {
    id: "preset-portuguese",
    name: "Portugiesisch Vokabeln",
    emoji: "🇵🇹",
    description: "Grundwortschatz Portugiesisch",
    languagePair: ["Portugiesisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["olá", "hallo"],
      ["obrigado / obrigada", "danke"],
      ["por favor", "bitte"],
      ["sim / não", "ja / nein"],
      ["bom dia", "guten Morgen"],
      ["como está?", "wie geht es Ihnen?"],
      ["água", "Wasser"],
      ["pão", "Brot"],
      ["amigo / amiga", "Freund / Freundin"],
      ["casa", "Haus"],
      ["aprender", "lernen"],
      ["entender", "verstehen"],
      ["bonito / bonita", "schön"],
      ["importante", "wichtig"],
      ["hoje", "heute"],
    ],
  },
  {
    id: "preset-mandarin",
    name: "Mandarin Vokabeln",
    emoji: "🇨🇳",
    description: "Grundwortschatz Mandarin (Pinyin)",
    languagePair: ["Mandarin", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["你好 (nǐ hǎo)", "hallo"],
      ["谢谢 (xièxie)", "danke"],
      ["请 (qǐng)", "bitte"],
      ["是 / 不是 (shì / bù shì)", "ja / nein"],
      ["早上好 (zǎoshang hǎo)", "guten Morgen"],
      ["你好吗？(nǐ hǎo ma?)", "wie geht es dir?"],
      ["水 (shuǐ)", "Wasser"],
      ["面包 (miànbāo)", "Brot"],
      ["朋友 (péngyǒu)", "Freund / Freundin"],
      ["家 (jiā)", "Haus / zu Hause"],
      ["学习 (xuéxí)", "lernen"],
      ["明白 (míngbái)", "verstehen"],
      ["漂亮 (piàoliang)", "schön"],
      ["重要 (zhòngyào)", "wichtig"],
      ["今天 (jīntiān)", "heute"],
    ],
  },
  {
    id: "preset-hindi",
    name: "Hindi Vokabeln",
    emoji: "🇮🇳",
    description: "Grundwortschatz Hindi (Devanagari + Transkription)",
    languagePair: ["Hindi", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["नमस्ते (namaste)", "hallo"],
      ["धन्यवाद (dhanyavād)", "danke"],
      ["कृपया (kṛpayā)", "bitte"],
      ["हाँ / नहीं (hāṃ / nahīṃ)", "ja / nein"],
      ["सुप्रभात (suprabhāt)", "guten Morgen"],
      ["आप कैसे हैं? (āp kaise haiṃ?)", "wie geht es Ihnen?"],
      ["पानी (pānī)", "Wasser"],
      ["रोटी (roṭī)", "Brot"],
      ["दोस्त (dost)", "Freund / Freundin"],
      ["घर (ghar)", "Haus"],
      ["सीखना (sīkhnā)", "lernen"],
      ["समझना (samajhnā)", "verstehen"],
      ["सुंदर (sundar)", "schön"],
      ["ज़रूरी (zarūrī)", "wichtig"],
      ["आज (āj)", "heute"],
    ],
  },
  {
    id: "preset-russian",
    name: "Russisch Vokabeln",
    emoji: "🇷🇺",
    description: "Grundwortschatz Russisch",
    languagePair: ["Russisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["привет (privet)", "hallo"],
      ["спасибо (spasibo)", "danke"],
      ["пожалуйста (pozhaluysta)", "bitte"],
      ["да / нет (da / net)", "ja / nein"],
      ["доброе утро (dobroye utro)", "guten Morgen"],
      ["как дела? (kak dela?)", "wie geht es dir?"],
      ["вода (voda)", "Wasser"],
      ["хлеб (khleb)", "Brot"],
      ["друг / подруга (drug / podruga)", "Freund / Freundin"],
      ["дом (dom)", "Haus"],
      ["учиться (uchit'sya)", "lernen"],
      ["понимать (ponimat')", "verstehen"],
      ["красивый (krasivyy)", "schön"],
      ["важный (vazhnyy)", "wichtig"],
      ["сегодня (segodnya)", "heute"],
    ],
  },
  {
    id: "preset-arabic",
    name: "Arabisch Vokabeln",
    emoji: "🇸🇦",
    description: "Grundwortschatz Arabisch (mit Transkription)",
    languagePair: ["Arabisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["مرحبا (marḥaban)", "hallo"],
      ["شكرا (shukran)", "danke"],
      ["من فضلك (min faḍlik)", "bitte"],
      ["نعم / لا (naʿam / lā)", "ja / nein"],
      ["صباح الخير (ṣabāḥ al-khayr)", "guten Morgen"],
      ["كيف حالك؟ (kayfa ḥāluk?)", "wie geht es dir?"],
      ["ماء (māʾ)", "Wasser"],
      ["خبز (khubz)", "Brot"],
      ["صديق / صديقة (ṣadīq / ṣadīqa)", "Freund / Freundin"],
      ["بيت (bayt)", "Haus"],
      ["تعلم (taʿallum)", "lernen"],
      ["فهم (fahm)", "verstehen"],
      ["جميل (jamīl)", "schön"],
      ["مهم (muhimm)", "wichtig"],
      ["اليوم (al-yawm)", "heute"],
    ],
  },
  {
    id: "preset-japanese",
    name: "Japanisch Vokabeln",
    emoji: "🇯🇵",
    description: "Grundwortschatz Japanisch (mit Rōmaji)",
    languagePair: ["Japanisch", "Deutsch"],
    tags: ["Vokabel", "Sprache"],
    cards: [
      ["こんにちは (konnichiwa)", "hallo / guten Tag"],
      ["ありがとう (arigatō)", "danke"],
      ["お願いします (onegai shimasu)", "bitte"],
      ["はい / いいえ (hai / iie)", "ja / nein"],
      ["おはよう (ohayō)", "guten Morgen"],
      ["お元気ですか？(ogenki desu ka?)", "wie geht es dir?"],
      ["水 (mizu)", "Wasser"],
      ["パン (pan)", "Brot"],
      ["友達 (tomodachi)", "Freund / Freundin"],
      ["家 (ie)", "Haus"],
      ["勉強する (benkyō suru)", "lernen"],
      ["わかる (wakaru)", "verstehen"],
      ["きれい (kirei)", "schön"],
      ["大切 (taisetsu)", "wichtig"],
      ["今日 (kyō)", "heute"],
    ],
  },
];

const FIXED_TIMESTAMP = 1700000000000;

// Bei Änderungen an den Presets hochzählen → migrateState seedet neu,
// während vom Nutzer erstellte Decks erhalten bleiben.
export const FLASHCARD_PRESETS_VERSION = 1;

/** Baut die unveränderlichen Preset-Decks (read-only, isPreset: true). */
export function buildPresetDecks() {
  return PRESETS.map((preset, deckIndex) => ({
    id: preset.id,
    name: preset.name,
    emoji: preset.emoji,
    description: preset.description,
    languagePair: [preset.languagePair[0], preset.languagePair[1]],
    tags: [...preset.tags],
    isPreset: true,
    catId: null,
    createdAt: FIXED_TIMESTAMP + deckIndex,
    cards: preset.cards.map(([front, back], cardIndex) => ({
      id: `${preset.id}-card-${cardIndex}`,
      front,
      back,
      createdAt: FIXED_TIMESTAMP + deckIndex * 1000 + cardIndex,
    })),
  }));
}
