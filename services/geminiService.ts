
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { Language, GroupSummary } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async summarizeAudioFile(base64Audio: string, mimeType: string, language: Language): Promise<any> {
    // Using Pro for higher reasoning and better dialect support
    const model = 'gemini-3-pro-preview';
    const prompt = `
      You are a world-class audio transcription and analysis expert.
      Task:
      1. Transcribe the audio accurately. 
         - If language is Cantonese, use Traditional Chinese characters and capture HK/Cantonese idioms.
         - If language is Chinese (Mandarin), use Simplified Chinese characters.
         - If language is English, use standard English.
      2. Identify the type of audio (e.g., Technical Meeting, Casual Interview, Voice Memo, Educational Lecture).
      3. Create a professional, descriptive title (max 6 words).
      4. Provide a structured summary in concise bullet points.
      5. Ensure all output (transcript, title, summary) matches the target language: ${language}.
      
      Return the result in JSON format only.
    `;

    // Create a fresh instance to ensure latest API key usage
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
      throw new Error("Failed to parse AI response. The audio might be too short or unclear.");
    }
  }

  async translateSummary(summary: string[], targetLanguage: Language): Promise<string[]> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Translate the following bullet points into ${targetLanguage}. 
    Ensure cultural nuances are preserved (e.g., Traditional characters for Cantonese, Simplified for Mandarin).
    Maintain the bullet point structure exactly.\n\nPoints:\n${summary.join('\n')}`;
    
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["translatedPoints"]
        }
      }
    });
    
    try {
      const data = JSON.parse(response.text);
      return data.translatedPoints;
    } catch (e) {
      return summary; 
    }
  }

  async analyzeGroup(items: any[], language: Language): Promise<GroupSummary> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    const context = items.map(i => `Title: ${i.customName || i.suggestedTitle}\nType: ${i.classification}\nSummary: ${i.summary.join(', ')}`).join('\n\n');
    
    const prompt = `
      Analyze these multiple audio transcript summaries in a workspace group.
      1. Provide a collective executive summary of the common themes and decisions (bullet points).
      2. Categorize the files by their classification type for a dashboard view.
      3. Write a 2-sentence synthesis of the overall workspace theme.
      Respond in ${language}.
    `;

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

    try {
      return JSON.parse(response.text);
    } catch (e) {
      throw new Error("Group analysis failed.");
    }
  }

  async summarizeLink(url: string, language: Language): Promise<any> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    const prompt = `
      Browse the following link: ${url}.
      Determine if it is an audio file, video, or article.
      1. Use Google Search to find transcripts or content descriptions if it's a media page.
      2. Summarize the core message in ${language}.
      3. Classify the content and suggest a title.
      Return JSON.
    `;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
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
    const sessionPromise = client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log("Live transcription active"),
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
            onError(new Error("No audio detected during live session."));
          }
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: `You are a real-time transcriber. Output text accurately in ${language}. For Cantonese, use traditional characters. For Chinese Mandarin, use simplified.`
      }
    });
    return sessionPromise;
  }

  async summarizeText(text: string, language: Language): Promise<any> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const response = await client.models.generateContent({
      model,
      contents: `Perform high-quality summarization on this text in ${language}. Include classification and a title. Text: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            summary: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return { ...JSON.parse(response.text), transcript: text };
  }
}

export const gemini = new GeminiService();
