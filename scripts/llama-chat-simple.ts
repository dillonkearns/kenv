// Name: Llama3 Chat
// Author: Dillon Kearns
// Twitter: @dillontkearns

import "@johnlindquist/kit";
import fetch from "node-fetch";
import * as readline from "readline";
import * as fs from "fs";

let running = true;
let conversationHistory = loadTodayChatHistory();

await chat({
  onInit: async () => {
    chat.setMessages(
      conversationHistory.map((message) => {
        // return message.role === "user" ? message.content : md(message.content);
        debugger;
        // return message.content;
        return {
          text: md(message.content),
          position: message.role === "user" ? "right" : "left",
          type: "text",
        };
      }),
    );
  },
  onSubmit: async (input) => {
    running = true;
    saveTodayChatHistory(conversationHistory);
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
      use_mmap: false,
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
  }
  conversationHistory.push({ role: "assistant", content: assistantResponse });
  saveTodayChatHistory(conversationHistory);
}

function loadTodayChatHistory() {
  const fileName = historyFileName();
  if (fs.existsSync(fileName)) {
    return JSON.parse(fs.readFileSync(fileName, "utf-8"));
  } else {
    return [];
  }
}

function saveTodayChatHistory(history) {
  const fileName = historyFileName();
  fs.mkdirSync(path.dirname(fileName), { recursive: true });
  fs.writeFileSync(fileName, JSON.stringify(history, null, 2));
}

function historyFileName() {
  const isoDate = new Date().toISOString().split("T")[0];
  const fileName = path.join(
    "/Users/dillonkearns/src/chat/productivity/",
    `${isoDate}.json`,
  );
  return fileName;
}

