"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CardArtEntry } from "../data/cards";

type RoundResult = {
  winnerId: string;
  loserId: string;
  explanation: string;
};

type RoundPayload = {
  cards: CardArtEntry[];
  fallback?: boolean;
};

function formatYear(year?: number) {
  return year ? `${year}` : "Unknown";
}

function getOlderCard(leftCard: CardArtEntry, rightCard: CardArtEntry) {
  return leftCard.artYear <= rightCard.artYear ? leftCard : rightCard;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export default function Home() {
  const [leftCard, setLeftCard] = useState<CardArtEntry | null>(null);
  const [rightCard, setRightCard] = useState<CardArtEntry | null>(null);
  const prefetchedCardsRef = useRef<CardArtEntry[] | null>(null);
  const seenCardIdsRef = useRef<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [artistGuess, setArtistGuess] = useState("");
  const [artistGuessFeedback, setArtistGuessFeedback] = useState<string | null>(null);
  const [artistGuessChecked, setArtistGuessChecked] = useState(false);

  const fetchRoundCards = useCallback(async (excludeIds: string[] = []) => {
    const maxAttempts = 3;
    const query = new URLSearchParams();

    excludeIds.forEach((id) => {
      query.append("exclude", id);
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(
        query.toString() ? `/api/round?${query.toString()}` : "/api/round",
        { cache: "no-store" }
      );

      if (response.ok) {
        const payload = (await response.json()) as RoundPayload;
        const [first, second] = payload.cards;

        if (first && second) {
          return [first, second] as const;
        }
      }

      if (attempt < maxAttempts) {
        await sleep(350 * attempt);
        continue;
      }

      throw new Error(`Round request failed after ${maxAttempts} attempts.`);
    }

    throw new Error("Round request failed.");
  }, []);

  const prefetchNextRound = useCallback(async () => {
    if (prefetchedCardsRef.current) {
      return;
    }

    try {
      const cards = await fetchRoundCards(seenCardIdsRef.current);
      prefetchedCardsRef.current = [...cards];
    } catch {
      prefetchedCardsRef.current = null;
    }
  }, [fetchRoundCards]);

  const loadRound = useCallback(async (advanceRound = false) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [first, second] = prefetchedCardsRef.current ?? (await fetchRoundCards());

      setLeftCard(first);
      setRightCard(second);
      setResult(null);
      setLocked(false);
      setRevealedCardId(null);
      setArtistGuess("");
      setArtistGuessFeedback(null);
      setArtistGuessChecked(false);
      seenCardIdsRef.current = Array.from(
        new Set([...seenCardIdsRef.current, first.id, second.id])
      );
      prefetchedCardsRef.current = null;
      if (advanceRound) {
        setRound((currentRound) => currentRound + 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown round error";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRoundCards]);

  useEffect(() => {
    void loadRound();
  }, [loadRound]);

  const olderCard =
    leftCard && rightCard ? getOlderCard(leftCard, rightCard) : null;
  const cardPairs = leftCard && rightCard ? [leftCard, rightCard] : [];

  function nextRound() {
    void loadRound(true);
  }

  function checkArtistGuess() {
    if (!olderCard || revealedCardId !== olderCard.id) {
      return;
    }

    const guessedArtist = normalizeText(artistGuess);
    const actualArtist = normalizeText(olderCard.artist);

    setArtistGuessChecked(true);

    if (!guessedArtist) {
      setArtistGuessFeedback("Enter an artist name to check for a super correct.");
      return;
    }

    if (guessedArtist === actualArtist) {
      setArtistGuessFeedback(`Super Correct. ${olderCard.artist} is the artist.`);
      return;
    }

    setArtistGuessFeedback(`Not quite. The artist was ${olderCard.artist}.`);
  }

  function resolveChoice(selectedId: string) {
    if (locked || !leftCard || !rightCard || !olderCard) {
      return;
    }

    setRevealedCardId(selectedId);

    const winner = olderCard;
    const loser = winner.id === leftCard.id ? rightCard : leftCard;
    const isCorrect = selectedId === winner.id;

    setLocked(true);
    setResult({
      winnerId: winner.id,
      loserId: loser.id,
      explanation: isCorrect
        ? `${winner.cardName} is older by art year. ${winner.hint}`
        : `${winner.cardName} is older than ${loser.cardName}. ${winner.hint}`
    });
    setScore((currentScore) => currentScore + (isCorrect ? 1 : 0));
    setStreak((currentStreak) => (isCorrect ? currentStreak + 1 : 0));

    void prefetchNextRound();
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">BETA BUILD</p>
          <h1>Pick the older card art</h1>
          <p className="hero-copy">
            Utilizes data from scryfall. Oldest printing of shown art will be used.
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div className="stat-card">
            <span>Streak</span>
            <strong>{streak}</strong>
          </div>
          <div className="stat-card">
            <span>Round</span>
            <strong>{round}</strong>
          </div>
        </div>
      </section>

      <section className="battle-stage">
        <div className="battle-grid">
          {isLoading ? (
            <div className="loading-grid" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading live card art.</span>
              <div className="loading-card loading-card-left" />
              <div className="loading-card loading-card-right" />
            </div>
          ) : loadError || !leftCard || !rightCard ? (
            <div className="loading-card">
              Could not load live cards. {loadError ? ` ${loadError}` : ""}
            </div>
          ) : (
            <>
              {cardPairs.map((card) => {
                const isWinner = result?.winnerId === card.id;
                const isLoser = result?.loserId === card.id;
                const isRevealed = revealedCardId === card.id || locked;
                const resultLabel =
                  locked && revealedCardId === card.id
                    ? isWinner
                      ? "Correct"
                      : "Incorrect"
                    : null;

                return (
                  <button
                    key={card.id}
                    className={`card-panel frame-${card.frame} ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""} ${isRevealed ? "revealed" : ""}`}
                    onClick={() => resolveChoice(card.id)}
                    disabled={locked}
                    type="button"
                    aria-label={`Choose ${card.cardName}`}
                  >
                    <span className="art-surface" aria-hidden="true">
                      {card.artUrl ? (
                        <Image
                          className="art-image"
                          src={card.artUrl}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 100vw, 50vw"
                          priority
                          unoptimized
                        />
                      ) : null}
                    </span>
                    <div className={`card-overlay ${isRevealed ? "visible" : ""}`}>
                      <p className="card-name">{card.cardName}</p>
                      <p className="card-meta">{card.setName}</p>
                      <p className="card-meta">Artist: {card.artist}</p>
                      <p className="card-meta">Released: <span className="year-highlight">{formatYear(card.artYear)}</span></p>
                      <p className="art-hint">{card.hint}</p>
                      {result && isWinner ? (
                        <div className="artist-check artist-check-overlay">
                          <label className="artist-check-label" htmlFor={`artist-guess-${card.id}`}>
                            Optional artist guess for a super correct
                          </label>
                          <div className="artist-check-row">
                            <input
                              id={`artist-guess-${card.id}`}
                              className="artist-check-input"
                              type="text"
                              value={artistGuess}
                              onChange={(event) => {
                                setArtistGuess(event.target.value);
                                setArtistGuessChecked(false);
                                setArtistGuessFeedback(null);
                              }}
                              placeholder="Guess the artist"
                              autoComplete="off"
                            />
                            
                          </div>
                          {artistGuessChecked && artistGuessFeedback ? (
                            <p className={`artist-check-feedback ${
                              artistGuessFeedback.startsWith("Super Correct")
                                ? "correct"
                                : artistGuessFeedback.startsWith("Not quite")
                                  ? "incorrect"
                                  : "neutral"
                            }`}>
                              {artistGuessFeedback}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {resultLabel ? (
                      <span
                        className={`card-result-badge ${isWinner ? "correct" : "incorrect"}`}
                        aria-hidden="true"
                      >
                        {resultLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {result ? (
          <button className="next-button next-button-overlay" onClick={nextRound} type="button">
            Next round
          </button>
        ) : null}
      </section>

      <section className="status-panel">
        {result ? (
          <>
            <div>
              <p className="status-title">Round complete</p>
              <p className="status-copy">{result.explanation}</p>
              <p className="status-copy subtle">
                Older release year: {formatYear(olderCard?.artYear)}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="status-title">Choose carefully</p>
            <p className="status-copy">
              The older card art is the one with the earlier release year. 
            </p>
          </div>
        )}
      </section> 

      <footer className="game-footer">
        <div>
          <p className="footer-brand">Oakwin</p>
          <p className="footer-copy">Built for card-art guessing with live MTG data.</p>
        </div>
        <div className="footer-links" aria-label="Social links">
          <a
            className="footer-icon-link"
            href="https://x.com/Oquinn_mb"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow on X"
            title="Follow on X"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 4h4.5l5.1 6.8L18.9 4H22l-7.5 8.6L22 20h-4.5l-5.4-7.2L6.7 20H2l8-9.1L4 4zm1.9 1.2 10.7 14.3h1.6L7.5 5.2H5.9z" />
            </svg>
          </a>

          <a
            className="footer-icon-link"
            href="mailto:bstguesser@gmail.com"
            aria-label="Email bstguesser@gmail.com"
            title="Email"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 5h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm0 2v.3l8 5.2 8-5.2V7H4zm16 10V9.4l-7.4 4.8c-.3.2-.6.2-.9 0L4 9.4V17h16z" />
            </svg>
          </a>

          <a
            className="footer-icon-link"
            href="https://buymeacoffee.com/oakwin"
            target="_blank"
            rel="noreferrer"
            aria-label="Buy me a coffee"
            title="Buy me a coffee"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 5h10v3h2.5A1.5 1.5 0 0 1 21 9.5V11a5 5 0 0 1-5 5h-1.3A5.2 5.2 0 0 1 10 19H8.5A3.5 3.5 0 0 1 5 15.5V11h2V5zm10 5h2v1a3 3 0 0 1-3 3h-.8c.2-.7.3-1.5.3-2.3V10zM7 7v8.5c0 .8.7 1.5 1.5 1.5H10c1.9 0 3.5-1.6 3.5-3.5V7H7z" />
            </svg>
          </a>
        </div>
        <div className="footer-meta">
          <p className="footer-copy footer-copy-right">Privacy Policy</p>
          <p className="footer-copy footer-copy-right">Terms of Service</p>
          <p className="footer-copy footer-copy-right">Powered by Scryfall</p>
        </div>
      </footer>
    </main>
  );
}