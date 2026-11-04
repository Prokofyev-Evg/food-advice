import { z } from "zod";

export const FILTERS = {
  quick: "до 30 минут",
  vegetarian: "вегетарианское",
  glutenFree: "без глютена",
} as const;

export type FilterKey = keyof typeof FILTERS;

export const RecipeSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  timeMinutes: z.number(),
  description: z.string(),
  ingredients: z.array(z.string()),
  missing: z.array(z.string()),
  steps: z.array(z.string()),
});

export const RecipesResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipesRequestSchema = z.object({
  products: z.array(z.string().trim().min(1).max(60)).min(1).max(40),
  filters: z.array(z.enum(Object.keys(FILTERS) as [FilterKey, ...FilterKey[]])).default([]),
});
