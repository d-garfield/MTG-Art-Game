export type CardArtEntry = {
  id: string;
  cardName: string;
  setName: string;
  artYear: number;
  releasedAt?: string;
  artist: string;
  artUrl?: string;
  frame: string;
  hint: string;
  source?: "placeholder" | "scryfall";
};

export const cardArtEntries: CardArtEntry[] = [
  {
    id: "shivan-dragon",
    cardName: "Shivan Dragon",
    setName: "Revised Edition",
    artYear: 1994,
    artist: "Douglas Shuler",
    frame: "ember",
    hint: "An early red-iconic finisher from the game’s first wave of mythic-feeling creatures."
  },
  {
    id: "serra-angel",
    cardName: "Serra Angel",
    setName: "Alpha",
    artYear: 1993,
    artist: "Douglas Shuler",
    frame: "halo",
    hint: "A classic white flyer that helped define combat evasion."
  },
  {
    id: "counterspell",
    cardName: "Counterspell",
    setName: "Ice Age",
    artYear: 1995,
    artist: "Dan Frazier",
    frame: "frost",
    hint: "A blue staple that rewards keeping mana open."
  },
  {
    id: "psychic-drain",
    cardName: "Psychic Drain",
    setName: "Antiquities",
    artYear: 1994,
    artist: "Harold McNeill",
    frame: "void",
    hint: "An old-school effect that leans into resource denial."
  },
  {
    id: "llanowar-elves",
    cardName: "Llanowar Elves",
    setName: "Dominaria",
    artYear: 1993,
    artist: "Douglas Shuler",
    frame: "forest",
    hint: "A tiny green icon that accelerates mana development."
  },
  {
    id: "swords-to-plowshares",
    cardName: "Swords to Plowshares",
    setName: "Alpha",
    artYear: 1993,
    artist: "Douglas Shuler",
    frame: "sun",
    hint: "One of the most efficient removal spells ever printed."
  },
  {
    id: "shatter",
    cardName: "Shatter",
    setName: "Arabian Nights",
    artYear: 1993,
    artist: "Anson Maddocks",
    frame: "metal",
    hint: "A clean answer to artifacts from Magic’s earliest expansion era."
  },
  {
    id: "disenchant",
    cardName: "Disenchant",
    setName: "Limited Edition Beta",
    artYear: 1993,
    artist: "Douglas Shuler",
    frame: "light",
    hint: "A simple white answer that never really stopped mattering."
  }
];