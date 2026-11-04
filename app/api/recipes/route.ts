import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { FILTERS, RecipesRequestSchema, RecipesResponseSchema } from "@/lib/recipes";

const client = new Anthropic();

const SYSTEM_PROMPT = `Ты — домашний повар-помощник. Пользователь перечисляет продукты, которые у него есть, а ты предлагаешь 3 простых рецепта на ужин.

Правила:
- Рецепты должны в основном опираться на продукты пользователя. Соль, перец, растительное масло и воду считай доступными всегда.
- Если чего-то не хватает, перечисли это в "missing" (не больше 3 позиций на рецепт). Если всего хватает — оставь "missing" пустым.
- Строго соблюдай выбранные фильтры.
- "timeMinutes" — реалистичное полное время готовки.
- "emoji" — одно эмодзи, похожее на блюдо.
- "description" — одно короткое предложение.
- "steps" — 3–7 коротких шагов.
- Пиши по-русски.`;

export async function POST(req: Request) {
  const parsed = RecipesRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Добавьте хотя бы один продукт." }, { status: 400 });
  }
  const { products, filters } = parsed.data;

  const filterText = filters.length
    ? `Фильтры: ${filters.map((f) => FILTERS[f]).join(", ")}.`
    : "Фильтров нет.";

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: {
        effort: "low",
        format: zodOutputFormat(RecipesResponseSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Продукты: ${products.join(", ")}.\n${filterText}`,
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json(
        { error: "Не получилось придумать рецепты. Попробуйте другой набор продуктов." },
        { status: 502 },
      );
    }

    return NextResponse.json({ recipes: response.parsed_output.recipes.slice(0, 3) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Слишком много запросов, попробуйте через минуту." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth error: check ANTHROPIC_API_KEY");
      return NextResponse.json({ error: "Сервис не настроен." }, { status: 500 });
    }
    console.error(err);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуйте ещё раз." }, { status: 500 });
  }
}
