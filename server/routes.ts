import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import { generateContent, calculateCost, invalidateSettingsCache, invalidateKeysCache } from "./services/aiService";
import { encrypt } from "./services/crypto";
import { z } from "zod";

const aiSettingsSchema = z.object({
  provider: z.enum(["gemini", "openai", "deepseek"]).default("gemini"),
  geminiModel: z.enum(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]).optional(),
  openaiModel: z.enum(["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]).optional(),
  deepseekModel: z.enum(["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]).optional(),
  isActive: z.boolean().default(true),
});

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Helper function to check if organization has exceeded token cap
// Reserves an estimated buffer for the incoming request to prevent overshoot
async function checkTokenCapHelper(organizationId?: string | null, estimatedTokens: number = 5000): Promise<{ allowed: boolean; message?: string; remaining?: number }> {
  if (!organizationId) {
    return { allowed: true };
  }
  
  try {
    const capInfo = await storage.checkTokenCap(organizationId);
    // Check if current usage + estimated request tokens would exceed limit
    const wouldExceed = (capInfo.used + estimatedTokens) >= capInfo.limit;
    if (!capInfo.withinLimit || wouldExceed) {
      return {
        allowed: false,
        message: `Your organization has reached its monthly AI token limit (${capInfo.limit.toLocaleString()} tokens). Please contact your administrator to upgrade your plan.`,
        remaining: capInfo.remaining,
      };
    }
    return { allowed: true, remaining: capInfo.remaining };
  } catch (err) {
    console.warn('Failed to check token cap:', err);
    return { allowed: true };
  }
}

// Helper function to log AI usage after API calls
async function logAiUsageHelper(
  endpoint: string,
  model: string,
  response: any,
  organizationId?: string | null,
  userId?: string | null,
  requestPayload?: any
) {
  try {
    // Extract token usage from Gemini response metadata
    const usageMetadata = response?.usageMetadata || {};
    const promptTokens = usageMetadata.promptTokenCount || 0;
    const completionTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = usageMetadata.totalTokenCount || promptTokens + completionTokens;
    
    // Calculate estimated cost using the service layer pricing
    const estimatedCost = calculateCost(model, promptTokens, completionTokens);
    
    await storage.logAiUsage({
      organizationId: organizationId || null,
      userId: userId || null,
      endpoint,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: estimatedCost.toFixed(6),
      requestPayload: requestPayload ? { summary: typeof requestPayload === 'string' ? requestPayload.substring(0, 200) : 'complex-request' } : null,
      responseStatus: 'success',
    });
  } catch (err) {
    console.warn('Failed to log AI usage:', err);
  }
}

interface ContentBlock {
  type: string;
  content: string;
  title?: string;
  order?: number;
}

function buildMultimodalParts(blocks: ContentBlock[]): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  
  blocks.forEach(block => {
    if (block.type === 'paragraph') {
      if (block.content) {
        parts.push({ text: block.content });
      }
    } else if ((block.type === 'image' || block.type === 'document') && block.content?.startsWith('data:')) {
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
        if (block.title) {
          parts.push({ text: `[${block.type === 'image' ? 'Image' : 'Document'} reference: ${block.title}]` });
        }
      }
    } else if (block.type === 'document' && block.title) {
      parts.push({ text: `[Document reference: ${block.title}]` });
    } else if (block.type === 'video') {
      parts.push({ text: `[Video: ${block.title || 'Untitled'} - URL: ${block.content || 'No URL'}]` });
    } else if (block.title) {
      parts.push({ text: `[Resource: ${block.title}]` });
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
      const { content, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
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

      const { response, model } = await generateContent({
        systemPrompt,
        contents: parts,
      });

      await logAiUsageHelper("/api/gemini/generate-quiz", model, response, organizationId, userId, "quiz-generation");

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
      const { message, useThinkingMode, systemInstruction, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const prompt = systemInstruction 
        ? `${systemInstruction}\n\nUser: ${message}`
        : message;

      const { response, model } = await generateContent({
        contents: [{ text: prompt }],
        thinking: useThinkingMode,
      });

      await logAiUsageHelper("/api/gemini/chatbot", model, response, organizationId, userId, message);

      res.json({ response: response.text || "I'm sorry, I couldn't generate a response." });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({ error: error.message || "Failed to get chatbot response" });
    }
  });

  app.post("/api/gemini/analyze-video", async (req, res) => {
    try {
      const { videoTitle, videoUrl, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
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

      const { response, model } = await generateContent({
        contents: [{ text: prompt }],
      });

      await logAiUsageHelper("/api/gemini/analyze-video", model, response, organizationId, userId, videoTitle);

      res.json({ analysis: response.text || "Unable to analyze video." });
    } catch (error: any) {
      console.error("Video analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze video" });
    }
  });

  app.post("/api/gemini/ask-question", async (req, res) => {
    try {
      const { content, question, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
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

      const { response, model } = await generateContent({
        systemPrompt,
        contents: parts,
      });

      await logAiUsageHelper("/api/gemini/ask-question", model, response, organizationId, userId, question);

      res.json({ answer: response.text || "I couldn't find an answer to your question." });
    } catch (error: any) {
      console.error("Ask question error:", error);
      res.status(500).json({ error: error.message || "Failed to answer question" });
    }
  });

  // New chat-style endpoint with guardrails and brevity
  app.post("/api/gemini/topic-chat", async (req, res) => {
    try {
      const { content, topicTitle, question, chatHistory, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
      if (!content || !question) {
        return res.status(400).json({ error: "Content and question are required" });
      }

      const parts = buildMultimodalParts(content);
      
      if (parts.length === 0) {
        return res.status(400).json({ error: "No valid content found" });
      }

      // Build chat history context
      let historyContext = "";
      if (chatHistory && chatHistory.length > 0) {
        historyContext = "\n\nPrevious conversation:\n" + 
          chatHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      }

      const systemPrompt = `You are a focused AI tutor helping with the course "${topicTitle || 'this topic'}".

STRICT RULES:
1. ONLY answer questions directly related to this course content. If asked about anything unrelated (other topics, personal opinions, general knowledge not in the content), politely say: "I can only help with questions about this course. What would you like to know about the content?"
2. Keep answers SHORT and conversational - 1-3 sentences max by default.
3. Use simple, clear language. No bullet points or long paragraphs unless the user specifically asks for "more details" or "explain in depth".
4. If unsure, say so briefly rather than making things up.
5. Be friendly but concise - this is a chat, not an essay.

${historyContext}

USER'S QUESTION: ${question}

Based on the course content provided, give a brief, helpful response.`;

      const { response, model } = await generateContent({
        systemPrompt,
        contents: parts,
      });

      await logAiUsageHelper("/api/gemini/topic-chat", model, response, organizationId, userId, question);

      res.json({ answer: response.text || "I'm not sure about that. Could you rephrase?" });
    } catch (error: any) {
      console.error("Topic chat error:", error);
      res.status(500).json({ error: error.message || "Failed to respond" });
    }
  });

  app.post("/api/gemini/generate-course", async (req, res) => {
    try {
      const { prompt, resources, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId, 15000);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
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

      const { response, model } = await generateContent({
        contents: [{ text: genPrompt }],
      });

      await logAiUsageHelper("/api/gemini/generate-course", model, response, organizationId, userId, prompt);

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

  // Generate course modules from content
  app.post("/api/gemini/generate-modules", async (req, res) => {
    try {
      const { content, title, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId, 20000);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
      if (!content || !Array.isArray(content)) {
        return res.status(400).json({ error: "Content blocks are required" });
      }

      const parts = buildMultimodalParts(content);
      
      if (parts.length === 0) {
        return res.status(400).json({ error: "No valid content found to generate modules" });
      }

      const systemPrompt = `You are an instructional designer creating a structured course from the provided content. Analyze the content (which may include text, documents, and images) and split it into logical learning modules.

COURSE TITLE: ${title || 'Untitled Course'}

Generate 3-6 well-structured learning modules based on the content. Each module should cover a distinct topic or skill area.

Output ONLY valid JSON in this exact format:
{
  "modules": [
    {
      "id": "module-1",
      "title": "Module Title",
      "summary": "Brief 2-3 sentence summary of what this module covers",
      "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
      "contentBlocks": [
        {"type": "paragraph", "content": "Detailed content for this module...", "order": 1}
      ],
      "suggestedVideoTopics": ["Topic for supplementary video 1", "Topic 2"],
      "order": 1
    }
  ]
}

Requirements:
- Create 3-6 modules based on content complexity
- Each module should have 2-4 learning objectives
- Each module should have 2-4 content paragraphs (100-200 words each)
- Suggest 1-3 video topics per module that would enhance learning
- Content should be educational, professional, and actionable
- Maintain logical flow between modules
- Output ONLY valid JSON, no other text`;

      const { response, model } = await generateContent({
        systemPrompt,
        contents: parts,
        thinking: true,
      });

      await logAiUsageHelper("/api/gemini/generate-modules", model, response, organizationId, userId, title);

      const responseText = response.text || "{}";
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const modulesData = JSON.parse(jsonMatch[0]);
      
      // Transform modules to include empty videos array
      if (modulesData.modules) {
        modulesData.modules = modulesData.modules.map((m: any, idx: number) => ({
          ...m,
          id: m.id || `module-${idx + 1}`,
          videos: [],
          order: m.order || idx + 1
        }));
      }
      
      res.json(modulesData);
    } catch (error: any) {
      console.error("Module generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate modules" });
    }
  });

  // Generate quiz for a specific module
  app.post("/api/gemini/generate-module-quiz", async (req, res) => {
    try {
      const { moduleContent, moduleTitle, organizationId, userId } = req.body;
      
      const capCheck = await checkTokenCapHelper(organizationId);
      if (!capCheck.allowed) {
        return res.status(429).json({ error: capCheck.message });
      }
      
      if (!moduleContent) {
        return res.status(400).json({ error: "Module content is required" });
      }

      const systemPrompt = `You are creating a quiz to test understanding of a course module.

MODULE TITLE: ${moduleTitle || 'Module'}

MODULE CONTENT:
${typeof moduleContent === 'string' ? moduleContent : JSON.stringify(moduleContent)}

Generate 5 multiple-choice questions that test key concepts from this module. Questions should range from basic recall to application.

Output ONLY a valid JSON array in this format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0
  }
]

Requirements:
- Create exactly 5 questions
- Each question has exactly 4 options
- correctAnswerIndex is 0-3 indicating the correct option
- Questions should test understanding, not just memorization
- Output ONLY valid JSON array, no other text`;

      const { response, model } = await generateContent({
        contents: [{ text: systemPrompt }],
      });

      await logAiUsageHelper("/api/gemini/generate-module-quiz", model, response, organizationId, userId, moduleTitle);

      const responseText = response.text || "[]";
      
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in response");
      }

      const quizData = JSON.parse(jsonMatch[0]);
      res.json(quizData);
    } catch (error: any) {
      console.error("Module quiz generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate module quiz" });
    }
  });

  // Module progress endpoints
  app.get("/api/module-progress/:topicId", async (req, res) => {
    try {
      const { topicId } = req.params;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const progress = await storage.getModuleProgressForTopic(userId, topicId);
      res.json(progress);
    } catch (error: any) {
      console.error("Get module progress error:", error);
      res.status(500).json({ error: error.message || "Failed to get module progress" });
    }
  });

  app.post("/api/module-progress", async (req, res) => {
    try {
      const { topicId, moduleId, status, quizScore, quizTotal } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (!topicId || !moduleId) {
        return res.status(400).json({ error: "topicId and moduleId are required" });
      }
      
      const progress = await storage.createOrUpdateModuleProgress({
        userId,
        topicId,
        moduleId,
        status: status || "unlocked",
        quizScore,
        quizTotal,
        completedAt: status === "completed" ? new Date() : undefined,
      });
      
      res.json(progress);
    } catch (error: any) {
      console.error("Update module progress error:", error);
      res.status(500).json({ error: error.message || "Failed to update module progress" });
    }
  });

  // Course completion endpoints
  app.get("/api/course-completions/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const completions = await storage.getUserCourseCompletions(userId);
      const allTopics = await storage.getAllTopics();
      
      const completionsWithDetails = completions.map(c => {
        const topic = allTopics.find(t => t.id === c.topicId);
        return {
          ...c,
          topicTitle: topic?.title || 'Unknown Course',
          topicCategory: topic?.category || '',
          topicImageUrl: topic?.imageUrl || null,
        };
      });
      
      res.json(completionsWithDetails);
    } catch (error: any) {
      console.error("Get user course completions error:", error);
      res.status(500).json({ error: error.message || "Failed to get course completions" });
    }
  });

  app.get("/api/course-completions/all", async (req, res) => {
    try {
      const completions = await storage.getAllCourseCompletions();
      const allTopics = await storage.getAllTopics();
      const allUsers = await storage.getAllUsers();
      
      const completionsWithDetails = completions.map(c => {
        const topic = allTopics.find(t => t.id === c.topicId);
        const user = allUsers.find(u => u.id === c.userId);
        return {
          ...c,
          topicTitle: topic?.title || 'Unknown Course',
          userName: user?.name || 'Unknown User',
          userEmail: user?.email || '',
        };
      });
      
      res.json(completionsWithDetails);
    } catch (error: any) {
      console.error("Get all course completions error:", error);
      res.status(500).json({ error: error.message || "Failed to get course completions" });
    }
  });

  app.post("/api/course-completions/check", async (req, res) => {
    try {
      const { topicId } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (!topicId) {
        return res.status(400).json({ error: "topicId is required" });
      }
      
      const result = await storage.checkAndRecordCourseCompletion(userId, topicId);
      
      if (result.isNew && result.completion) {
        const topic = await storage.getTopic(topicId);
        return res.json({
          ...result,
          topicTitle: topic?.title || 'Unknown Course',
          message: 'Congratulations! You have completed this course!',
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Check course completion error:", error);
      res.status(500).json({ error: error.message || "Failed to check course completion" });
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

  // Organization registration - creates org in pending state awaiting SuperAdmin approval
  app.post("/api/auth/register-organization", async (req, res) => {
    try {
      const { organizationName, adminName, adminEmail, password, planId } = req.body;

      if (!organizationName || !adminName || !adminEmail || !password || !planId) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(adminEmail);
      if (existingUser) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      // Check if plan exists
      const plan = await storage.getLicensePlan(planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      // Create slug from organization name
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if org with this slug exists
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        return res.status(409).json({ error: "An organization with a similar name already exists" });
      }

      // Create organization in inactive state (pending approval)
      const organization = await storage.createOrganization({
        name: organizationName,
        slug: slug,
        isActive: false, // Pending SuperAdmin approval
        settings: { pendingApproval: true, registeredAt: new Date().toISOString() },
      });

      // Create the admin user
      const user = await storage.createUser({
        name: adminName,
        email: adminEmail,
        password, // Will be hashed by storage
        role: "OrgAdmin",
        groupIds: [],
        organizationId: organization.id,
      });

      // Create organization membership
      await storage.createOrganizationMembership({
        userId: user.id,
        organizationId: organization.id,
        role: "OrgAdmin",
        isActive: true,
      });

      // Create organization license with selected plan
      await storage.createOrganizationLicense({
        organizationId: organization.id,
        planId: planId,
        status: "pending", // Pending until org is approved
        currentUsers: 1,
        currentCreators: 0,
        currentCourses: 0,
        currentStorageMb: 0,
      });

      res.status(201).json({
        message: "Organization registration submitted successfully. Awaiting approval.",
        organizationId: organization.id,
        organizationName: organization.name,
      });
    } catch (error: any) {
      console.error("Organization registration error:", error);
      res.status(500).json({ error: error.message || "Failed to register organization" });
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

      // Check if user belongs to an organization and if it's active (BEFORE setting session)
      if (user.organizationId && user.role !== 'SuperAdmin') {
        const organization = await storage.getOrganization(user.organizationId);
        if (organization && !organization.isActive) {
          // Use same error as invalid password to prevent information leakage
          return res.status(401).json({ error: "Invalid email or password" });
        }
      }

      // Only set session after all checks pass
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
      const sessionUserId = req.session.userId;
      let users;
      
      if (sessionUserId) {
        const currentUser = await storage.getUser(sessionUserId);
        // If user belongs to an organization, filter users by that org
        if (currentUser && currentUser.organizationId) {
          users = await storage.getUsersByOrganization(currentUser.organizationId);
        } else if (currentUser?.role === 'SuperAdmin') {
          // SuperAdmins see all users
          users = await storage.getAllUsers();
        } else {
          // Users without org see all users (legacy behavior)
          users = await storage.getAllUsers();
        }
      } else {
        users = await storage.getAllUsers();
      }
      
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

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, role, groupIds } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role: role || "Learner",
        groupIds: groupIds || [],
      });
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        groupIds: user.groupIds,
      });
    } catch (error: any) {
      console.error("Create user error:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { name, email, role, groupIds } = req.body;
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await storage.updateUser(req.params.id, {
        name: name ?? user.name,
        email: email ?? user.email,
        role: role ?? user.role,
        groupIds: groupIds ?? user.groupIds,
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        groupIds: updatedUser.groupIds,
      });
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: error.message || "Failed to update user" });
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
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Only OrgAdmin and SuperAdmin can create groups/departments
      if (user.role !== 'OrgAdmin' && user.role !== 'SuperAdmin') {
        return res.status(403).json({ error: "Only organization admins can create departments" });
      }
      
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

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGroup(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json({ message: "Group deleted" });
    } catch (error: any) {
      console.error("Delete group error:", error);
      res.status(500).json({ error: error.message || "Failed to delete group" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "User deleted" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: error.message || "Failed to delete user" });
    }
  });

  app.post("/api/users/:id/reset-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await storage.updateUser(req.params.id, {
        password: newPassword,
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "Failed to update password" });
      }
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: error.message || "Failed to reset password" });
    }
  });

  app.delete("/api/categories/:name", async (req, res) => {
    try {
      const deleted = await storage.deleteCategory(req.params.name);
      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category deleted" });
    } catch (error: any) {
      console.error("Delete category error:", error);
      res.status(500).json({ error: error.message || "Failed to delete category" });
    }
  });

  // Admin Analytics Endpoints
  app.get("/api/admin/analytics/overview", async (req, res) => {
    try {
      const overview = await storage.getAnalyticsOverview();
      res.json(overview);
    } catch (error: any) {
      console.error("Get analytics overview error:", error);
      res.status(500).json({ error: error.message || "Failed to get analytics overview" });
    }
  });

  app.get("/api/admin/analytics/courses", async (req, res) => {
    try {
      const courses = await storage.getCourseAnalytics();
      res.json(courses);
    } catch (error: any) {
      console.error("Get course analytics error:", error);
      res.status(500).json({ error: error.message || "Failed to get course analytics" });
    }
  });

  app.get("/api/admin/analytics/users", async (req, res) => {
    try {
      const users = await storage.getUserAnalytics();
      res.json(users);
    } catch (error: any) {
      console.error("Get user analytics error:", error);
      res.status(500).json({ error: error.message || "Failed to get user analytics" });
    }
  });

  app.get("/api/admin/analytics/courses/:topicId/users", async (req, res) => {
    try {
      const { topicId } = req.params;
      const userProgress = await storage.getCourseUserProgress(topicId);
      res.json(userProgress);
    } catch (error: any) {
      console.error("Get course user progress error:", error);
      res.status(500).json({ error: error.message || "Failed to get course user progress" });
    }
  });

  app.get("/api/admin/analytics/users/:userId/courses", async (req, res) => {
    try {
      const { userId } = req.params;
      const courseProgress = await storage.getUserCourseProgress(userId);
      res.json(courseProgress);
    } catch (error: any) {
      console.error("Get user course progress error:", error);
      res.status(500).json({ error: error.message || "Failed to get user course progress" });
    }
  });

  app.get("/api/admin/analytics/badges", async (req, res) => {
    try {
      const completions = await storage.getAllCourseCompletions();
      const allUsers = await storage.getAllUsers();
      const allTopics = await storage.getAllTopics();
      
      const badgeData = completions.map(c => {
        const user = allUsers.find(u => u.id === c.userId);
        const topic = allTopics.find(t => t.id === c.topicId);
        return {
          id: c.id,
          userId: c.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          topicId: c.topicId,
          topicTitle: topic?.title || 'Unknown Course',
          averageScore: c.averageScore,
          totalModules: c.totalModules,
          completedAt: c.completedAt,
        };
      });
      
      res.json(badgeData);
    } catch (error: any) {
      console.error("Get badge analytics error:", error);
      res.status(500).json({ error: error.message || "Failed to get badge analytics" });
    }
  });

  app.get("/api/topics", async (req, res) => {
    try {
      const userId = req.session.userId;
      let topics;
      
      if (userId) {
        const user = await storage.getUser(userId);
        // If user belongs to an organization, filter topics by that org
        if (user && user.organizationId) {
          topics = await storage.getTopicsByOrganization(user.organizationId);
        } else if (user?.role === 'SuperAdmin') {
          // SuperAdmins see all topics
          topics = await storage.getAllTopics();
        } else {
          // Users without org see all topics (legacy behavior)
          topics = await storage.getAllTopics();
        }
      } else {
        topics = await storage.getAllTopics();
      }
      
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
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Set the authorId and organizationId from the logged-in user
      const topicData = {
        ...req.body,
        authorId: userId,
        organizationId: user.organizationId || null,
      };
      
      const topic = await storage.createTopic(topicData);
      
      // Update organization's course count if applicable
      if (user.organizationId) {
        const license = await storage.getOrganizationLicense(user.organizationId);
        if (license) {
          await storage.updateOrganizationLicense(license.id, {
            currentCourses: (license.currentCourses || 0) + 1,
          });
        }
      }
      
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
      // Get the topic first to know its organization
      const topic = await storage.getTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      
      const deleted = await storage.deleteTopic(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Topic not found" });
      }
      
      // Decrement organization's course count if applicable
      if (topic.organizationId) {
        const license = await storage.getOrganizationLicense(topic.organizationId);
        if (license && license.currentCourses > 0) {
          await storage.updateOrganizationLicense(license.id, {
            currentCourses: license.currentCourses - 1,
          });
        }
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
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Only OrgAdmin and SuperAdmin can create categories
      if (user.role !== 'OrgAdmin' && user.role !== 'SuperAdmin') {
        return res.status(403).json({ error: "Only organization admins can create categories" });
      }
      
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

  app.get("/api/analytics/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await storage.getUserStats(userId);
      const progress = await storage.getUserProgressAll(userId);
      
      const completedTopics = progress.filter(p => p.status === "Completed");
      const quizScores = completedTopics
        .filter(p => p.quizScore !== null && p.quizTotal !== null)
        .map(p => ({ score: p.quizScore!, total: p.quizTotal!, date: p.completedAt }));
      
      const totalQuizzes = quizScores.length;
      const averageScore = totalQuizzes > 0
        ? Math.round(quizScores.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / totalQuizzes)
        : 0;
      
      const weeklyProgress: { day: string; completed: number }[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const count = completedTopics.filter(p => {
          if (!p.completedAt) return false;
          const completed = new Date(p.completedAt);
          return completed >= dayStart && completed <= dayEnd;
        }).length;
        
        weeklyProgress.push({ day: dayStr, completed: count });
      }
      
      const categoryProgress: { category: string; completed: number; total: number }[] = [];
      const allTopics = await storage.getAllTopics();
      const categoryMap = new Map<string, { completed: number; total: number }>();
      
      allTopics.forEach(topic => {
        const cat = topic.category || "Uncategorized";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { completed: 0, total: 0 });
        }
        categoryMap.get(cat)!.total++;
        
        const isCompleted = completedTopics.some(p => p.topicId === topic.id);
        if (isCompleted) {
          categoryMap.get(cat)!.completed++;
        }
      });
      
      categoryMap.forEach((value, key) => {
        categoryProgress.push({ category: key, ...value });
      });
      
      res.json({
        currentStreak: stats?.currentStreak || 0,
        longestStreak: stats?.longestStreak || 0,
        totalTopicsCompleted: completedTopics.length,
        totalQuizzesPassed: totalQuizzes,
        averageQuizScore: averageScore,
        weeklyProgress,
        categoryProgress,
        recentQuizzes: quizScores.slice(-5).map(q => ({
          score: q.score,
          total: q.total,
          percentage: Math.round((q.score / q.total) * 100),
          date: q.date
        })),
      });
    } catch (error: any) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: error.message || "Failed to get analytics" });
    }
  });

  app.post("/api/analytics/activity", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const stats = await storage.recordActivity(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Record activity error:", error);
      res.status(500).json({ error: error.message || "Failed to record activity" });
    }
  });

  // ==================== ORGANIZATION MANAGEMENT API ====================

  // SuperAdmin: Get all organizations
  app.get("/api/organizations", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const organizations = await storage.getAllOrganizations();
      
      // Enrich with license info
      const orgsWithLicense = await Promise.all(
        organizations.map(async (org) => {
          const license = await storage.getOrganizationLicense(org.id);
          const plan = license ? await storage.getLicensePlan(license.planId) : null;
          const members = await storage.getOrganizationMembers(org.id);
          return {
            ...org,
            license: license ? {
              ...license,
              planName: plan?.name || 'Unknown',
            } : null,
            memberCount: members.length,
          };
        })
      );
      
      res.json(orgsWithLicense);
    } catch (error: any) {
      console.error("Get organizations error:", error);
      res.status(500).json({ error: error.message || "Failed to get organizations" });
    }
  });

  // SuperAdmin: Get single organization
  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "SuperAdmin" && user.organizationId !== req.params.id)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      const license = await storage.getOrganizationLicense(org.id);
      const plan = license ? await storage.getLicensePlan(license.planId) : null;
      const members = await storage.getOrganizationMembers(org.id);
      
      res.json({
        ...org,
        license: license ? {
          ...license,
          planName: plan?.name || 'Unknown',
          limits: plan,
        } : null,
        memberCount: members.length,
      });
    } catch (error: any) {
      console.error("Get organization error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization" });
    }
  });

  // SuperAdmin: Create organization
  app.post("/api/organizations", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const { name, slug, description, logoUrl, planId } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }
      
      // Check if slug is unique
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        return res.status(409).json({ error: "Organization with this slug already exists" });
      }
      
      // Create organization
      const org = await storage.createOrganization({
        name,
        slug,
        description,
        logoUrl,
        isActive: true,
        settings: {},
      });
      
      // Create license if planId provided
      if (planId) {
        await storage.createOrganizationLicense({
          organizationId: org.id,
          planId,
          status: "active",
          currentUsers: 0,
          currentCreators: 0,
          currentCourses: 0,
          currentStorageMb: 0,
        });
      }
      
      res.status(201).json(org);
    } catch (error: any) {
      console.error("Create organization error:", error);
      res.status(500).json({ error: error.message || "Failed to create organization" });
    }
  });

  // SuperAdmin: Update organization
  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const { name, description, logoUrl, isActive } = req.body;
      
      const org = await storage.updateOrganization(req.params.id, {
        name,
        description,
        logoUrl,
        isActive,
      });
      
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      res.json(org);
    } catch (error: any) {
      console.error("Update organization error:", error);
      res.status(500).json({ error: error.message || "Failed to update organization" });
    }
  });

  // SuperAdmin: Approve or reject a pending organization
  app.post("/api/organizations/:id/approve", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const { approved } = req.body;
      const orgId = req.params.id;
      
      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      const existingSettings = (org.settings && typeof org.settings === 'object') ? org.settings : {};
      
      if (approved) {
        // Activate the organization
        await storage.updateOrganization(orgId, {
          isActive: true,
          settings: { ...existingSettings, pendingApproval: false, approvedAt: new Date().toISOString() },
        });
        
        // Also activate the organization license
        const license = await storage.getOrganizationLicense(orgId);
        if (license) {
          await storage.updateOrganizationLicense(license.id, {
            status: "active",
          });
        }
        
        res.json({ message: "Organization approved and activated", organizationId: orgId });
      } else {
        // Reject - mark as rejected but don't delete (for record keeping)
        await storage.updateOrganization(orgId, {
          isActive: false,
          settings: { ...existingSettings, pendingApproval: false, rejected: true, rejectedAt: new Date().toISOString() },
        });
        
        res.json({ message: "Organization registration rejected", organizationId: orgId });
      }
    } catch (error: any) {
      console.error("Approve organization error:", error);
      res.status(500).json({ error: error.message || "Failed to process approval" });
    }
  });

  // SuperAdmin: Delete organization
  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const deleted = await storage.deleteOrganization(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      res.json({ message: "Organization deleted" });
    } catch (error: any) {
      console.error("Delete organization error:", error);
      res.status(500).json({ error: error.message || "Failed to delete organization" });
    }
  });

  // ==================== LICENSE PLAN API ====================

  // Get all license plans
  app.get("/api/license-plans", async (req, res) => {
    try {
      const plans = await storage.getAllLicensePlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Get license plans error:", error);
      res.status(500).json({ error: error.message || "Failed to get license plans" });
    }
  });

  // SuperAdmin: Create license plan
  app.post("/api/license-plans", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const plan = await storage.createLicensePlan(req.body);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Create license plan error:", error);
      res.status(500).json({ error: error.message || "Failed to create license plan" });
    }
  });

  // SuperAdmin: Update license plan
  app.put("/api/license-plans/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const plan = await storage.updateLicensePlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "License plan not found" });
      }
      res.json(plan);
    } catch (error: any) {
      console.error("Update license plan error:", error);
      res.status(500).json({ error: error.message || "Failed to update license plan" });
    }
  });

  // SuperAdmin: Delete license plan
  app.delete("/api/license-plans/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const success = await storage.deleteLicensePlan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "License plan not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete license plan error:", error);
      res.status(500).json({ error: error.message || "Failed to delete license plan" });
    }
  });

  // ==================== AI USAGE TRACKING API ====================

  // SuperAdmin: Get all AI usage summary
  app.get("/api/ai-usage/summary", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const summary = await storage.getAiUsageSummary();
      
      // Calculate platform totals
      const platformTotals = {
        totalRequests: summary.reduce((sum, s) => sum + s.totalRequests, 0),
        totalTokens: summary.reduce((sum, s) => sum + s.totalTokens, 0),
        totalPromptTokens: summary.reduce((sum, s) => sum + s.totalPromptTokens, 0),
        totalCompletionTokens: summary.reduce((sum, s) => sum + s.totalCompletionTokens, 0),
        estimatedCost: summary.reduce((sum, s) => sum + s.estimatedCost, 0),
      };
      
      res.json({ summary, platformTotals });
    } catch (error: any) {
      console.error("Get AI usage summary error:", error);
      res.status(500).json({ error: error.message || "Failed to get AI usage summary" });
    }
  });

  // SuperAdmin: Get AI usage for specific organization
  app.get("/api/ai-usage/organization/:orgId", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const orgSummary = await storage.getAiUsageSummaryByOrganization(req.params.orgId);
      res.json(orgSummary);
    } catch (error: any) {
      console.error("Get organization AI usage error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization AI usage" });
    }
  });

  // OrgAdmin: Get AI usage for their own organization
  app.get("/api/my-organization/ai-usage", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Must be OrgAdmin
      if (user.role !== "OrgAdmin") {
        return res.status(403).json({ error: "Access denied. OrgAdmin required." });
      }
      
      if (!user.organizationId) {
        return res.status(400).json({ error: "No organization associated with user" });
      }
      
      const orgSummary = await storage.getAiUsageSummaryByOrganization(user.organizationId);
      
      // Calculate organization totals
      const orgTotals = {
        totalRequests: orgSummary.totalRequests || 0,
        totalTokens: orgSummary.totalTokens || 0,
        totalPromptTokens: orgSummary.totalPromptTokens || 0,
        totalCompletionTokens: orgSummary.totalCompletionTokens || 0,
        estimatedCost: orgSummary.estimatedCost || 0,
        endpointBreakdown: orgSummary.endpointBreakdown || [],
      };
      
      res.json(orgTotals);
    } catch (error: any) {
      console.error("Get organization AI usage error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization AI usage" });
    }
  });

  // SuperAdmin: Get all AI usage logs
  app.get("/api/ai-usage/logs", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin required." });
      }
      
      const logs = await storage.getAllAiUsage();
      res.json(logs.slice(0, 100)); // Return last 100 logs
    } catch (error: any) {
      console.error("Get AI usage logs error:", error);
      res.status(500).json({ error: error.message || "Failed to get AI usage logs" });
    }
  });

  // ==================== ORGANIZATION MEMBERSHIP API ====================

  // OrgAdmin: Get organization members
  app.get("/api/organizations/:orgId/members", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      // Allow SuperAdmin or OrgAdmin of this org
      if (!user || (user.role !== "SuperAdmin" && user.role !== "OrgAdmin" && (!membership || (membership.role !== "admin" && membership.role !== "OrgAdmin")))) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const memberships = await storage.getOrganizationMembers(req.params.orgId);
      
      // Enrich with user details
      const membersWithDetails = await Promise.all(
        memberships.map(async (m) => {
          const memberUser = await storage.getUser(m.userId);
          return {
            ...m,
            user: {
              id: memberUser?.id || '',
              name: memberUser?.name || 'Unknown',
              email: memberUser?.email || '',
              role: memberUser?.role || 'Learner',
            },
          };
        })
      );
      
      res.json(membersWithDetails);
    } catch (error: any) {
      console.error("Get organization members error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization members" });
    }
  });

  // OrgAdmin: Add member to organization (can also create new user)
  app.post("/api/organizations/:orgId/members", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      if (!user || (user.role !== "SuperAdmin" && user.role !== "OrgAdmin" && (!membership || (membership.role !== "admin" && membership.role !== "OrgAdmin")))) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check license limits
      const { withinLimits, limits, usage } = await storage.checkLicenseLimits(req.params.orgId);
      if (!withinLimits) {
        return res.status(403).json({ 
          error: "Organization has reached its license limits",
          limits,
          usage,
        });
      }
      
      const { memberUserId, role, name, email, password, department } = req.body;
      
      let targetUserId = memberUserId;
      
      // If creating a new user (name, email, password provided)
      if (name && email && password) {
        // Check if email already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ error: "A user with this email already exists" });
        }
        
        // Create new user with department
        const newUser = await storage.createUser({
          name,
          email,
          password,
          role: role || "Learner",
          organizationId: req.params.orgId,
          department: department || null,
          groupIds: [],
        });
        targetUserId = newUser.id;
      }
      
      if (!targetUserId) {
        return res.status(400).json({ error: "Either memberUserId or name/email/password is required" });
      }
      
      // Check if already a member
      const existingMembership = await storage.getOrganizationMembership(targetUserId, req.params.orgId);
      if (existingMembership && existingMembership.isActive) {
        return res.status(409).json({ error: "User is already a member of this organization" });
      }
      
      const newMembership = await storage.createOrganizationMembership({
        userId: targetUserId,
        organizationId: req.params.orgId,
        role: role || "Learner",
        isActive: true,
      });
      
      // Also update the user's organizationId
      await storage.updateUser(targetUserId, { organizationId: req.params.orgId });
      
      res.status(201).json(newMembership);
    } catch (error: any) {
      console.error("Add organization member error:", error);
      res.status(500).json({ error: error.message || "Failed to add organization member" });
    }
  });

  // OrgAdmin: Update member role
  app.patch("/api/organizations/:orgId/members/:memberId", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      if (!user || (user.role !== "SuperAdmin" && user.role !== "OrgAdmin" && (!membership || (membership.role !== "admin" && membership.role !== "OrgAdmin")))) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { role } = req.body;
      
      const updated = await storage.updateOrganizationMembership(req.params.memberId, { role });
      if (!updated) {
        return res.status(404).json({ error: "Membership not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update organization member error:", error);
      res.status(500).json({ error: error.message || "Failed to update organization member" });
    }
  });

  // OrgAdmin: Remove member from organization
  app.delete("/api/organizations/:orgId/members/:memberUserId", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      if (!user || (user.role !== "SuperAdmin" && user.role !== "OrgAdmin" && (!membership || (membership.role !== "admin" && membership.role !== "OrgAdmin")))) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const removed = await storage.removeOrganizationMembership(req.params.memberUserId, req.params.orgId);
      if (!removed) {
        return res.status(404).json({ error: "Membership not found" });
      }
      
      res.json({ message: "Member removed from organization" });
    } catch (error: any) {
      console.error("Remove organization member error:", error);
      res.status(500).json({ error: error.message || "Failed to remove organization member" });
    }
  });

  // ==================== ORGANIZATION-SCOPED QUERIES ====================

  // Get topics for an organization
  app.get("/api/organizations/:orgId/topics", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      if (!user || (user.role !== "SuperAdmin" && !membership)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const topics = await storage.getTopicsByOrganization(req.params.orgId);
      res.json(topics);
    } catch (error: any) {
      console.error("Get organization topics error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization topics" });
    }
  });

  // Get users for an organization
  app.get("/api/organizations/:orgId/users", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const membership = await storage.getOrganizationMembership(userId, req.params.orgId);
      
      if (!user || (user.role !== "SuperAdmin" && user.role !== "OrgAdmin" && (!membership || (membership.role !== "admin" && membership.role !== "OrgAdmin")))) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const users = await storage.getUsersByOrganization(req.params.orgId);
      
      // Remove passwords from response
      const safeUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationId: u.organizationId,
        groupIds: u.groupIds,
        createdAt: u.createdAt,
      }));
      
      res.json(safeUsers);
    } catch (error: any) {
      console.error("Get organization users error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization users" });
    }
  });

  // ==================== AI SETTINGS MANAGEMENT (SuperAdmin only) ====================
  
  // Get AI settings
  app.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin only." });
      }
      
      const settings = await storage.getAiSettings();
      
      // Return settings with API key status (not the actual keys)
      // Check both database-stored keys and environment variables
      const response = {
        provider: settings?.provider || "gemini",
        geminiModel: settings?.geminiModel || "gemini-2.5-flash",
        openaiModel: settings?.openaiModel || "gpt-4o",
        deepseekModel: settings?.deepseekModel || "deepseek-chat",
        isActive: settings?.isActive ?? true,
        updatedAt: settings?.updatedAt,
        keysUpdatedAt: settings?.keysUpdatedAt,
        apiKeyStatus: {
          gemini: !!settings?.geminiApiKey || !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY,
          openai: !!settings?.openaiApiKey || !!process.env.OPENAI_API_KEY,
          deepseek: !!settings?.deepseekApiKey || !!process.env.DEEPSEEK_API_KEY,
        },
      };
      
      res.json(response);
    } catch (error: any) {
      console.error("Get AI settings error:", error);
      res.status(500).json({ error: error.message || "Failed to get AI settings" });
    }
  });
  
  // Update AI settings
  app.put("/api/admin/ai-settings", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin only." });
      }
      
      const parseResult = aiSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid AI settings", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { provider, geminiModel, openaiModel, deepseekModel, isActive } = parseResult.data;
      
      const updated = await storage.updateAiSettings({
        provider,
        geminiModel,
        openaiModel,
        deepseekModel,
        isActive,
        updatedBy: userId,
      });
      
      invalidateSettingsCache();
      
      res.json({
        provider: updated.provider || "gemini",
        geminiModel: updated.geminiModel || "gemini-2.5-flash",
        openaiModel: updated.openaiModel || "gpt-4o",
        deepseekModel: updated.deepseekModel || "deepseek-chat",
        isActive: updated.isActive ?? true,
        updatedAt: updated.updatedAt,
        keysUpdatedAt: updated.keysUpdatedAt,
        apiKeyStatus: {
          gemini: !!updated.geminiApiKey || !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY,
          openai: !!updated.openaiApiKey || !!process.env.OPENAI_API_KEY,
          deepseek: !!updated.deepseekApiKey || !!process.env.DEEPSEEK_API_KEY,
        },
      });
    } catch (error: any) {
      console.error("Update AI settings error:", error);
      res.status(500).json({ error: error.message || "Failed to update AI settings" });
    }
  });
  
  // Update API keys (SuperAdmin only)
  app.put("/api/admin/ai-keys", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SuperAdmin") {
        return res.status(403).json({ error: "Access denied. SuperAdmin only." });
      }
      
      const { geminiKey, openaiKey, deepseekKey } = req.body;
      
      const updateData: any = {
        updatedBy: userId,
        keysUpdatedAt: new Date(),
      };
      
      // Only update keys that are provided (encrypt them)
      if (geminiKey !== undefined) {
        updateData.geminiApiKey = geminiKey ? encrypt(geminiKey) : null;
      }
      if (openaiKey !== undefined) {
        updateData.openaiApiKey = openaiKey ? encrypt(openaiKey) : null;
      }
      if (deepseekKey !== undefined) {
        updateData.deepseekApiKey = deepseekKey ? encrypt(deepseekKey) : null;
      }
      
      const updated = await storage.updateAiSettings(updateData);
      
      // Invalidate caches
      invalidateSettingsCache();
      invalidateKeysCache();
      
      res.json({
        success: true,
        keysUpdatedAt: updated.keysUpdatedAt,
        apiKeyStatus: {
          gemini: !!updated.geminiApiKey || !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY,
          openai: !!updated.openaiApiKey || !!process.env.OPENAI_API_KEY,
          deepseek: !!updated.deepseekApiKey || !!process.env.DEEPSEEK_API_KEY,
        },
      });
    } catch (error: any) {
      console.error("Update AI keys error:", error);
      res.status(500).json({ error: error.message || "Failed to update API keys" });
    }
  });

  // Get current user's organization context
  app.get("/api/my-organization", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.role === "SuperAdmin") {
        // SuperAdmin can see all organizations
        const orgs = await storage.getAllOrganizations();
        return res.json({
          isSuperAdmin: true,
          organizations: orgs,
          currentOrganization: null,
        });
      }
      
      // Get user's organizations
      const memberships = await storage.getUserOrganizations(userId);
      
      if (memberships.length === 0) {
        return res.json({
          isSuperAdmin: false,
          organizations: [],
          currentOrganization: null,
        });
      }
      
      // Get org details for each membership
      const orgsWithDetails = await Promise.all(
        memberships.map(async (m) => {
          const org = await storage.getOrganization(m.organizationId);
          return {
            ...org,
            memberRole: m.role,
          };
        })
      );
      
      // Use primary organization (first active membership)
      const primaryOrg = orgsWithDetails[0];
      
      res.json({
        isSuperAdmin: false,
        organizations: orgsWithDetails,
        currentOrganization: primaryOrg,
        memberRole: memberships[0]?.role,
      });
    } catch (error: any) {
      console.error("Get my organization error:", error);
      res.status(500).json({ error: error.message || "Failed to get organization context" });
    }
  });

  return httpServer;
}
