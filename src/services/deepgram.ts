import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

interface Word {
  word: string;
  speaker?: number;
  punctuated_word?: string;
}

function formatWithSpeakers(words: Word[]): string {
  if (!words || words.length === 0) {
    return '';
  }

  const lines: string[] = [];
  let currentSpeaker: number | undefined = undefined;
  let currentLine: string[] = [];

  for (const word of words) {
    const speaker = word.speaker;
    const text = word.punctuated_word || word.word;

    if (speaker !== currentSpeaker) {
      if (currentLine.length > 0) {
        lines.push(`Speaker ${(currentSpeaker ?? 0) + 1}: ${currentLine.join(' ')}`);
      }
      currentSpeaker = speaker;
      currentLine = [text];
    } else {
      currentLine.push(text);
    }
  }

  if (currentLine.length > 0) {
    lines.push(`Speaker ${(currentSpeaker ?? 0) + 1}: ${currentLine.join(' ')}`);
  }

  return lines.join('\n\n');
}

export async function transcribeAudio(audioBuffer: Buffer, mimetype: string, language: string = 'en'): Promise<string> {
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
    model: 'nova-3',
    language: language,
    smart_format: true,
    punctuate: true,
    diarize: true,
    mimetype: mimetype,
  });

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words as Word[] | undefined;

  if (!words || words.length === 0) {
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    if (!transcript) {
      throw new Error('No transcription result received');
    }
    return transcript;
  }

  return formatWithSpeakers(words);
}
