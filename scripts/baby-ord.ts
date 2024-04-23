// Name: Norske baby ord.
// Description: Forslag for norske baby terminologi.

import "@johnlindquist/kit";
import { UI } from "@johnlindquist/kit/core/enum";

import OpenAI from "openai";

const openAiKey = await env("OPENAI_API_KEY", {
  hint: `Grab a key from <a href="https://platform.openai.com/account/api-keys">here</a>`,
});
const openai = new OpenAI({
  apiKey: openAiKey,
});

const correctionPrompt = (text) =>
  `Du er en ekspert i norske språke, og føller med alle terminologi angåene å oppdra barn. Jeg har en sønn, første barnet mitt, som var født fire måneder siden. Jeg tviler noen ganger om hvordan jeg skal snakke om små ting i livet hans. For eksempel, på engelsk sier vi «spitting up». Jeg hœr lœrt at det er «å gulpe» på norsk. Din jobb er å hjelpe meg finne på andre ord eller uttrykk som jeg bør bruke i stedet for de engelske ordene. Hjelp meg med å oversette dette til norsk. Jeg vil gjerne at du gjør det så enkelt som mulig.

Jeg skal jeg deg et engeslk ord eller uttrykk, og du skal oversette det til norsk. Husk at forslagene dine skal være idiomatic norsk, og ikke bare en direkte oversettelse fra engelsk (det er hele poenget med å ha deg her!).

Gi svar i dette formatet:

- Første linje: Oversettelsen av det engelske ordet eller uttrykket. Hvis det er flere mulige oversettelser, velg den som er mest passende for en baby, men inkluder gjerne flere alternativer.
- Etter første linje, "bullet points" for kontekst. Hver linje skal være en kort forklaring, eller eksempel. Eksempler er viktig for å vise kjønn, eller idiomatic bruk, korrekte preposisjoner, osv.


Her er det engelske ordet eller uttrykket:

${text}`;

const text = await arg("Velg teksten du vil oversette til norsk");

if (text) {
  let messages = [];
  let suggestionView = await widget(
    `<div class="flex flex-col"><h2 class="p-10 text-4xl text-center">{{original}} -> {{suggestion}}</h2>
  <ul class="list-disc p-10">
    <li v-for="item in context" v-html="item">
  {{ item }}
  </li>

  </div>`,
    {
      // center: true,

      width: 800,
      height: 800,
      // fullscreen: true,

      state: {
        original: text,
        suggestion: "...",
        messages,
      },
    },
  );
  // suggestionView.onClick(() => {});
  suggestionView.onInput(({ value }) => {
    messages.push({ role: "user", content: value });
    suggestionView.setState({ messages });
  });
  const stream = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    temperature: 0.5,
    messages: [{ role: "user", content: correctionPrompt(text) }],
    stream: true,
  });
  let i = 0;
  let suggested = "";
  let suggestedComplete = false;
  let thisContext = "";
  let context = [];
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
      suggestionView.setState({
        suggestion: suggested,
      });
      if (thisChunk.includes("\n")) {
        suggestedComplete = true;
      }
    }
    i += 1;
  }
  // await kit.kitPrompt({
  //   choices: ["a", "b", "c"],
  //   placeholder: "",
  //   ignoreBlur: true,
  //   resize: true,
  //   ui: UI.chat,
  // });
  // await chat()
  // await chat({
  //   //   panel: () =>
  //   //     `<div class="p-10"><h2 class="text-4xl text-center">Forslag for ${text}</h2><p>${suggested}</p></div>`,
  //   // }
  //   // green-500
  //   // html: md(`# Forslag for ${text}`),
  //   // ui: UI.mic,
  //   // footer: md("# asdf\n"),
  //   // preview: `<h2 style="color:red">Forslag for ${text}</h2>`,
  //   //     md(`# Requirements
  //   // - Cover Major Characters
  //   // - Address the theme
  //   // - Have a beginning, middle, and end
  //   // `),
  //   //`<h2 class="text-green-500">Hello!</h2>`,
  //   // preview: "Hello!",
  // });
}
