export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

// Convert our message format to OpenAI format
const convertToOpenAIFormat = (messages: ChatMessage[]): OpenAIMessage[] => {
  const systemMessage: OpenAIMessage = {
    role: 'system',
    content: 'You are a helpful AI assistant for students in a Learning Management System. You can help with academic questions, study tips, project guidance, and general educational support. Be friendly, encouraging, and provide practical advice.'
  };

  const chatMessages: OpenAIMessage[] = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.text
  }));

  return [systemMessage, ...chatMessages];
};

// Convert our message format to Gemini format
const convertToGeminiFormat = (messages: ChatMessage[]): GeminiMessage[] => {
  // Gemini doesn't use system messages in the same way, so we'll include instructions in the first user message
  const systemInstruction = "You are a helpful AI assistant for students in a Learning Management System. You can help with academic questions, study tips, project guidance, and general educational support. Be friendly, encouraging, and provide practical advice.";
  
  const geminiMessages: GeminiMessage[] = [];
  
  // Add system instruction to the first user message if there are messages
  let firstUserMessage = true;
  
  messages.forEach(msg => {
    if (msg.isUser) {
      const content = firstUserMessage 
        ? `${systemInstruction}\n\nUser: ${msg.text}`
        : msg.text;
      
      geminiMessages.push({
        role: 'user',
        parts: [{ text: content }]
      });
      
      firstUserMessage = false;
    } else {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: msg.text }]
      });
    }
  });
  
  return geminiMessages;
};

export const getAIResponse = async (messages: ChatMessage[]): Promise<string> => {
  try {
    // Get API key from environment variables - prioritize Gemini, then Groq, then OpenAI
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // Determine which API to use
    if (geminiKey) {
      return await getGeminiResponse(messages, geminiKey);
    } else if (groqKey) {
      return await getGroqResponse(messages, groqKey);
    } else if (openaiKey) {
      return await getOpenAIResponse(messages, openaiKey);
    } else {
      throw new Error('No API key found. Please set VITE_GEMINI_API_KEY, VITE_GROQ_API_KEY, or VITE_OPENAI_API_KEY in your environment variables.');
    }
  } catch (error) {
    console.error('AI Response Error:', error);
    
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    
    return 'Error: Could not fetch response. Please try again later.';
  }
};

// Gemini API implementation
const getGeminiResponse = async (messages: ChatMessage[], apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const geminiMessages = convertToGeminiFormat(messages);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data: GeminiResponse = await response.json();
  
  if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0]) {
    throw new Error('No response received from Gemini API');
  }

  return data.candidates[0].content.parts[0].text.trim();
};

// Groq API implementation
const getGroqResponse = async (messages: ChatMessage[], apiKey: string): Promise<string> => {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.3-70b-versatile';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: convertToOpenAIFormat(messages),
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data: OpenAIResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response received from Groq API');
  }

  return data.choices[0].message.content.trim();
};

// OpenAI API implementation
const getOpenAIResponse = async (messages: ChatMessage[], apiKey: string): Promise<string> => {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const model = 'gpt-3.5-turbo';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: convertToOpenAIFormat(messages),
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data: OpenAIResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response received from OpenAI API');
  }

  return data.choices[0].message.content.trim();
};

// Session storage functions for AI chat
const AI_CHAT_STORAGE_KEY = 'ai_chat_messages';

export const saveMessagesToStorage = (messages: ChatMessage[]): void => {
  try {
    sessionStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to storage:', error);
  }
};

export const loadMessagesFromStorage = (): ChatMessage[] => {
  try {
    const stored = sessionStorage.getItem(AI_CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.error('Failed to load messages from storage:', error);
  }
  
  // Return initial welcome message if no stored messages
  return [{
    id: '1',
    text: 'Hello! I\'m your AI study assistant. I can help you with academic questions, study tips, project guidance, and more. What would you like to know?',
    isUser: false,
    timestamp: new Date(),
  }];
};

export const clearChatHistory = (): void => {
  try {
    sessionStorage.removeItem(AI_CHAT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
};
