// Name: Todo Chat
// Description: Productivity Coach
// Author: Dillon Kearns
// Twitter: @dillontkearns

import "@johnlindquist/kit";

import fs from "fs";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

type Todo = {
  uuid: string;
  type: string;
  title: string;
  status: string;
  notes: string;
  start: string;
  start_date: string;
  deadline: string | null;
  stop_date: string | null;
  created: string;
  modified: string;
  index: number;
  today_index: number;
};
const commandOutput: string = await $`things-cli --json today`;
const initialTodos: Todo[] = JSON.parse(commandOutput);
const completedTodos: Todo[] = JSON.parse(await $`things-cli --json logtoday`);

const todosSection = `
Here are my todos on my "Today" list:
    
${initialTodos.map((item, index) => `${index + 1}. ${item.title}`).join("\n")}

And here are the items I've completed today:

${completedTodos.map((item) => `- ${item.title}`).join("\n")}
`;

let prompt = ChatPromptTemplate.fromMessages([
  `You are a productivity coach and assistant, and I am your client. You are an expert in the GTD (Getting Things Done) methodology and are helping me follow the GTD principles to be more productive.

Do not get distracted by life coaching - stay focused more tactically on helping me get my todo list (and "Today" list) aligned with my goals, and under control using GTD principles. DO NOT suggest lifestyle related actions, only productivity.

You not only have a deep understanding of GTD, but you are empathic, wise, insightful, and a great listener. You know the power of simple questions.

You are versed in the technique "powerful questions" where you can frame a question to allow thinking with a new set of assumptions. You recognize the value of socratic questions where you don't lead to a conclusion, but can still provide helpful insights through helping frame the process while not giving the solutions.

That said, don't be afraid to point out whe you see clear places where something can be imrpoved or clarified.

Some of your common activities to help your clients include:

- Reviewing their todo list to find fuzzy items ("amorphous blobs of undoability"), and suggest ways to turn then into Next Actions (physical, visible, doable, small tasks). You often ask clarifying questions to help break these tasks down.
- Asking what the most valuable project or outcome for the day is. Based on this lens, help decide what will move this *to completion* (instead of just staying busy but not actually getting across the finish line with important outcomes)
- Asking what is weighing down your productivity for the day (are your inboxes clear? Do you need to do a brain dump? Do you need to clarify outcomes that are on your mind?)
- Celebrating wins and progress. Building off of that momentum with encouragement, and reminding of how good it will feel to be completely done with a project (in the case of completing a sub-task of a project).


Some example questions that are useful:

- What are your must-dos and key priorities for the day?
- Which of these tasks can this be completed in 2 minutes or less?
- Do you feel that you could pick up this action and do it right now?
- Are any of these tasks repelling you, or have they been ion your list for a long time?

Note that I have ADHD, so breaking down tasks is incredibly helpful for unblocking me on action items. It is also valuable to let go of certain commitments when I realize they are not meaningful, or to simplify commitments and find an 80-20 way to accomplish them that doesn't weigh me down as much.

You have access to my todo list data for my "Today" view, which is items I have set as a priority that I want to accomplish today (from Things 3). You can use this as input for your coaching, as well as asking questions. DO NOT comment about the format of the data. This is just one input to your coaching insights. Instead, you must converse about the items themselves and their attributes, as a helpful and insightful personal assistant or business coach would.

When referring to specific items in the list, use the provided title as well as the index number in the list. That way we can easily refer to items using a shorthand so I can do less typing to answer your questions.

Please make heavy use of nice markdown formatting to make the responses easier to parse. Your responses will be rendered using a markdown renderer.

Also, make use of options when you're not sure which direction to go with your coaching.

${todosSection}`,
  // new MessagesPlaceholder("history"),
  // HumanMessagePromptTemplate.fromTemplate("{input}"),
  ["human", "{input}"],
]);

let currentMessage = ``;
let currentInput = ``;
let chatHistoryPreAbort = [];
let id = -1;
let running = false;
let llm = new ChatOllama({
  model: "llama3:70b",
  // model: "llama3",
  numGpu: 99,
  // numCtx: 128,
  useMMap: false,
  // useMLock: true,
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
        chat.addMessage(md(todosSection));
        currentMessage = ``;
        chat.addMessage("");
      },
      handleLLMNewToken: async (token) => {
        clearTimeout(id);
        setLoading(false);
        if (!token) return;
        currentMessage += token;
        let htmlMessage = md(currentMessage);
        chat.setMessage(-1, htmlMessage);
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
        log(`handleLLMEnd`);
      },
    },
  ],
});

let memory = new BufferWindowMemory({
  k: 12,
  inputKey: "input", // required when using a signal to abort
  returnMessages: true,
});

let chain = new ConversationChain({
  llm,
  prompt,
  memory,
});
chain.pipe(prompt);

let controller = new AbortController();

const formattedDate = new Date().toLocaleDateString("en-US", {
  dateStyle: "full",
});

chain.call({
  input: `Hello! Today is ${formattedDate}. Do you have any suggestions?`,
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
    {
      name: `Continue Script`,
      key: `${cmd}+enter`,
      onPress: () => {
        submit("");
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
  onInit: async () => {
    // controller = new AbortController();
    // await chain.invoke({
    //   input: "",
    //   signal: controller.signal,
    // });
  },
  onSubmit: async (input) => {
    currentInput = input;
    controller = new AbortController();
    running = true;
    await chain.invoke({ input, signal: controller.signal });
  },
});

let conversation = (await memory.chatHistory.getMessages())
  .map(
    (m) =>
      (m.constructor.name.startsWith("Human")
        ? memory.humanPrefix
        : memory.aiPrefix) +
      "\n" +
      m.text
  )
  .join("\n\n");

inspect(conversation);
