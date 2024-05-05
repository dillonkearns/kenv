// Name: Llama3 Chat
// Author: Dillon Kearns
// Twitter: @dillontkearns

import "@johnlindquist/kit";
import fetch from "node-fetch";
import * as readline from "readline";


let running = true;
let conversationHistory = [];

await chat({
  onInit: async () => {},
  onSubmit: async (input) => {
    running = true;
    sendUserMessage(input);
  },
});

async function sendUserMessage(userMessage: string) {
  chat.addMessage("");
  conversationHistory.push({ role: "user", content: userMessage });

  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3:70b",
      messages: conversationHistory,
      stream: true,
      num_gpu: 99,
    }),
  });

  running = false;

  let assistantResponse = "";

  const rl = readline.createInterface({
    input: response.body,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim() !== "") {
      const parsed = JSON.parse(line);
      if (parsed.message && parsed.message.role === "assistant") {
        assistantResponse += parsed.message.content;
        chat.setMessage(-1, md(assistantResponse));
      }
    }

    conversationHistory.push({ role: "assistant", content: assistantResponse });
  }
}