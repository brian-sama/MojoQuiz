import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Question Extractor AI Service
 * Uses Gemini to extract questions from text
 */
export const aiService = {
    async generateQuestions(sourceText: string, sessionMode: string) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured on the server');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
      You are an expert quiz and engagement designer. I will provide you with a source text, and you will generate a list of questions to engage an audience.
      
      Target Session Mode: ${sessionMode.toUpperCase()}
      
      Requirements:
      1. If mode is "QUIZ", generate only Multiple Choice (4 options, 1 correct) and True/False questions.
      2. If mode is "ENGAGEMENT", generate Polls (multiple options), Word Cloud topics, and Scale questions.
      3. For each question, provide:
         - question_type: (poll, word_cloud, scale, quiz_mc, quiz_tf)
         - question_text: The question or topic string.
         - options: (string[] or null)
         - correct_answer: (index of correct option for quiz_mc, 0 for True / 1 for False for quiz_tf, or null)
         - time_limit: (30 by default, 60 for complex ones, null if not applicable)

      Source Text:
      """
      ${sourceText}
      """

      Return ONLY a valid JSON array of objects representing the questions. No other text.
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up text if AI included markdown blocks
            const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanedJson);
        } catch (error) {
            console.error('AI Question Generation Error:', error);
            throw new Error('Failed to generate questions from the provided text.');
        }
    },

    async getTriviaFact() {
        if (!process.env.GEMINI_API_KEY) {
            return "Young people are the leaders of today and tomorrow. Stay engaged!";
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            Generate a short, one-sentence interesting fact or engagement tip for young people.
            The topic should fall into one of these categories:
            1. Youth Engagement / Participation
            2. Mental Health awareness
            3. Sexual and Reproductive Health and Rights (SRHR)
            4. Leadership and Community Impact

            Requirements:
            - Content must be positive, educational, and empowering.
            - Keep it under 25 words.
            - Avoid sensitive/explicit clinical details; keep it high-level and relatable.
            - Return ONLY the text of the fact. No other formatting.
            - Do NOT include any emojis.
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('AI Trivia Error:', error);
            return "Community engagement helps youth build confidence and develop valuable leadership skills.";
        }
    }
};
