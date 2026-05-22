"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

export default function Home() {
  const [leftCard, setLeftCard] = useState<CardArtEntry | null>(null);
  const [rightCard, setRightCard] = useState<CardArtEntry | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);

  const fetchRoundCards = useCallback(async () => {
    const response = await fetch("/api/round", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Round request failed with ${response.status}`);
    }

    const payload = (await response.json()) as RoundPayload;
    const [first, second] = payload.cards;

    if (!first || !second) {
      throw new Error("Round payload did not include two cards.");
    }

    return [first, second] as const;
  }, []);

  const loadRound = useCallback(async (advanceRound = false) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [first, second] = await fetchRoundCards();

      setLeftCard(first);
      setRightCard(second);
      setResult(null);
      setLocked(false);
      setRevealedCardId(null);
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
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Magic: The Gathering art history</p>
          <h1>Pick the older card art</h1>
          <p className="hero-copy">
            Pulling public data from MTG API.
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

      <section className="battle-grid">
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
                  </div>
                </button>
              );
            })}
          </>
        )}
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
            <button className="next-button" onClick={nextRound} type="button">
              Next round
            </button>
          </>
        ) : (
          <div>
            <p className="status-title">Choose carefully</p>
            <p className="status-copy">
              The older card art is the one with the earlier release year. Make
              your pick to lock in points.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}