import { QuizData, ContentBlock, ContentType } from '../types';

export interface CourseResource {
  type: ContentType;
  url: string;
  fileName?: string;
  fileData?: string; // base64 encoded file data
  isFile?: boolean;
}

export const generateQuiz = async (contentBlocks: ContentBlock[]): Promise<QuizData> => {
  const response = await fetch('/api/gemini/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content: contentBlocks })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate quiz. Please ensure the topic has valid content.');
  }
  
  const data = await response.json();
  return data as QuizData;
};

export const getChatbotResponse = async (prompt: string, useThinkingMode: boolean, systemInstruction?: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: prompt,
        useThinkingMode,
        systemInstruction
      })
    });

    if (!response.ok) throw new Error('Failed to get response');
    
    const data = await response.json();
    return data.response || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error getting chatbot response from Gemini API:", error);
    return "I'm sorry, I encountered an error. Please try again.";
  }
};

export const analyzeVideoContent = async (videoTitle: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/analyze-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoTitle })
    });

    if (!response.ok) throw new Error('Failed to analyze video');
    
    const data = await response.json();
    return data.analysis || "Could not analyze video.";
  } catch (error) {
    console.error("Error analyzing video content via Gemini API:", error);
    return `This video "${videoTitle}" covers important training content. Key points typically include best practices, step-by-step procedures, and practical examples relevant to the topic.`;
  }
};

export const askQuestionAboutTopic = async (contentBlocks: ContentBlock[], question: string): Promise<string> => {
  const response = await fetch('/api/gemini/ask-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      content: contentBlocks,
      question
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get answer. Please ensure the topic has valid content.');
  }
  
  const data = await response.json();
  return data.answer || "I could not generate an answer.";
};

export const generateCourseFromPrompt = async (prompt: string, resources: CourseResource[] = []): Promise<{
  title: string;
  category: string;
  readTime: number;
  content: ContentBlock[];
  coverImageKeyword?: string;
}> => {
  try {
    const response = await fetch('/api/gemini/generate-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt, resources })
    });

    if (!response.ok) throw new Error('Failed to generate course');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating course from prompt:", error);
    return {
      title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      category: 'General',
      readTime: 10,
      content: [
        {
          type: ContentType.Paragraph,
          content: `This course covers ${prompt}. The content includes comprehensive information about the topic with best practices and guidelines.`,
          order: 1
        },
        {
          type: ContentType.Paragraph,
          content: 'Key learning objectives and practical applications will be covered throughout this training material.',
          order: 2
        }
      ]
    };
  }
};
