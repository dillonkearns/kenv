// Name: Transcribe Mic

import "@johnlindquist/kit";
import * as fs from "fs";

let audioPath = tmpPath(`${Date.now()}.webm`);
let audioPath2 = tmpPath(`${Date.now()}.wav`);

await mic({ filePath: audioPath });

await $`ffmpeg -i ${audioPath} -acodec pcm_s16le -ar 16000 -ac 1 ${audioPath2}`;

const transcriptPath = tmpPath(`transcript`);

await $`/Users/dillonkearns/src/github.com/ggerganov/whisper.cpp/main -m /Users/dillonkearns/src/github.com/ggerganov/whisper.cpp/models/ggml-large-v3.bin ${audioPath2} --output-txt -of ${transcriptPath}`;

const transcribedText = fs.readFileSync(`${transcriptPath}.txt`, "utf-8");

await say(transcribedText);

await editor(fs.readFileSync(`${transcriptPath}.txt`, "utf-8"));
