import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Check, X, RotateCcw, RefreshCw, Clock, AlertTriangle, Home, AudioLines } from "lucide-react";

// Fisher-Yates – einmaliges Mischen zu Session-Beginn (kein Spaced-Repetition,
// wie in der Referenz-App).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SWIPE_ANSWER_PX = 80; // ab hier zählt eine horizontale Wischgeste als Antwort
const TAP_TOLERANCE_PX = 12; // darunter gilt es als Tap (= umdrehen)

// Mini-Icon "Kartenfächer" für die Kartenanzahl in der Deck-Liste (ersetzt
// das Wort "Karten"): zwei hochkant gefächerte Spielkarten, die vordere
// (links, nach links gekippt) verdeckt die hintere – deren Füllung kommt
// per CSS (.mini-card-front) und entspricht dem Seitenhintergrund.
function MiniCardsIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="10.5" y="4" width="10" height="14" rx="2.5" transform="rotate(14 15.5 11)" />
      <rect className="mini-card-front" x="3.5" y="6" width="10" height="14" rx="2.5" transform="rotate(-14 8.5 13)" />
    </svg>
  );
}

export function FlashCardScreen({
  t,
  decks,
  mistakes = [],
  vocabEntries = [],
  onSessionComplete,
  initialDeckId,
  onBack,
  onHome,
  onAddWord,
}) {
  const fc = t.fc || {};
  const [mode, setMode] = useState("overview"); // overview | study | result
  const [deckId, setDeckId] = useState(null);
  const [session, setSession] = useState(null); // { queue, index, results, flipped }
  const [drag, setDrag] = useState(0); // aktueller Karten-Versatz beim Wischen
  const [slide, setSlide] = useState(0); // aktiver Karussell-Slide (Übersicht)

  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);
  const suppressClick = useRef(false); // verhindert Doppel-Flip (touchend + click)
  const trackRef = useRef(null);

  const userDecks = decks.filter((d) => !d.isPreset);
  const presetDecks = decks.filter((d) => d.isPreset);
  const activeDeck = decks.find((d) => d.id === deckId) || null;

  // Karussell-Daten: zuletzt erstellte Karten + zuletzt falsch beantwortete.
  // „Zuletzt erstellt" = vom Nutzer angelegte Karten + über Übersetzer/Ressourcen
  // gespeicherte Wortpaare (keine Presets).
  const recentCards = [
    ...decks
      .filter((d) => !d.isPreset)
      .flatMap((d) =>
        d.cards.map((c) => ({
          id: c.id, front: c.front, back: c.back, createdAt: c.createdAt, deck: d,
          // Deck-Karten: front = Fremdsprache → Richtung entspricht languagePair.
          langPair: d.languagePair || null,
        }))
      ),
    ...vocabEntries.map((v) => {
      const deck = decks.find((d) => d.id === v.deckId) || null;
      return {
        id: v.id,
        front: v.front,
        back: v.back,
        createdAt: v.createdAt,
        deck,
        // Übersetzer-Wortpaare: front = deutsches Quellwort, back = Übersetzung
        // → Richtung ist gegenüber dem Deck-languagePair umgekehrt.
        langPair: deck?.languagePair ? [deck.languagePair[1], deck.languagePair[0]] : null,
      };
    }),
  ]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);
  const mistakeCards = mistakes
    .map((m) => ({ ...m, id: m.cardId, deck: decks.find((d) => d.id === m.deckId) || null }))
    .slice(0, 5);

  // Aktiven Slide anhand der tatsächlichen Position bestimmen (gap-unabhängig).
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    let nearest = 0;
    let min = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.scrollLeft);
      if (d < min) { min = d; nearest = i; }
    });
    setSlide((prev) => (nearest !== prev ? nearest : prev));
  };
  const goToSlide = (i) => {
    setSlide(i);
    const child = trackRef.current?.children[i];
    if (child) trackRef.current.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  };

  // `deck` darf null sein (gemischte Sessions wie "Zuletzt erstellt"/"Fehler",
  // deren Karten aus mehreren Decks stammen können).
  const startStudy = (deck, cards) => {
    const queue = shuffle(cards ?? deck?.cards ?? []);
    if (!queue.length) return;
    setDeckId(deck?.id ?? null);
    setSession({ queue, index: 0, results: [], flipped: false });
    setDrag(0);
    setMode("study");
  };

  const answer = (correct) => {
    setSession((s) => {
      if (!s) return s;
      const card = s.queue[s.index];
      // Snapshot von front/back/deckId mitgeben, damit die Fehler-Liste auch
      // bei gemischten Sessions (Karten aus mehreren Decks) korrekt befüllt wird.
      const results = [
        ...s.results,
        {
          cardId: card.id, correct, front: card.front, back: card.back,
          deckId: card.deck?.id ?? card.deckId ?? null,
          // Richtungs-Snapshot für die Fehler-Liste (Übersetzer-Karten laufen
          // entgegen dem Deck-languagePair).
          langPair: card.langPair ?? card.deck?.languagePair ?? activeDeck?.languagePair ?? null,
        },
      ];
      const nextIndex = s.index + 1;
      if (nextIndex >= s.queue.length) {
        setTimeout(() => {
          setMode("result");
          onSessionComplete?.(deckId, results);
        }, 0);
        return { ...s, results, flipped: false };
      }
      return { ...s, index: nextIndex, results, flipped: false };
    });
    setDrag(0);
  };

  const flip = () => setSession((s) => (s ? { ...s, flipped: !s.flipped } : s));

  // Direkt-Einstieg: kommt man über das Flashcards-Lesezeichen einer Ressource,
  // wird das verknüpfte Deck einmalig sofort in den Lernmodus geschaltet.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || !initialDeckId) return;
    didInit.current = true;
    const deck = decks.find((d) => d.id === initialDeckId);
    if (deck && deck.cards.length) startStudy(deck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeckId]);

  // ── Touch-Gesten: Tap = umdrehen, horizontaler Wisch = antworten ──
  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    moved.current = false;
  };
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > TAP_TOLERANCE_PX && Math.abs(dx) > Math.abs(dy)) {
      moved.current = true;
      setDrag(dx);
    }
  };
  const onTouchEnd = () => {
    // Touch hat das Geschehen erledigt → das nachfolgende synthetische
    // click-Event ignorieren (sonst Doppel-Flip = kein sichtbarer Effekt).
    suppressClick.current = true;
    if (!moved.current) {
      flip();
      return;
    }
    if (drag > SWIPE_ANSWER_PX) answer(true);
    else if (drag < -SWIPE_ANSWER_PX) answer(false);
    else setDrag(0);
  };
  // Klick (Desktop bzw. synthetisch nach Touch): nur auf Desktop umdrehen.
  const onCardClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    flip();
  };

  /* ── Übersicht ──────────────────────────────────────────────── */
  if (mode === "overview") {
    const renderDeck = (deck) => (
      <button
        key={deck.id}
        className="fc-deck"
        onClick={() => startStudy(deck)}
        disabled={deck.cards.length === 0}
      >
        <span className="fc-deck__emoji">{deck.emoji}</span>
        <span className="fc-deck__info">
          <span className="fc-deck__name">{deck.name}</span>
          <span className="fc-deck__meta">
            <MiniCardsIcon size={14} /> {deck.cards.length}
          </span>
        </span>
        <span className="fc-deck__cta">{fc.learn}</span>
      </button>
    );

    const slides = [
      { key: "recent", Icon: Clock, title: fc.recentlyCreated, items: recentCards, empty: fc.noRecent },
      { key: "mistakes", Icon: AlertTriangle, title: fc.mistakes, items: mistakeCards, empty: fc.noMistakes },
    ];

    return (
      <div className="fc-screen">
        <div className="fc-body fc-body--with-nav">
          <div className="fc-section-title">{fc.exercises}</div>
          <div className="fc-carousel">
            <div className="fc-carousel__track" ref={trackRef} onScroll={onTrackScroll}>
              {slides.map((sl) => (
                <div className="fc-carousel__slide" key={sl.key}>
                  <div className={`fc-carousel__card fc-carousel__card--${sl.key}`}>
                    <div className="fc-carousel__head">
                      <sl.Icon size={15} strokeWidth={2.4} />
                      <span>{sl.title}</span>
                    </div>
                    {sl.items.length === 0 ? (
                      <div className="fc-carousel__empty">{sl.empty}</div>
                    ) : (
                      <div className="fc-carousel__list">
                        {sl.items.map((it, idx) => (
                          <button
                            key={it.cardId || it.id || idx}
                            className="fc-carousel__row"
                            // Es werden NUR die im Slide gelisteten Karten geübt
                            // (nicht das komplette Deck dahinter).
                            onClick={() => startStudy(null, sl.items)}
                          >
                            <span className="fc-carousel__row-emoji">{it.emoji || it.deck?.emoji || "📚"}</span>
                            <span className="fc-carousel__row-front">{it.front}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="fc-carousel__dots">
              {slides.map((sl, i) => (
                <button
                  key={sl.key}
                  type="button"
                  className={`fc-carousel__dot ${i === slide ? "fc-carousel__dot--active" : ""}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`${i + 1} / ${slides.length}`}
                />
              ))}
            </div>
          </div>

          {userDecks.length > 0 && (
            <>
              <div className="fc-section-title">{fc.yourDecks}</div>
              <div className="fc-deck-list">{userDecks.map(renderDeck)}</div>
            </>
          )}

          <div className="fc-section-title">{fc.presets}</div>
          <div className="fc-deck-list">{presetDecks.map(renderDeck)}</div>
        </div>

        {/* Opakes Dock unten (verdeckt die Liste dahinter): Home-Button links.
            Das Eingabefeld ist nur ein Trigger – ein Tap öffnet direkt den
            Übersetzer (dessen Textfeld fokussiert sich → Tastatur samt
            Sprachleiste erscheint). Der Audio-Button rechts öffnet den
            Übersetzer im Spracheingabe-Modus. */}
        <div className="command-dock command-dock--detail" style={{ "--dock-accent": "#7C83F7" }}>
          <div className="command-dock__input-row">
            <button
              className="command-dock__icon-btn command-dock__list-btn"
              onClick={onHome || onBack}
              aria-label={t.home || "Startseite"}
            >
              <Home size={20} />
            </button>
            <input
              className="command-dock__input"
              value=""
              readOnly
              onFocus={(e) => {
                e.target.blur();
                onAddWord?.("");
              }}
              placeholder={fc.addWord || "Neues Wort hinzufügen"}
            />
            <button
              className="command-dock__icon-btn command-dock__voice-btn"
              onClick={() => onAddWord?.("", { voice: true })}
              aria-label={fc.voiceInput || "Spracheingabe"}
            >
              <AudioLines size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ergebnis ───────────────────────────────────────────────── */
  if (mode === "result" && session) {
    const correct = session.results.filter((r) => r.correct).length;
    const wrong = session.results.length - correct;
    const pct = session.results.length
      ? Math.round((correct / session.results.length) * 100)
      : 0;
    const wrongCards = session.queue.filter((c) =>
      session.results.find((r) => r.cardId === c.id && !r.correct)
    );

    return (
      <div className="fc-screen">
        <div className="fc-header">
          <button className="fc-icon-btn" onClick={() => setMode("overview")} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <div className="fc-header__title">
            <span>{activeDeck?.name || fc.exercises}</span>
          </div>
          <span className="fc-icon-btn fc-icon-btn--ghost" aria-hidden />
        </div>

        <div className="fc-result">
          <div className="fc-result__score">{pct}%</div>
          <div className="fc-result__title">{fc.resultTitle}</div>
          <div className="fc-result__stats">
            <span className="fc-result__stat fc-result__stat--ok">
              <Check size={16} /> {correct} {fc.correct}
            </span>
            <span className="fc-result__stat fc-result__stat--bad">
              <X size={16} /> {wrong} {fc.wrong}
            </span>
          </div>

          <div className="fc-result__actions">
            {wrongCards.length > 0 && (
              <button
                className="fc-btn fc-btn--primary"
                onClick={() => startStudy(activeDeck, wrongCards)}
              >
                <RotateCcw size={18} /> {fc.retryWrong}
              </button>
            )}
            <button className="fc-btn" onClick={() => startStudy(activeDeck, activeDeck ? undefined : session.queue)}>
              {fc.retryAll}
            </button>
            <button className="fc-btn fc-btn--ghost" onClick={() => setMode("overview")}>
              {fc.backToDecks}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Lernmodus ──────────────────────────────────────────────── */
  if (mode === "study" && session) {
    const card = session.queue[session.index];
    const total = session.queue.length;
    const pct = Math.round((session.index / total) * 100);
    const rot = drag / 18;
    const hintCorrect = drag > SWIPE_ANSWER_PX;
    const hintWrong = drag < -SWIPE_ANSWER_PX;
    // Sprachrichtung: kartenindividuell (Übersetzer-Wortpaare sind gegenüber
    // dem Deck umgekehrt), sonst Deck der Karte bzw. aktives Deck.
    const langPair = card.langPair || card.deck?.languagePair || activeDeck?.languagePair || null;

    return (
      <div className="fc-screen fc-screen--study">
        <div className="fc-header">
          <div className="fc-progress">
            <div className="fc-progress__bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="fc-study__counter">
            {fc.progress ? fc.progress(session.index + 1, total) : `${session.index + 1} / ${total}`}
          </span>
        </div>

        <div className="fc-stage">
          <div
            className={`fc-card ${session.flipped ? "fc-card--flipped" : ""} ${
              hintCorrect ? "fc-card--hint-ok" : ""
            } ${hintWrong ? "fc-card--hint-bad" : ""}`}
            style={{
              transform: `translateX(${drag}px) rotate(${rot}deg)`,
              transition: drag === 0 ? "transform 0.25s ease" : "none",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={onCardClick}
          >
            <div className="fc-card__inner">
              <div className="fc-card__face fc-card__face--front">{card.front}</div>
              <div className="fc-card__face fc-card__face--back">{card.back}</div>
            </div>
            {langPair && (
              <div className="fc-card__lang">{`${langPair[0]} → ${langPair[1]}`}</div>
            )}
            {!session.flipped && <div className="fc-card__hint">{fc.tapToFlip}</div>}
          </div>
        </div>

        <div className="fc-study__actions">
          <button className="fc-answer fc-answer--close" onClick={() => setMode("overview")} aria-label="Close">
            <X size={20} />
          </button>
          <button className="fc-answer fc-answer--again" onClick={() => answer(false)}>
            <RefreshCw size={18} /> {fc.again}
          </button>
          <button className="fc-answer fc-answer--known" onClick={() => answer(true)}>
            <Check size={18} /> {fc.known}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
