// Name: Correct selection
// Description: Fix grammar and spelling mistakes in any text field.
// Shortcut:cmd+option+g

import "@johnlindquist/kit";

import Bottleneck from "bottleneck";

import * as Diff from "diff";
import {
  array,
  boolean,
  field,
  fields,
  type Infer,
  format,
  number,
  string,
  JSON as tinyJSON,
} from "tiny-decoders";

const openAiKey = await env("OPENAI_API_KEY", {
  hint: `Grab a key from <a href="https://platform.openai.com/account/api-keys">here</a>`,
});

const correctionPrompt = (text) =>
  `Please fix the grammar and spelling of the following text in Norwegian and return it without any other changes. If there are any phrases that are not idiomatic Norwegian that a native speaker would use, please fix them. However, do not make any stylistic changes at all *unless* they would be considered incorrect or sound off to a native speaker.

Make the suggestions concise, but also very explicit.

I speak with an Oslo østlandske dialekt, so *do not* make suggestions that are simply a dialectal style difference. For example, do not correct "huska" to "husket" as it is a valid form in my dialect.

For example, if an incorrect gender is used, state what the correct gender is, like "changed to jubileet because gender is neuter."

If a preposition is incorrect, give a brief explanation of the relevant rule if it can be very concisely stated. For example, "changed to på because it is used for surfaces or specific points."

Return a strictly JSON response, with the following format:

- "suggested" a string of the recommended text with modifications applied.
- "context" an array of strings, each one representing brief bullet points to explain any non-obvious changes. To be mindful of the readers time, keep it concise - do not include any explanations for obvious things such as a typo or spelling correction, only for changse where it would be illuminating to add a little context.


Here is the original text:

${text}`;

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 100,
});

const type = (text) => {
  return new Promise((resolve) => {
    keyboard.type(text);
    resolve();
  });
};

const wrappedType = limiter.wrap(type);

const text = await getSelectedText();

if (text) {
  const { suggested, context } = await getGptResponse(correctionPrompt(text));
  const diffHtmlString = diffHtml(text, suggested);

  await div(`<h2 class="p-10 text-4xl text-center">${diffHtmlString}</h2>
  <!-- let's apply some nice tailwind ul formatting! -->
  <ul class="list-disc p-10">
  ${context.map((c) => `<li>${md(c)}</li>`).join("")}
  </ul>`);
  wrappedType(suggested);
}

async function getGptResponse(prompt) {
  const gptCodec = fields({
    suggested: string,
    context: array(string),
  });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo",
    }),
  });

  const json = await response.json();
  const decoded = gptCodec.decoder(JSON.parse(json.choices[0].message.content));
  switch (decoded.tag) {
    case "Valid":
      return decoded.value;
    case "DecoderError":
      throw new Error(format(decoded.error));
  }
}

function diffHtml(one: string, other: string) {
  const diff = Diff.diffWords(one, other);

  const nodes = diff.map(function async(part) {
    const color = part.added ? "green" : part.removed ? "red" : "grey";
    const tailwindColorClass = part.added
      ? "text-green-500"
      : part.removed
      ? "text-red-500"
      : "text-gray-500";
    return `<span class="${tailwindColorClass}">${part.value}</span>`;
  });
  return nodes.join("");
}
