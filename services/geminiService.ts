
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
      You are an expert multilingual transcriber.
      Task:
      1. Transcribe the audio content accurately.
         - If Target Language is Cantonese: Use Traditional Chinese characters and HK idioms.
         - If Target Language is Mandarin/Chinese: Use Simplified Chinese characters.
         - If Target Language is English: Use standard English.
      2. Classification: Categorize the audio (e.g. Meeting, Memo, Interview).
      3. Title: Create a short descriptive title.
      4. Summary: Provide 5-7 clear bullet points of the key takeaways.
      
      IMPORTANT: The transcript, title, and summary MUST all be in the specified Target Language: ${language}.
      Return the result in JSON format only.
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
        systemInstruction: `Transcribe accurately into ${language}. Use Traditional Chinese for Cantonese.`
      }
    });
  }

  async summarizeText(text: string, language: Language): Promise<any> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const response = await client.models.generateContent({
      model,
      contents: `Summarize this transcribed text into ${language}: ${text}`,
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
