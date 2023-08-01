import { OpenAITranscriptionModel, transcribe } from "ai-utils.js";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config();

(async () => {
  const data = await fs.promises.readFile("data/test.mp3");

  const { transcription } = await transcribe(
    new OpenAITranscriptionModel({ model: "whisper-1" }),
    {
      type: "mp3",
      data,
    }
  );

  console.log(transcription);
})();
