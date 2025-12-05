import { QuizData, ContentBlock, ContentType } from '../types';

export interface CourseResource {
  type: ContentType;
  url: string;
}

export const generateQuiz = async (contentBlocks: ContentBlock[]): Promise<QuizData> => {
  try {
    const response = await fetch('/api/gemini/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contentBlocks })
    });

    if (!response.ok) throw new Error('Failed to generate quiz');
    
    const data = await response.json();
    return data as QuizData;
  } catch (error) {
    console.error("Error generating quiz via Gemini API:", error);
    return [
      {
        question: "What is the main purpose of this training material?",
        options: ["To inform and educate", "To entertain", "To confuse", "To delay"],
        correctAnswerIndex: 0
      },
      {
        question: "According to the content, what should be prioritized?",
        options: ["Speed", "Quality and safety", "Cost reduction", "All of the above"],
        correctAnswerIndex: 1
      },
      {
        question: "What best describes the key takeaway?",
        options: ["Continuous improvement", "Maintaining status quo", "Reducing effort", "Ignoring feedback"],
        correctAnswerIndex: 0
      }
    ];
  }
};

export const getChatbotResponse = async (prompt: string, useThinkingMode: boolean, systemInstruction?: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  try {
    const response = await fetch('/api/gemini/ask-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: contentBlocks,
        question
      })
    });

    if (!response.ok) throw new Error('Failed to get answer');
    
    const data = await response.json();
    return data.answer || "I could not generate an answer.";
  } catch (error) {
    console.error("Error asking question about topic:", error);
    return "Sorry, I encountered an error while processing your question. Please try again.";
  }
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
