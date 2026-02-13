import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIReply(userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Twitch streamer assistant. Keep replies short, funny, and engaging.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 120,
      temperature: 0.8,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI Error:", err);
    return "⚠️ AI is currently offline.";
  }
}
