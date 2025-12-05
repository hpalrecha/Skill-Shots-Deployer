import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { loginSchema, registerSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface ContentBlock {
  type: string;
  content: string;
  title?: string;
  order?: number;
}

function buildMultimodalParts(blocks: ContentBlock[]): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  
  blocks.forEach(block => {
    if (!block.content) return;
    
    if (block.type === 'paragraph') {
      parts.push({ text: block.content });
    } else if ((block.type === 'image' || block.type === 'document') && block.content.startsWith('data:')) {
      try {
        const [header, base64Data] = block.content.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        if (base64Data && mimeType) {
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
          if (block.title) {
            parts.push({ text: `[${block.type === 'image' ? 'Image' : 'Document'}: ${block.title}]` });
          }
        }
      } catch (e) {
        console.warn("Failed to parse data URL for AI context", e);
      }
    } else if (block.type === 'video') {
      parts.push({ text: `[Video: ${block.title || 'Untitled'} - URL: ${block.content}]` });
    } else {
      parts.push({ text: `[Resource: ${block.title || block.content}]` });
    }
  });
  
  return parts;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/gemini/generate-quiz", async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || !Array.isArray(content)) {
        return res.status(400).json({ error: "Content blocks are required" });
      }

      const hasMedia = content.some((b: ContentBlock) => 
        (b.type === 'image' || b.type === 'document') && b.content?.startsWith('data:')
      );
      
      const textLength = content
        .filter((b: ContentBlock) => b.type === 'paragraph')
        .reduce((acc: number, b: ContentBlock) => acc + (b.content?.length || 0), 0);
      
      const questionCount = hasMedia ? 5 : Math.max(3, Math.min(10, Math.ceil(textLength / 500)));

      const systemPrompt = `You are an expert tutor. Based on the provided content (which may include text, images, or PDF documents), generate a ${questionCount}-question multiple-choice quiz.
- If a PDF or Image is provided, READ IT thoroughly and ask questions about its specific details.
- Ensure questions cover the breadth of the material.
- Each question must have exactly 4 options.
- Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0
  }
]`;

      const parts = buildMultimodalParts(content);
      
      if (parts.length === 0) {
        return res.status(400).json({ error: "No valid content found" });
      }

      parts.unshift({ text: systemPrompt });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
      });

      const responseText = response.text || "[]";
      
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in response");
      }

      const quizData = JSON.parse(jsonMatch[0]);
      res.json(quizData);
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
  });

  app.post("/api/gemini/chatbot", async (req, res) => {
    try {
      const { message, useThinkingMode, systemInstruction } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";

      const prompt = systemInstruction 
        ? `${systemInstruction}\n\nUser: ${message}`
        : message;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      res.json({ response: response.text || "I'm sorry, I couldn't generate a response." });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({ error: error.message || "Failed to get chatbot response" });
    }
  });

  app.post("/api/gemini/analyze-video", async (req, res) => {
    try {
      const { videoTitle, videoUrl } = req.body;
      
      if (!videoTitle && !videoUrl) {
        return res.status(400).json({ error: "Video title or URL is required" });
      }

      const prompt = `You are analyzing a training video titled "${videoTitle || 'Training Video'}".

Based on the title and common content patterns for such training materials, provide a helpful educational summary covering:

1. **Main Learning Objectives**: What learners should expect to understand after watching
2. **Key Concepts**: Important topics typically covered in this type of training
3. **Practical Takeaways**: Actionable skills or knowledge the viewer would gain
4. **Related Topics**: What other training materials might complement this content

Note: This analysis is based on the video title and typical content patterns. For detailed content analysis, please ensure the video content is directly accessible.

Format your response in a clear, educational manner suitable for a corporate learning management system.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text || "Unable to analyze video." });
    } catch (error: any) {
      console.error("Video analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze video" });
    }
  });

  app.post("/api/gemini/ask-question", async (req, res) => {
    try {
      const { content, question } = req.body;
      
      if (!content || !question) {
        return res.status(400).json({ error: "Content and question are required" });
      }

      const parts = buildMultimodalParts(content);
      
      if (parts.length === 0) {
        return res.status(400).json({ error: "No valid content found" });
      }

      const systemPrompt = `You are a helpful AI tutor for a learning platform. The user is asking a question about the following course content. Answer their question clearly and accurately based on the provided materials (which may include text, images, and PDF documents).

If the content includes images or documents, analyze them carefully to answer the question.

USER QUESTION: ${question}

Provide a helpful, educational answer. If the question cannot be fully answered from the content, acknowledge this and provide relevant general information where appropriate.`;

      parts.unshift({ text: systemPrompt });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
      });

      res.json({ answer: response.text || "I couldn't find an answer to your question." });
    } catch (error: any) {
      console.error("Ask question error:", error);
      res.status(500).json({ error: error.message || "Failed to answer question" });
    }
  });

  app.post("/api/gemini/generate-course", async (req, res) => {
    try {
      const { prompt, resources } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      let resourceInfo = "";
      if (resources && resources.length > 0) {
        resourceInfo = "\n\nResources provided:\n" + resources.map((r: any) => `- ${r.type}: ${r.url}`).join('\n');
      }

      const genPrompt = `You are a course content creator for a corporate learning platform. Generate a comprehensive training course based on this request:

TOPIC/REQUEST:
${prompt}
${resourceInfo}

Generate a complete course with the following JSON structure:
{
  "title": "Course Title",
  "category": "Category Name (choose from: Safety, Compliance, Technical, Onboarding, Leadership, Sales)",
  "readTime": 10,
  "coverImageKeyword": "relevant keyword for stock image",
  "content": [
    {
      "type": "paragraph",
      "content": "Introduction paragraph...",
      "order": 1
    },
    {
      "type": "paragraph", 
      "content": "More content...",
      "order": 2
    }
  ]
}

Requirements:
- Create 5-8 content blocks (paragraphs)
- Each paragraph should be 100-200 words
- Make content professional and educational
- Include practical tips and best practices
- Output ONLY valid JSON, no other text`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: genPrompt,
      });

      const responseText = response.text || "{}";
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const courseData = JSON.parse(jsonMatch[0]);
      res.json(courseData);
    } catch (error: any) {
      console.error("Course generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate course" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }

      const { name, email, password, role } = parseResult.data;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      const user = await storage.createUser({
        name,
        email,
        password,
        role: role || "Learner",
        groupIds: [],
      });

      req.session.userId = user.id;
      
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        groupIds: user.groupIds,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: error.message || "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
      }

      const { email, password } = parseResult.data;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await storage.comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        groupIds: user.groupIds,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        groupIds: user.groupIds,
      });
    } catch (error: any) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: error.message || "Failed to check auth" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        groupIds: u.groupIds,
      })));
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error: any) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: error.message || "Failed to get groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const group = await storage.createGroup({ name });
      res.status(201).json(group);
    } catch (error: any) {
      console.error("Create group error:", error);
      res.status(500).json({ error: error.message || "Failed to create group" });
    }
  });

  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getAllTopics();
      res.json(topics);
    } catch (error: any) {
      console.error("Get topics error:", error);
      res.status(500).json({ error: error.message || "Failed to get topics" });
    }
  });

  app.get("/api/topics/:id", async (req, res) => {
    try {
      const topic = await storage.getTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(topic);
    } catch (error: any) {
      console.error("Get topic error:", error);
      res.status(500).json({ error: error.message || "Failed to get topic" });
    }
  });

  app.post("/api/topics", async (req, res) => {
    try {
      const topic = await storage.createTopic(req.body);
      res.status(201).json(topic);
    } catch (error: any) {
      console.error("Create topic error:", error);
      res.status(500).json({ error: error.message || "Failed to create topic" });
    }
  });

  app.put("/api/topics/:id", async (req, res) => {
    try {
      const topic = await storage.updateTopic(req.params.id, req.body);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(topic);
    } catch (error: any) {
      console.error("Update topic error:", error);
      res.status(500).json({ error: error.message || "Failed to update topic" });
    }
  });

  app.delete("/api/topics/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTopic(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json({ message: "Topic deleted" });
    } catch (error: any) {
      console.error("Delete topic error:", error);
      res.status(500).json({ error: error.message || "Failed to delete topic" });
    }
  });

  app.get("/api/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.getUserProgressAll(req.params.userId);
      res.json(progress);
    } catch (error: any) {
      console.error("Get progress error:", error);
      res.status(500).json({ error: error.message || "Failed to get progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const { userId, topicId, status, quizScore, quizTotal } = req.body;
      if (!userId || !topicId) {
        return res.status(400).json({ error: "userId and topicId are required" });
      }
      const progress = await storage.createOrUpdateProgress({
        userId,
        topicId,
        status: status || "Pending",
        quizScore,
        quizTotal,
      });
      
      if (status === "Completed" && quizScore) {
        await storage.updateLeaderboardPoints(userId, quizScore * 10);
      }
      
      res.json(progress);
    } catch (error: any) {
      console.error("Update progress error:", error);
      res.status(500).json({ error: error.message || "Failed to update progress" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      
      const usersMap = new Map<string, { name: string }>();
      const allUsers = await storage.getAllUsers();
      allUsers.forEach(u => usersMap.set(u.id, { name: u.name }));
      
      const result = leaderboard.map((entry, index) => ({
        userId: entry.userId,
        name: usersMap.get(entry.userId)?.name || "Unknown",
        points: entry.points,
        rank: index + 1,
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: error.message || "Failed to get leaderboard" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories.map(c => c.name));
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: error.message || "Failed to get categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const category = await storage.createCategory({ name });
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Create category error:", error);
      res.status(500).json({ error: error.message || "Failed to create category" });
    }
  });

  return httpServer;
}
