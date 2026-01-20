
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIAnalysis, Category, PlagiarismMatch } from "../types.ts";

// The API key is obtained exclusively from process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const synthesizeNarrativeFlow = async (title: string, content: string): Promise<{
  polishedContent: string;
  category: Category;
}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze and polish this article: "${title}". Content: ${content}. Fix grammar, professional tone, and strictly categorize into one of: Engineering, Design, Culture, Business, Product.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          polishedContent: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["polishedContent", "category"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return {
    polishedContent: data.polishedContent || content,
    category: (data.category as Category) || 'Engineering'
  };
};

export const performPlagiarismAudit = async (title: string, content: string): Promise<{
  plagiarismScore: number;
  matches: PlagiarismMatch[];
}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Verify the semantic originality of this manuscript across the global web: "${title}". Body: ${content}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plagiarismScore: { type: Type.NUMBER, description: "0-100 score where 100 is highly similar" },
          matches: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                url: { type: Type.STRING }, 
                title: { type: Type.STRING }, 
                similarity: { type: Type.NUMBER }, 
                matchedText: { type: Type.STRING } 
              }, 
              required: ["url", "title", "similarity", "matchedText"] 
            } 
          }
        },
        required: ["plagiarismScore", "matches"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return { 
    plagiarismScore: data.plagiarismScore || 0, 
    matches: data.matches || [] 
  };
};

export const expandToProArticle = async (title: string, content: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Transform this article draft into a high-standard professional manuscript with sophisticated insights and structure. Title: ${title}. Draft: ${content}`,
  });
  return response.text || content;
};

export const analyzePost = async (content: string): Promise<AIAnalysis> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Perform SEO and readability analysis for: ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          seoKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          tone: { type: Type.STRING },
          readabilityScore: { type: Type.NUMBER }
        },
        required: ["summary", "seoKeywords", "tone", "readabilityScore"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const getInstantDefinition = async (word: string, context: string = ""): Promise<{ 
  definition: string; 
  partOfSpeech: string; 
  usage: string; 
  pronunciation?: string; 
  synonyms?: string[] 
}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide a detailed linguistic definition for "${word}" in the following context: "${context}".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          usage: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["definition", "partOfSpeech", "usage"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName } 
        } 
      },
    },
  });
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("Narrative speech synthesis timed out.");
  return data;
};
