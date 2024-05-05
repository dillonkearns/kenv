// Name: Llama3 Chat
// Author: Dillon Kearns
// Twitter: @dillontkearns

import "@johnlindquist/kit";
import fetch from "node-fetch";
import * as readline from "readline";

await chat({
  onInit: async () => {
    chat.addMessage("Why is the sky blue?");
    chat.addMessage("");
    // Conversation history
    const userMessage = "Why is the sky blue?";
    const conversationHistory = [{ role: "user", content: userMessage }];

    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3:70b",
        messages: [
          ...conversationHistory,
          //  { role: "user", content: userMessage }],
        ],
        stream: true,
        num_gpu: 99,
      }),
    });

    let assistantResponse = "";

    const rl = readline.createInterface({
      input: response.body,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      debugger;
      if (line.trim() !== "") {
        const parsed = JSON.parse(line);
        if (parsed.message && parsed.message.role === "assistant") {
          assistantResponse += parsed.message.content;
          chat.setMessage(-1, md(assistantResponse));
          // Process or display the chunk of the assistant's response
        }
      }
    }

    // Update the conversation history with the user message and assistant response
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: assistantResponse });
  },
});
