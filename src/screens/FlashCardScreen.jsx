import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Check, X, RotateCcw } from "lucide-react";
import { FlashcardsIcon } from "../components/AppIcons";

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

export function FlashCardScreen({
  t,
  decks,
  initialDeckId,
  onBack,
}) {
  const fc = t.fc || {};
  const [mode, setMode] = useState("overview"); // overview | study | result
  const [deckId, setDeckId] = useState(null);
  const [session, setSession] = useState(null); // { queue, index, results, flipped }
  const [drag, setDrag] = useState(0); // aktueller Karten-Versatz beim Wischen

  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);

  const userDecks = decks.filter((d) => !d.isPreset);
  const presetDecks = decks.filter((d) => d.isPreset);
  const activeDeck = decks.find((d) => d.id === deckId) || null;

  const startStudy = (deck, cards) => {
    const queue = shuffle(cards ?? deck.cards);
    if (!queue.length) return;
    setDeckId(deck.id);
    setSession({ queue, index: 0, results: [], flipped: false });
    setDrag(0);
    setMode("study");
  };

  const answer = (correct) => {
    setSession((s) => {
      if (!s) return s;
      const card = s.queue[s.index];
      const results = [...s.results, { cardId: card.id, correct }];
      const nextIndex = s.index + 1;
      if (nextIndex >= s.queue.length) {
        setTimeout(() => setMode("result"), 0);
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
    if (!moved.current) {
      flip();
      return;
    }
    if (drag > SWIPE_ANSWER_PX) answer(true);
    else if (drag < -SWIPE_ANSWER_PX) answer(false);
    else setDrag(0);
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
          <span className="fc-deck__meta">{fc.cardsCount?.(deck.cards.length)}</span>
        </span>
        <span className="fc-deck__cta">{fc.learn}</span>
      </button>
    );

    return (
      <div className="fc-screen">
        <div className="fc-header">
          <button className="fc-icon-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <div className="fc-header__title">
            <FlashcardsIcon size={22} color="var(--color-resource)" />
            <span>{fc.tool}</span>
          </div>
          <span className="fc-icon-btn fc-icon-btn--ghost" aria-hidden />
        </div>

        <div className="fc-body">
          {userDecks.length > 0 && (
            <>
              <div className="fc-section-title">{fc.yourDecks}</div>
              <div className="fc-deck-list">{userDecks.map(renderDeck)}</div>
            </>
          )}

          <div className="fc-section-title">{fc.presets}</div>
          <div className="fc-deck-list">{presetDecks.map(renderDeck)}</div>
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
            <span>{activeDeck?.name}</span>
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
            <button className="fc-btn" onClick={() => startStudy(activeDeck)}>
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

    return (
      <div className="fc-screen fc-screen--study">
        <div className="fc-header">
          <button className="fc-icon-btn" onClick={() => setMode("overview")} aria-label="Close">
            <X size={22} />
          </button>
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
            onClick={flip}
          >
            <div className="fc-card__inner">
              <div className="fc-card__face fc-card__face--front">{card.front}</div>
              <div className="fc-card__face fc-card__face--back">{card.back}</div>
            </div>
            {!session.flipped && <div className="fc-card__hint">{fc.tapToFlip}</div>}
          </div>
        </div>

        <div className="fc-study__actions">
          <button className="fc-answer fc-answer--again" onClick={() => answer(false)}>
            <X size={20} /> {fc.again}
          </button>
          <button className="fc-answer fc-answer--known" onClick={() => answer(true)}>
            <Check size={20} /> {fc.known}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
