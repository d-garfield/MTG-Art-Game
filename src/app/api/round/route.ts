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

type ScryfallSearchResponse = {
  data: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
};

const SCRYFALL_SEARCH_ENDPOINT =
  "https://api.scryfall.com/cards/search?q=game:paper+has:art+lang:en+unique:art+prefer:oldest&order=name&dir=asc";
const FETCH_TIMEOUT_MS = 6000;
const CARD_POOL_SIZE = 400;
const MAX_POOL_PAGES = 5;
const RECENT_CARD_LIMIT = 16;

let cardPoolPromise: Promise<CardArtEntry[]> | null = null;
let cachedCardPool: CardArtEntry[] | null = null;
let recentCardIds: string[] = [];

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

async function fetchSearchPage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Scryfall request failed with ${response.status}`);
    }

    return (await response.json()) as ScryfallSearchResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCardPool() {
  const cards: CardArtEntry[] = [];
  let nextPageUrl: string | undefined = SCRYFALL_SEARCH_ENDPOINT;

  for (let pageIndex = 0; pageIndex < MAX_POOL_PAGES && nextPageUrl; pageIndex += 1) {
    const searchResponse = await fetchSearchPage(nextPageUrl);
    cards.push(
      ...searchResponse.data
        .map(toCardArtEntry)
        .filter((card) => card.artUrl && card.releasedAt)
    );

    nextPageUrl = searchResponse.has_more ? searchResponse.next_page : undefined;
  }

  if (!cards.length) {
    throw new Error("Scryfall returned no usable card art results.");
  }

  return cards.slice(0, CARD_POOL_SIZE);
}

async function getCardPool() {
  if (cachedCardPool) {
    return cachedCardPool;
  }

  if (!cardPoolPromise) {
    cardPoolPromise = fetchCardPool().finally(() => {
      cardPoolPromise = null;
    });
  }

  cachedCardPool = await cardPoolPromise;
  return cachedCardPool;
}

function mergeRecentIds(nextIds: string[]) {
  const merged = [...nextIds, ...recentCardIds].filter(
    (id, index, values) => values.indexOf(id) === index
  );

  recentCardIds = merged.slice(0, RECENT_CARD_LIMIT);
}

function pickPairFromPool(pool: CardArtEntry[], excludeIds: Set<string>) {
  const eligibleCards = pool.filter((card) => !excludeIds.has(card.id));

  if (eligibleCards.length < 2) {
    return null;
  }

  const firstCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
  const remainingCards = eligibleCards.filter((card) => card.id !== firstCard.id);

  if (!remainingCards.length) {
    return null;
  }

  const secondCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];

  return [firstCard, secondCard] as const;
}

async function fetchDistinctCards(excludeIds: string[]) {
  const excludeSet = new Set([...excludeIds, ...recentCardIds]);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const pool = await getCardPool();
    const pair = pickPairFromPool(pool, excludeSet);

    if (pair) {
      mergeRecentIds([pair[0].id, pair[1].id]);
      return pair;
    }

    cachedCardPool = null;
  }

  throw new Error("Unable to find two distinct live cards.");
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const excludeIds = url.searchParams
      .getAll("exclude")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    const cards = await fetchDistinctCards(excludeIds);
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load live cards.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}