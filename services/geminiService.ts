// FIX: Create the geminiService.ts file to provide Gemini API functionality to the application components.
// This resolves multiple "File ... is not a module" errors.
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

/**
 * Initialize the Google Gemini AI client.
 * The API key is sourced from environment variables, as per the project's requirements.
 */
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Types for image generation.
 */
export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

/**
 * Generates an image based on a text prompt and desired aspect ratio.
 * @param prompt - The text prompt describing the image.
 * @param aspectRatio - The desired aspect ratio for the image.
 * @returns A promise that resolves to a data URL (base64) of the generated image.
 */
export const generateImage = async (prompt: string, aspectRatio: ImageAspectRatio): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio,
        },
    });

    if (!response.generatedImages?.[0]?.image?.imageBytes) {
        throw new Error("Image generation failed to return image data.");
    }

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

/**
 * Types for video generation.
 */
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export interface VideoImageInput {
  imageBytes: string; // base64 encoded string
  mimeType: string;
}

/**
 * Generates a video based on a text prompt, with optional polling progress callbacks and an initial image.
 * @param prompt - The text prompt describing the video.
 * @param aspectRatio - The desired aspect ratio (Note: This is for type compatibility, currently unused by the Veo API).
 * @param onProgress - An optional callback function to be called during polling.
 * @param image - An optional initial image to influence the video generation.
 * @returns A promise that resolves to an object URL for the generated video.
 */
export const generateVideo = async (
    prompt: string,
    aspectRatio: VideoAspectRatio,
    onProgress?: () => void,
    image?: VideoImageInput
): Promise<string> => {
    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt,
        image: image ? { imageBytes: image.imageBytes, mimeType: image.mimeType } : undefined,
        config: {
            numberOfVideos: 1,
        }
    });

    // Poll the operation status until it's done.
    while (!operation.done) {
        if (onProgress) {
            onProgress();
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
        throw new Error("Video generation failed or returned no URI.");
    }
    
    const downloadLink = operation.response.generatedVideos[0].video.uri;
    // Append the API key to download the video file.
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY!}`);
    
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};

/**
 * Type for image editing input.
 */
interface ImageInput {
  data: string; // base64 string
  mimeType: string;
}

/**
 * Edits an existing image based on a text prompt.
 * @param prompt - The text prompt describing the desired edits.
 * @param image - The base image to be edited.
 * @returns A promise that resolves to an object containing the edited image URL and any accompanying text.
 */
export const editImage = async (prompt: string, image: ImageInput): Promise<{ imageUrl: string; text: string | null }> => {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: image.data, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    let imageUrl: string | null = null;
    let text: string | null = null;
    
    if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("Invalid response from image editing model.");
    }

    // The response can contain both image and text parts.
    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
            text = part.text;
        } else if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }

    if (!imageUrl) {
        throw new Error("Image editing did not return an image. The model may have only provided a text response.");
    }

    return { imageUrl, text };
};

/**
 * Type for story generation options.
 */
type StoryOption = {
  genre: string;
  audience: string;
  tone: string;
  length: string;
};

/**
 * Generates a story in a streaming fashion based on a prompt and creative options.
 * @param prompt - The initial idea or prompt for the story.
 * @param options - Creative constraints like genre, tone, and length.
 * @returns An async generator that yields story text chunks.
 */
export async function* generateStoryStream(prompt: string, options: StoryOption): AsyncGenerator<string> {
    const systemInstruction = `You are a creative storyteller. Write a ${options.length} story for ${options.audience}. The genre is ${options.genre} and the tone should be ${options.tone}.`;
    
    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
        },
    });

    for await (const chunk of stream) {
        yield chunk.text;
    }
}
