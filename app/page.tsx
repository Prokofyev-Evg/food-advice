"use client";

import { useState, type KeyboardEvent } from "react";
import { FILTERS, type FilterKey, type Recipe } from "@/lib/recipes";

export default function Home() {
  const [products, setProducts] = useState<string[]>(["яйца", "помидоры", "сыр"]);
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addProduct() {
    const items = draft
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!items.length) return;
    setProducts((prev) => [...prev, ...items.filter((i) => !prev.includes(i))]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addProduct();
    } else if (e.key === "Backspace" && !draft && products.length) {
      setProducts((prev) => prev.slice(0, -1));
    }
  }

  function toggleFilter(key: FilterKey) {
    setFilters((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  async function findRecipes() {
    const all = draft.trim() ? [...products, ...draft.split(",").map((s) => s.trim()).filter(Boolean)] : products;
    if (draft.trim()) addProduct();
    if (!all.length) {
      setError("Добавьте хотя бы один продукт.");
      return;
    }
    setLoading(true);
    setError(null);
    setOpen(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: all, filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка сервера");
      setRecipes(data.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="px-4 pt-8 pb-2 text-center">
        <div className="text-3xl font-extrabold text-orange-600">🍳 Холодильник</div>
        <p className="mt-1.5 text-neutral-500">Что приготовить из того, что есть?</p>
      </header>

      <main className="mx-auto max-w-3xl p-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-orange-200 bg-white p-3 focus-within:border-orange-400">
          {products.map((p) => (
            <span key={p} className="flex items-center rounded-full bg-orange-50 py-1.5 pr-2 pl-3 text-sm">
              {p}
              <button
                type="button"
                aria-label={`Убрать ${p}`}
                className="ml-1 cursor-pointer px-1 text-neutral-400 hover:text-neutral-700"
                onClick={() => setProducts((prev) => prev.filter((x) => x !== p))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={addProduct}
            placeholder="Добавьте продукт и нажмите Enter"
            className="min-w-36 flex-1 p-1.5 text-base outline-none"
          />
          <button
            type="button"
            disabled
            title="Добавить по фото — скоро"
            className="cursor-not-allowed rounded-xl bg-orange-100 px-3 py-2 text-lg opacity-60"
          >
            📷
          </button>
        </div>

        <div className="my-4 flex flex-wrap gap-2">
          {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
            const active = filters.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                aria-pressed={active}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active ? "border-orange-500 bg-orange-500 text-white" : "border-neutral-300 bg-white hover:border-orange-300"
                }`}
              >
                {FILTERS[key]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={findRecipes}
          disabled={loading}
          className="w-full cursor-pointer rounded-2xl bg-orange-600 p-4 text-lg font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Думаю, что приготовить…" : "Найти рецепты"}
        </button>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {loading &&
            [0, 1, 2].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-orange-100" />)}
          {!loading &&
            recipes.map((r, i) => (
              <button
                key={r.title}
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className={`cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:shadow-md ${
                  open === i ? "ring-2 ring-orange-400" : ""
                }`}
              >
                <div className="flex h-28 items-center justify-center bg-orange-100 text-5xl">{r.emoji}</div>
                <div className="p-3">
                  <h3 className="mb-1.5 font-semibold">{r.title}</h3>
                  <div className="text-sm text-neutral-500">⏱ {r.timeMinutes} минут</div>
                  <div className={`mt-1.5 text-sm ${r.missing.length ? "text-red-700" : "text-green-700"}`}>
                    {r.missing.length ? `Не хватает: ${r.missing.join(", ")}` : "Всё есть!"}
                  </div>
                </div>
              </button>
            ))}
        </div>

        {!loading && open !== null && recipes[open] && <RecipeDetails recipe={recipes[open]} />}
      </main>
    </>
  );
}

function RecipeDetails({ recipe }: { recipe: Recipe }) {
  return (
    <article className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">
        {recipe.emoji} {recipe.title}
      </h2>
      <p className="mt-1 text-neutral-600">{recipe.description}</p>
      <h3 className="mt-4 font-semibold">Ингредиенты</h3>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {recipe.ingredients.map((ing) => (
          <li key={ing}>{ing}</li>
        ))}
      </ul>
      <h3 className="mt-4 font-semibold">Как готовить</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </article>
  );
}
