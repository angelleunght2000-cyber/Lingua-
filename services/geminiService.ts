
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { Language, GroupSummary } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // In a real local setup, ensure your bundler (like Vite) 
    // is configured to inject process.env.API_KEY
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async summarizeAudioFile(base64Audio: string, mimeType: string, language: Language): Promise<any> {
    // Using Flash for simplicity, speed, and free-tier compatibility
    const model = 'gemini-3-flash-preview';
    const prompt = `
      You are an expert multilingual transcriber and audio analyst.
      
      Task:
      1. TRANSCRIBE the audio content with 100% accuracy.
         - If Target Language is Cantonese: Use Traditional Chinese characters and HK idioms.
         - If Target Language is Mandarin/Chinese: Use Simplified Chinese characters.
         - If Target Language is English: Use standard English.
         - If Target Language is German: Use proper German grammar and spelling.
         - If Target Language is Japanese: Use appropriate Japanese characters (Hiragana, Katakana, Kanji) with natural Japanese expressions.
      
      2. CLASSIFY the audio type accurately:
         - Options: "Music/Song", "Meeting", "Lecture", "Interview", "Podcast", "Memo/Voice Note", "Presentation", "Conversation", "Other"
         - If it's music/song, classify as "Music/Song"
      
      3. IDENTIFY Artist & Song (ONLY if this is music/song):
         - BE VERY CONSERVATIVE: Only provide artist/song name if you are HIGHLY CONFIDENT
         - If the artist or song name is NOT explicitly mentioned or clearly identifiable, set to "Unknown"
         - Do NOT guess or make assumptions
         - If uncertain, prefer "Unknown" over incorrect information
         - Format: "Artist Name - Song Title" or "Unknown - Unknown"
      
      4. CREATE a descriptive title:
         - For Music/Songs: Use the format "Song: [Artist] - [Title]" if known, otherwise "Song: [First line of lyrics]"
         - For other audio: Create a concise descriptive title
      
      5. SUMMARIZE with 5-7 clear bullet points:
         - For Music/Songs: Include genre, mood, key lyrics themes, language of lyrics, notable musical elements
         - For other audio: Include main topics, key decisions, action items, important quotes
      
      CRITICAL RULES:
      - The transcript, title, and summary MUST be in the Target Language: ${language}
      - For songs: DO NOT fabricate artist/song names - use "Unknown" if not confident
      - Accuracy over completeness - it's better to say "Unknown" than to guess incorrectly
      - Return ONLY valid JSON format
    `;

    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await client.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            classification: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            artistInfo: { 
              type: Type.STRING,
              description: "Artist name and song title (format: 'Artist - Song'), or 'Unknown - Unknown' if not identifiable. Only for music/songs."
            },
            summary: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["transcript", "summary", "classification", "suggestedTitle"]
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Parse error:", response.text);
      throw new Error("Could not parse AI response. Try a clearer audio clip.");
    }
  }

  async translateSummary(summary: string[], targetLanguage: Language): Promise<string[]> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Translate these summary points into ${targetLanguage}. Use Traditional characters for Cantonese and Simplified for Mandarin. Return JSON.`;
    
    const response = await client.models.generateContent({
      model,
      contents: `${prompt}\n\nPoints:\n${JSON.stringify(summary)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    return JSON.parse(response.text).translatedPoints || summary;
  }

  async analyzeGroup(items: any[], language: Language): Promise<GroupSummary> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const context = items.map(i => `Title: ${i.suggestedTitle}\nSummary: ${i.summary.join('. ')}`).join('\n\n');
    
    const prompt = `Synthesize these summaries into a group report in ${language}. Include collective bullet points and a breakdown of topics.`;

    const response = await client.models.generateContent({
      model,
      contents: `Context:\n${context}\n\nTask:\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            collectiveSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
            dataBreakdown: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { label: { type: Type.STRING }, count: { type: Type.NUMBER } } 
              } 
            },
            overallThemes: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }

  async summarizeLink(url: string, language: Language): Promise<any> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Find information about this link: ${url}. Summarize it in ${language} with a title and category. Use Google Search to verify details.`;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING, description: "Detailed description or transcript found" },
            classification: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            summary: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }

  async connectLive(
    language: Language,
    onTranscriptionUpdate: (transcript: string) => void,
    onFinalSummary: (data: any) => void,
    onError: (error: any) => void
  ) {
    let fullTranscript = "";
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    return client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log("Live mode active"),
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            fullTranscript += message.serverContent.inputTranscription.text;
            onTranscriptionUpdate(fullTranscript);
          }
        },
        onerror: (e: any) => onError(e),
        onclose: () => {
          if (fullTranscript.trim()) {
            this.summarizeText(fullTranscript, language).then(onFinalSummary).catch(onError);
          } else {
            onError(new Error("No voice detected."));
          }
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: `Transcribe accurately into ${language}. For Cantonese use Traditional Chinese. For Japanese use Hiragana/Katakana/Kanji. For German use proper German orthography.`
      }
    });
  }

  async summarizeText(text: string, language: Language): Promise<any> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    
    const prompt = `
      Analyze this transcribed text and provide a structured summary in ${language}.
      
      Instructions:
      1. Classify the content type: "Music/Song", "Meeting", "Lecture", "Interview", "Podcast", "Memo/Voice Note", "Presentation", "Conversation", or "Other"
      2. If this is a Music/Song:
         - Only identify artist/song if HIGHLY CONFIDENT
         - Use format "Artist - Song Title" or "Unknown - Unknown" if uncertain
         - DO NOT guess - accuracy is critical
      3. Create a descriptive title in ${language}
      4. Provide 5-7 bullet point summary
      
      Transcribed text:
      ${text}
    `;
    
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            artistInfo: { type: Type.STRING },
            summary: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return { ...JSON.parse(response.text), transcript: text };
  }
}

export const gemini = new GeminiService();
