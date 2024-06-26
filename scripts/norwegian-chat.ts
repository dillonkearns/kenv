// Name: Correct selection
// Description: Fix grammar and spelling mistakes in any text field.
// Shortcut:option+j

// import "@johnlindquist/kit";

// import OpenAI from "openai";

import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory } from "langchain/memory";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatAnthropic } from "@langchain/anthropic";

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import * as Diff from "diff";

const openAiKey = await env("OPENAI_API_KEY", {
  hint: `Grab a key from <a href="https://platform.openai.com/account/api-keys">here</a>`,
});
const anthropicKey = await env("ANTHROPIC_API_KEY", {
  hint: `Grab a key from <a href="https://console.anthropic.com/settings/keys">here</a>`,
});
// const openai = new OpenAI({
//   apiKey: openAiKey,
// });

const correctionPrompt = (text) =>
  `Please fix the grammar and spelling of the following text in Norwegian and return it without any other changes. If there are any phrases that are not idiomatic Norwegian that a native speaker would use, please fix them. However, do not make any stylistic changes at all *unless* they would be considered incorrect or sound off to a native speaker.

Make the suggestions concise, but also very explicit.

I speak with an Oslo østlandske dialekt, so *do not* make suggestions that are simply a dialectal style difference. For example, do not correct "huska" to "husket" as it is a valid form in my dialect.

For example, if an incorrect gender is used, state what the correct gender is, like "changed to jubileet because gender is neuter."

If a preposition is incorrect, give a brief explanation of the relevant rule if it can be very concisely stated. For example, "changed to på because it is used for surfaces or specific points."

Don't limit suggestions to basic spelling and grammar mistakes, but also include suggestions for more complex issues like incorrect or unidiomatic word choice, phrasing, idioms, etc. However, keep the language casual and conversational (do not make suggestions that merely increase the formality level when they could be considered correct but less formal without it).

Some context to keep in mind: I am a new father of a 4-month old boy named Rohan and am often speaking about him in my messages. If you notice any baby-related terms that are not idiomatic (perhaps they are directly translated from English, but aren't the word or phrase a native Norwegian speaker would use), please correct them.

So if you see "onesie", assume that is talking about a baby outfit and use the appropriate Norwegian baby term. For example, if you see "spytte opp", assume that is talking about a baby spitting up and use the appropriate Norwegian term, "å gulpe". Use the context of talking about a baby to determine if there is a phrase that is being directly translated from English, and make it more idiomatic using your knoweldge of Norwegian baby terms and phrases.

Also, if you see a segment that is surrounded in backticks, take that to mean it is a value in English. The suggested text SHOULD NOT contain any backticks. Of course, translate it within its context so that the final flow of the entire message still makes sense with that substitued value.

If you see a section with square brackets around it, those must also be replaced (the suggested text SHOULD NOT contain any square brackets). The square brackets are for text that is in Norwegian, but where I am unsure if it is proper or idiomatic. If you see | characters within the square brackets, that means there are multiple options for that segment that I am considering, and you should either choose if it is indeed idiomatic and correct, OR suggest one if none of the options are ideal.

If you see a section with carets around it, <>, that means I would like additional context or information about that segment. The suggested text SHOULD NOT contain any carets. However, do be sure to include helpful context, like the definition and translation of that word in the context section.

In order to set or update the suggested text, start the message with START_SUGGESTION and end it with END_SUGGESTION. Everything outside of that will be interpreted as a freeform markdown message, but the suggested text will be used to update the user's text message on their computer so use the correct format please.

The initial response MUST set the suggested text (and therefore must start with START_SUGGESTION).

- Within the suggested text (the original with modifications applied), never include any other information, context, comments, explanations, or characters. Use END_SUGGESTION to mark the end of the suggested text.
- You may then use any freeform text, but it is recommended that you include a markdown bullet point with the English translation of the suggested text.
- It is also recommended that you include brief bullet point to explain any non-obvious changes. To be mindful of the readers time, keep it concise - do not include any explanations for obvious things such as a typo or spelling correction, only for changse where it would be illuminating to add a little context. Be sure to include anything you are uncertain about in the context as its important for me to know potential issues before I send my messages.

After the initial response, you may continue in a conversational style with the user to refine the suggestions and provide more context as needed based on the user's requests. You may also update your suggested text based on the user's feedback. If you do so, include the updated suggested text with START_SUGGESTION and END_SUGGESTION tags around it. Everything around it will be considered to be free-form text.

After the initial response, feel free to just chat in a more free-form style, don't get stuck on the original format after the initial response. The initial response is just to get the ball rolling and provide a structured way to start the conversation.

Here is the original text:

${text}
`;

const text = await getSelectedText();
// const text = "Hei på deg!";

