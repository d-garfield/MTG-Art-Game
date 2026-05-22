import { NextResponse } from "next/server";
import type { CardArtEntry } from "../../../data/cards";

type ScryfallImageUris = {
  art_crop?: string;
  normal?: string;
  large?: string;
  png?: string;
  small?: string;
};

type ScryfallCard = {
  id: string;
  name: string;
  set_name: string;
  released_at?: string;
  artist?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: Array<{
    image_uris?: ScryfallImageUris;
  }>;
};

const SCRYFALL_RANDOM_ENDPOINT =
  "https://api.scryfall.com/cards/random?q=game:paper+has:art+lang:en";
const FETCH_TIMEOUT_MS = 4500;

function getArtUrl(card: ScryfallCard) {
  const faceImage = card.card_faces?.find((face) => face.image_uris?.art_crop)
    ?.image_uris?.art_crop;

  return (
    faceImage ??
    card.image_uris?.art_crop ??
    card.image_uris?.normal ??
    card.image_uris?.large ??
    card.image_uris?.png ??
    card.image_uris?.small ??
    ""
  );
}

function toCardArtEntry(card: ScryfallCard): CardArtEntry {
  const releasedAt = card.released_at ?? "";
  const artYear = releasedAt ? new Date(releasedAt).getFullYear() : 0;

  return {
    id: card.id,
    cardName: card.name,
    setName: card.set_name,
    artYear,
    releasedAt,
    artist: card.artist ?? "Unknown",
    artUrl: getArtUrl(card),
    frame: "scryfall",
    hint: "Live art pulled from Scryfall.",
    source: "scryfall"
  };
}

async function fetchRandomCard() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(SCRYFALL_RANDOM_ENDPOINT, {
    cache: "no-store",
    signal: controller.signal,
    headers: {
      accept: "application/json"
    }
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Scryfall request failed with ${response.status}`);
  }

  return (await response.json()) as ScryfallCard;
}

async function fetchDistinctCards() {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const [firstCard, secondCard] = await Promise.all([
      fetchRandomCard(),
      fetchRandomCard()
    ]);

    if (firstCard.id !== secondCard.id) {
      return [toCardArtEntry(firstCard), toCardArtEntry(secondCard)] as const;
    }
  }

  const [firstCard, secondCard] = await Promise.all([
    fetchRandomCard(),
    fetchRandomCard()
  ]);

  return [toCardArtEntry(firstCard), toCardArtEntry(secondCard)] as const;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await fetchDistinctCards();
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load live cards.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}