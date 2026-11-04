import { CATALOG, type ProductKey } from "./catalog";
import { RECIPES, type RecipeSpec } from "./recipes-data";

export const FILTERS = {
  quick: "до 30 минут",
  vegetarian: "вегетарианское",
  glutenFree: "без глютена",
} as const;

export type FilterKey = keyof typeof FILTERS;

export type Ingredient = { name: string; qty: string; optional: boolean; have: boolean };

export type Recipe = {
  title: string;
  emoji: string;
  time: number;
  ingredients: Ingredient[];
  missing: string[];
  steps: readonly string[];
};

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Какие продукты из справочника пользователь ввёл. */
export function recognize(products: string[]): Set<ProductKey> {
  const words = products.flatMap((p) => normalize(p).split(/[^a-zа-я]+/).filter(Boolean));
  const found = new Set<ProductKey>();
  for (const key of Object.keys(CATALOG) as ProductKey[]) {
    if (CATALOG[key].stems.some((stem) => words.some((w) => w.startsWith(normalize(stem))))) {
      found.add(key);
    }
  }
  return found;
}

function passes(r: RecipeSpec, filters: FilterKey[]) {
  return (
    (!filters.includes("quick") || r.time <= 30) &&
    (!filters.includes("vegetarian") || r.vegetarian) &&
    (!filters.includes("glutenFree") || r.glutenFree)
  );
}

const MAX_MISSING = 3;

/** Подбирает до `limit` рецептов: сначала те, где не хватает меньше всего. */
export function findRecipes(products: string[], filters: FilterKey[], limit = 3): Recipe[] {
  const have = recognize(products);

  return RECIPES.filter((r) => passes(r, filters))
    .map((r) => {
      const ingredients = r.ingredients.map(([key, qty, optional = false]) => ({
        name: CATALOG[key].name,
        qty,
        optional,
        have: have.has(key),
      }));
      const required = ingredients.filter((i) => !i.optional);
      const missing = required.filter((i) => !i.have).map((i) => i.name);
      const matched = ingredients.filter((i) => i.have).length;
      const matchedRequired = required.length - missing.length;
      return { recipe: { title: r.title, emoji: r.emoji, time: r.time, ingredients, missing, steps: r.steps }, matched, matchedRequired };
    })
    .filter((x) => x.matchedRequired > 0 && x.recipe.missing.length <= MAX_MISSING)
    .sort(
      (a, b) =>
        a.recipe.missing.length - b.recipe.missing.length ||
        b.matched - a.matched ||
        a.recipe.time - b.recipe.time,
    )
    .slice(0, limit)
    .map((x) => x.recipe);
}
