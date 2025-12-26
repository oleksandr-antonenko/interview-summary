import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
};

export async function identifySpeakers(transcription: string, language: string = 'en'): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const prompt = `Analyze this interview transcription and identify who each speaker is.

Based on the context, determine:
- Who is the interviewer (the person asking questions)
- Who is the interviewee/hero (the person being interviewed)
- If you can determine the name of any speaker from the conversation, use their name

Return ONLY a JSON object mapping speaker numbers to their roles/names. Use ${langName} for role names.
Example response format:
{"Speaker 1": "Интервьюер", "Speaker 2": "Александр (герой)"}
or in English:
{"Speaker 1": "Interviewer", "Speaker 2": "John (Hero)"}

If you cannot determine a specific name, use a role description like "Интервьюер" or "Герой интервью" (in ${langName}).

TRANSCRIPTION:
${transcription}

Respond with ONLY the JSON object, no other text.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const jsonText = response.text()?.trim();

  if (!jsonText) {
    return transcription;
  }

  try {
    const speakerMap = JSON.parse(jsonText.replace(/```json\n?|\n?```/g, ''));

    let updatedTranscription = transcription;
    for (const [original, replacement] of Object.entries(speakerMap)) {
      updatedTranscription = updatedTranscription.replace(
        new RegExp(`${original}:`, 'g'),
        `${replacement}:`
      );
    }

    return updatedTranscription;
  } catch {
    return transcription;
  }
}

export async function generateSummary(transcription: string, language: string = 'en'): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const prompt = `You are an expert at summarizing interview transcriptions.
Please analyze the following interview transcription and provide your response in ${langName}:

1. A brief overview (2-3 sentences)
2. Key topics discussed (bullet points)
3. Main insights or takeaways (bullet points)
4. Notable quotes (if any)

Keep the summary concise but comprehensive. Write the entire response in ${langName}.

TRANSCRIPTION:
${transcription}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const summary = response.text();

  if (!summary) {
    throw new Error('No summary generated');
  }

  return summary;
}
