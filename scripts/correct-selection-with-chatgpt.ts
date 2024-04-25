// Name: Correct selection
// Description: Fix grammar and spelling mistakes in any text field.
// Shortcut:option+g

import "@johnlindquist/kit";

import OpenAI from "openai";

import * as Diff from "diff";

const openAiKey = await env("OPENAI_API_KEY", {
  hint: `Grab a key from <a href="https://platform.openai.com/account/api-keys">here</a>`,
});
const openai = new OpenAI({
  apiKey: openAiKey,
});

const correctionPrompt = (text) =>
  `Please fix the grammar and spelling of the following text in Norwegian and return it without any other changes. If there are any phrases that are not idiomatic Norwegian that a native speaker would use, please fix them. However, do not make any stylistic changes at all *unless* they would be considered incorrect or sound off to a native speaker.

Make the suggestions concise, but also very explicit.

I speak with an Oslo østlandske dialekt, so *do not* make suggestions that are simply a dialectal style difference. For example, do not correct "huska" to "husket" as it is a valid form in my dialect.

For example, if an incorrect gender is used, state what the correct gender is, like "changed to jubileet because gender is neuter."

If a preposition is incorrect, give a brief explanation of the relevant rule if it can be very concisely stated. For example, "changed to på because it is used for surfaces or specific points."

Don't limit suggestions to basic spelling and grammar mistakes, but also include suggestions for more complex issues like incorrect or unidiomatic word choice, phrasing, idioms, etc. However, keep the language casual and conversational (do not make suggestions that merely increase the formality level when they could be considered correct but less formal without it).

Some context to keep in mind: I am a new father of a 4-month old boy named Rohan and am often speaking about him in my messages. If you notice any baby-related terms that are not idiomatic (perhaps they are directly translated from English, but aren't the word or phrase a native Norwegian speaker would use), please correct them.

So if you see "onesie", assume that is talking about a baby outfit and use the appropriate Norwegian baby term. For example, if you see "spytte opp", assume that is talking about a baby spitting up and use the appropriate Norwegian term, "å gulpe". Use the context of talking about a baby to determine if there is a phrase that is being directly translated from English, and make it more idiomatic using your knoweldge of Norwegian baby terms and phrases.

Also, if you see a segment that is surrounded in curly braces, take that to mean it is a value in English. The suggested text SHOULD NOT contain any curly braces. Of course, translate it within its context so that the final flow of the entire message still makes sense with that substitued value.

Return a response that strictly follows the following format:

- The first line must be the suggested text (the original with modifications applied). Do not include any other information, context, comments, explanations, or characters, and DO NOT include a new line as part of this suggested text. The newline will be the delimter to indicate the end of this content.
- After a newline from the suggested text, include a single line with the English translation of the suggested text, followed by a newline.
- After the newline for the previous content, the rest of the response should be context, which should again be newline-separated, with one point of context on each line. Each of the lines represents a brief bullet point to explain any non-obvious changes. To be mindful of the readers time, keep it concise - do not include any explanations for obvious things such as a typo or spelling correction, only for changse where it would be illuminating to add a little context. Be sure to include anything you are uncertain about in the context as its important for me to know potential issues before I send my messages.


Here is the original text:

${text}`;

// await hide();
// await wait(100);
const text = await getSelectedText();
// await wait(100);

if (text) {
  let suggestionView = await widget(
    `<div class="flex flex-col"><h2 class="p-10 text-4xl text-center" v-html="diffHtmlString"></h2>
<ul class="list-disc p-10">
  <li v-for="item in context" v-html="item">
  <!-- remove leading "- " from item, IF present  -->
{{ item, "")}}
</li>
</ul>
</div>`,
    {
      // center: true,
      width: 800,
      height: 800,
      focusable: false,
      // fullscreen: true,

      state: { diffHtmlString: "<span></span>", suggestedComplete: false },
      // focusable: false,
      closable: true,
      movable: true,
      // alwaysOnTop: true,
    },
  );
  suggestionView.setState({
    diffHtmlString: diffHtml(text, ""),
  });
  const stream = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    // model: "gpt-4",
    // temperature: 0.5,
    temperature: 0.2,
    messages: [{ role: "user", content: correctionPrompt(text) }],
    stream: true,
  });
  let i = 0;
  let suggested = "";
  let suggestedComplete = false;
  let thisContext = "";
  let context = [];
  let confirm;
  for await (const chunk of stream) {
    const thisChunk = chunk.choices[0]?.delta?.content || "";
    if (suggestedComplete) {
      if (thisChunk.endsWith("\n")) {
        context.push(thisContext + thisChunk);
        thisContext = "";
      } else if (thisChunk.includes("\n")) {
        let previous,
          nextItems = thisChunk.split("\n");
        context.push(thisContext + previous);
        // push each item except the last from nextItems
        if (nextItems.length > 1) {
          for (let j = 0; j < nextItems.length - 1; j++) {
            context.push(nextItems[j]);
          }
          // set thisContext to the last item in nextItems
          thisContext = nextItems[nextItems.length - 1];
        } else {
          thisContext = "";
        }
      } else {
        thisContext += thisChunk;
      }
      suggestionView.setState({
        context: context.map((c) => c.replace(/^\s*-\s*/, "")),
      });
    } else {
      suggested += thisChunk;
      if (thisChunk.includes("\n")) {
        suggestedComplete = true;

        confirm = arg({
          placeholder: "Replace selected text with corrected text?",
          enter: "Yes",
          choices: ["Yes", "No"],
        });
      }
      suggestionView.setState({
        diffHtmlString: diffHtml(text, suggested),
        suggestedComplete,
      });
    }
    i += 1;
  }
  const confirmText = await confirm;
  if (confirmText === "Yes") {
    await clipboard.writeText(suggested);
  }

  // const choice = await arg({
  //   placeholder: "Replace selected text with corrected text?",
  //   enter: "Confirm",
  //   onEscape: () => {},
  //   choices: ["Confirm", "Cancel"],
  // });

  // if (choice === "Confirm") {
  // suggestionView.close();
  // await hide();
  // await blur();
  // await wait(100);
  // suggestionView.onClose(async () => {
  //   await focus();
  //   await setSelectedText(suggested);
  // });
  // }
  // const tab = kit.getActiveTab();
  // kit.focusTab();
  // suggestionView.close();
  // await wait(100);
  // await setSelectedText(suggested);
}

function diffHtml(one: string, other: string) {
  const diff = Diff.diffWords(one, other);

  const nodes = diff.map(function async(part) {
    const tailwindColorClass = part.added
      ? "text-green-500"
      : part.removed
      ? "text-red-500"
      : "text-gray-500";
    return `<span class="${tailwindColorClass}">${part.value}</span>`;
  });
  return nodes.join("");
}
