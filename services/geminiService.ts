import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useAppStore } from "../store.ts";

// Interface used by the app to structure prompts (Text + Images)
export interface Part {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

// Initialize Gemini API Client
// A chave deve vir da variável de ambiente da Vercel (process.env.API_KEY)
// Assumes process.env is polyfilled or replaced during build/deployment on Vercel.
const apiKey = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || 'MISSING_API_KEY' });

/**
 * Service to interact with Google Gemini API.
 * Supports switching between "Flash" (Fast) and "Thinking" (Advanced) modes using gemini-2.5-flash.
 */
export const callGenerativeAI = async (prompt: string | Part[]): Promise<string> => {
    try {
        // Access store directly to check current mode
        const { isThinkingModeEnabled } = useAppStore.getState();

        // Use gemini-2.5-flash for both modes as it supports the Thinking Config.
        const modelId = 'gemini-2.5-flash';

        let contents: any;
        
        // Adapt prompt structure for the SDK
        if (typeof prompt === 'string') {
            contents = prompt;
        } else if (Array.isArray(prompt)) {
            // Check if parts contain images
            const parts = prompt.map(p => {
                if (p.inlineData) {
                    return {
                        inlineData: {
                            mimeType: p.inlineData.mimeType,
                            data: p.inlineData.data
                        }
                    };
                }
                return { text: p.text };
            });
            contents = { parts };
        }

        const config: any = {
            systemInstruction: "Você é um assistente especializado em educação, focado na criação de Planos Educacionais Individualizados (PEI). Suas respostas devem ser profissionais, bem estruturadas e direcionadas para auxiliar educadores. Sempre que apropriado, considere e sugira estratégias baseadas nos princípios do Desenho Universal para a Aprendizagem (DUA).",
        };

        // Configure Thinking Mode
        if (isThinkingModeEnabled) {
            // Advanced Mode: Enable thinking with a token budget.
            // 8192 is a balanced budget for reasoning without extreme latency.
            config.thinkingConfig = { thinkingBudget: 8192 }; 
        } else {
            // Fast Mode: Explicitly disable thinking to ensure speed.
            config.thinkingConfig = { thinkingBudget: 0 };
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelId,
            contents: contents,
            config: config
        });

        const text = response.text;
        if (!text) {
            throw new Error("A IA retornou uma resposta vazia.");
        }
        return text.trim();

    } catch (error) {
        console.error("Gemini Service Error:", error);
        
        let errorMessage = "Ocorreu um erro na comunicação com a IA.";
        
        if (error instanceof Error) {
            // Handle common error cases
            if (error.message.includes("API key")) {
                errorMessage = "Chave de API inválida ou não configurada.";
            } else if (error.message.includes("429")) {
                errorMessage = "Limite de requisições excedido. Tente novamente em alguns instantes.";
            } else if (error.message.includes("503")) {
                errorMessage = "O serviço de IA está temporariamente indisponível.";
            } else {
                errorMessage = `Erro: ${error.message}`;
            }
        }
        
        throw new Error(errorMessage);
    }
};