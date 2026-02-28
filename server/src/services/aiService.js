import OpenAI from 'openai';
import { config } from '../config/index.js';
import { aiCircuitBreaker } from '../utils/circuitBreaker.js';

const openai = new OpenAI({
    apiKey: config.openaiApiKey || 'sk-dummy-key-for-ui-only',
});

/**
 * AI Classification with Circuit Breaker and Fallback.
 */
export const classifyEventAI = async (content, category) => {
    return await aiCircuitBreaker.call(
        async () => {
            if (!config.openaiApiKey) {
                // If no API key, we simulate a small latency and return a default based on keywords
                await new Promise(r => setTimeout(r, 500));
                return heuristicFallback(content, category, { reason: 'No OpenAI Key provided' });
            }

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are a notification prioritization engine. 
                        Classify the following message as NOW, LATER, or NEVER.
                        NOW: Urgent alerts, security events, emergency info.
                        LATER: Newsletters, status updates, non-urgent social.
                        NEVER: Spam, marketing noise, exact/near duplicates.
                        Return ONLY the classification and a confidence score (0-1).
                        Format: JSON { "classification": "...", "confidence": 0.xx }`
                    },
                    { role: "user", content: `Category: ${category}. Content: ${content}` }
                ],
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.choices[0].message.content);
            return {
                classification: result.classification,
                confidence: result.confidence,
                model: 'gpt-3.5-turbo',
                latency: response.usage?.total_tokens // Mocking latency for now
            };
        },
        () => heuristicFallback(content, category, { reason: 'Circuit Breaker Open' })
    );
};

function heuristicFallback(content, category, meta = {}) {
    // Simple regex or keyword fallback logic
    let classification = 'LATER';
    if (/urgent|security|critical|emergency|alert/i.test(content)) classification = 'NOW';
    if (/unsubscribe|newsletter|ad|marketing/i.test(content)) classification = 'NEVER';

    return {
        classification,
        confidence: 0.5,
        model: 'heuristic-fallback',
        fallback: true,
        meta
    };
}