function diffViewString(diffHtmlString, context) {
  return `<div class="flex flex-col"><div class="p-10 text-2xl text-center">${diffHtmlString}</div>
<ul class="list-disc p-10">
  ${context.map((item) => `<li>${item}</li>`)}
</ul>
</div>`;
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

if (text) {
  let prompt = ChatPromptTemplate.fromMessages([
    correctionPrompt(text),
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  let openAIApiKey = await env("OPENAI_API_KEY", {
    hint: `Grab a key from <a href="https://platform.openai.com/account/api-keys">here</a>`,
  });

  let buffer = "";
  let inSuggestion = false;
  let rawMessage = "";
  let currentMessage = ``;
  let currentInput = ``;
  let chatHistoryPreAbort = [];
  let suggested = "";
  let id = -1;
  let running = false;
  let llm =
    //
    new ChatOpenAI({
      openAIApiKey,
      // modelName: "gpt-4",
      modelName: "gpt-4-turbo",
      // new ChatAnthropic({
      //   // model: "claude-3-sonnet-20240229",
      //   model: "claude-3-opus-20240229",
      //   anthropicApiKey: anthropicKey,
      // new ChatOllama({
      //   model: "llama3:70b",
      streaming: true,
      callbacks: [
        {
          handleLLMStart: async () => {
            id = setTimeout(() => {
              chat.setMessage(
                -1,
                md(`### Sorry, the AI is taking a long time to respond.`),
              );
              setLoading(true);
            }, 3000);
            log(`handleLLMStart`);
            currentMessage = ``;
            chat.addMessage("");
          },
          handleLLMNewToken: async (token) => {
            clearTimeout(id);
            setLoading(false);
            if (
              buffer != "" ||
              token.includes("START") ||
              token.includes("END")
            ) {
              buffer += token;
              if (inSuggestion) {
                if (buffer.includes("END_SUGGESTION")) {
                  suggested += buffer.split("END_SUGGESTION")[0];
                  inSuggestion = false;
                  buffer = "";
                  return;
                } else {
                  return;
                }
              } else {
                if (buffer.includes("START_SUGGESTION")) {
                  suggested = "";
                  chat.addMessage("");
                  inSuggestion = true;
                  buffer = "";
                  suggested += buffer.split("START_SUGGESTION")[0];
                  return;
                } else {
                  return;
                }
                currentMessage += token;
              }
            }
            if (!token) return;
            console.log(token);
            if (inSuggestion) {
              suggested += token;
              chat.setMessage(0, diffViewString(diffHtml(text, suggested), []));
            } else {
              currentMessage += token;
              let htmlMessage = md(currentMessage);
              chat.setMessage(-1, htmlMessage);
            }
          },
          // Hitting escape to abort throws and error
          // Must manually save to memory
          handleLLMError: async (err) => {
            warn(`error`, JSON.stringify(err));
            running = false;
            // for (let message of chatHistoryPreAbort) {
            //   log({ message })
            //   if (message.text.startsWith(memory.aiPrefix)) {
            //     await memory.chatHistory.addAIChatMessage(message)
            //   }
            //   if (message.text.startsWith(memory.humanPrefix)) {
            //     await memory.chatHistory.addUserMessage(message)
            //   }

            //   await memory.chatHistory.addAIChatMessage(currentMessage)
            //   await memory.chatHistory.addUserMessage(currentInput)
            // }

            memory.chatHistory.addUserMessage(currentInput);
            memory.chatHistory.addAIChatMessage(currentMessage);
          },
          handleLLMEnd: async () => {
            running = false;
            memory.chatHistory.addAIChatMessage(rawMessage);
            log(`handleLLMEnd`);
          },
        },
      ],
    });

  let memory = new BufferWindowMemory({
    k: 10,
    inputKey: "input", // required when using a signal to abort
    returnMessages: true,
  });

  let chain = new ConversationChain({
    llm,
    prompt,
    memory,
  });
  chain.pipe(prompt);

  // let chain = prompt.pipe(llm);
  // chain.call({
  //   input: "",
  // });

  let controller = new AbortController();

  chain.call({
    input: text,
    controller,
  });
  await chat({
    shortcuts: [
      {
        name: `Close`,
        key: `${cmd}+w`,
        onPress: () => {
          process.exit();
        },
        bar: "left",
      },
      // {
      //   name: `Continue Script`,
      //   key: `${cmd}+enter`,
      //   onPress: () => {
      //     submit("");
      //   },
      //   bar: "right",
      // },
      {
        name: `Godta endringer`,
        key: `${cmd}+enter`,
        onPress: async () => {
          await setSelectedText(suggested);
          exit();
        },
        bar: "right",
      },
    ],
    onEscape: async () => {
      // chatHistoryPreAbort = await memory.chatHistory.getMessages()
      // log({ chatHistory: memory.chatHistory })
      // log({ chatHistoryPreAbort })

      if (running) controller.abort();
    },
    onSubmit: async (input) => {
      currentInput = input;
      controller = new AbortController();
      running = true;
      await chain.call({ input, signal: controller.signal });
      // await llm.invoke(input, { signal: controller.signal });
    },
  });

  let conversation = (await memory.chatHistory.getMessages())
    .map(
      (m) =>
        (m.constructor.name.startsWith("Human")
          ? memory.humanPrefix
          : memory.aiPrefix) +
        "\n" +
        m.text,
    )
    .join("\n\n");

  inspect(conversation);
}
