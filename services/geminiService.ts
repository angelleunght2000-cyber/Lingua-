
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { Language, GroupSummary } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async summarizeAudioFile(base64Audio: string, mimeType: string, language: Language): Promise<any> {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      You are an expert audio analyst.
      1. Transcribe the audio in its original language (${language}).
      2. Identify the type of audio (e.g., Business Meeting, Interview, Personal Note, Lecture).
      3. Create a catchy, short title (3-5 words) for this audio.
      4. Provide a summary of the transcription in concise bullet points.
      5. Use the same language for the summary and title as the source audio.
      Return the result in JSON format.
    `;

    const response = await this.ai.models.generateContent({
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
      throw new Error("Invalid response format from AI service.");
    }
  }

  async translateSummary(summary: string[], targetLanguage: Language): Promise<string[]> {
    const model = 'gemini-3-flash-preview';
    const prompt = `Translate the following bullet points into ${targetLanguage}. Maintain the bullet point structure.\n\nPoints:\n${summary.join('\n')}`;
    
    const response = await this.ai.models.generateContent({
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
      return JSON.parse(response.text).translatedPoints;
    } catch (e) {
      return summary; // Fallback
    }
  }

  async analyzeGroup(items: any[], language: Language): Promise<GroupSummary> {
    const model = 'gemini-3-flash-preview';
    const context = items.map(i => `Title: ${i.customName || i.suggestedTitle}\nType: ${i.classification}\nSummary: ${i.summary.join(', ')}`).join('\n\n');
    
    const prompt = `
      Analyze these summaries from a group and provide:
      1. A collective executive summary (bullet points).
      2. A count of audio types for data visualization.
      3. A short overview of the primary themes.
      Language: ${language}.
    `;

    const response = await this.ai.models.generateContent({
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
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Analyze link: ${url}.
      1. Use Google Search to find content.
      2. Identify type and create title in ${language}.
      3. Provide concise summary.
      Return JSON.
    `;

    const response = await this.ai.models.generateContent({
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
    const sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log("Live connection opened"),
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            fullTranscript += message.serverContent.inputTranscription.text;
            onTranscriptionUpdate(fullTranscript);
          }
        },
        onerror: (e: any) => onError(e),
        onclose: () => {
          this.summarizeText(fullTranscript, language).then(onFinalSummary).catch(onError);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: `Transcribe audio in ${language}.`
      }
    });
    return sessionPromise;
  }

  async summarizeText(text: string, language: Language): Promise<any> {
    const model = 'gemini-3-flash-preview';
    const response = await this.ai.models.generateContent({
      model,
      contents: `Summarize this text in ${language} with classification and title: ${text}`,
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
