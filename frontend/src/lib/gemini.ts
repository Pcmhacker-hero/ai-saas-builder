import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please check your project settings.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export interface GeneratedApp {
  projectName: string;
  structure: {
    backend: string[];
    frontend: string[];
  };
  dependencies: {
    backend: string[];
    frontend: string[];
  };
  backend: {
    routes: { name: string; code: string }[];
    controllers: { name: string; code: string }[];
    models: { name: string; code: string }[];
    middleware: { name: string; code: string }[];
    validation: { name: string; code: string }[];
  };
  database: {
    collections: { name: string; schema: string }[];
  };
  frontend: {
    components: { name: string; code: string }[];
  };
}

export async function generateAppStructure(prompt: string): Promise<GeneratedApp> {
  const ai = getGenAI();
  const models = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-pro-preview"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `You are a senior full-stack engineer and AI architect.
        Generate a production-ready, structured MERN application based on this prompt: "${prompt}".
        
        STRICT RULES:
        - Return ONLY valid JSON.
        - No explanations, no extra text.
        - Code must be production-ready and follow MVC architecture.
        - Use consistent REST API design.
        - Include authentication (JWT, bcrypt), middleware, and global error handling.
        - All controllers must use try-catch.
        - CRITICAL: Include robust input validation for ALL API routes (request body, query parameters, and params) using 'zod' or similar validation logic to ensure data integrity.
        
        REQUIRED OUTPUT FORMAT:
        {
          "projectName": "...",
          "structure": {
            "backend": ["routes/", "controllers/", "models/", "middleware/", "validation/"],
            "frontend": ["components/", "pages/"]
          },
          "dependencies": {
            "backend": ["express", "mongoose", "jsonwebtoken", "bcryptjs", "cors", "dotenv", "zod"],
            "frontend": ["react", "axios", "lucide-react", "framer-motion"]
          },
          "backend": {
            "routes": [{"name": "authRoutes.js", "code": "..."}, {"name": "projectRoutes.js", "code": "..."}],
            "controllers": [{"name": "authController.js", "code": "..."}, {"name": "projectController.js", "code": "..."}],
            "models": [{"name": "User.js", "code": "..."}, {"name": "Project.js", "code": "..."}, {"name": "Task.js", "code": "..."}],
            "middleware": [{"name": "authMiddleware.js", "code": "..."}, {"name": "errorMiddleware.js", "code": "..."}],
            "validation": [{"name": "authValidation.js", "code": "..."}]
          },
          "database": {
            "collections": [{"name": "users", "schema": "..."}, {"name": "projects", "schema": "..."}, {"name": "tasks", "schema": "..."}]
          },
          "frontend": {
            "components": [{"name": "AuthForm.tsx", "code": "..."}, {"name": "Board.tsx", "code": "..."}, {"name": "TaskCard.tsx", "code": "..."}]
          }
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING },
              structure: {
                type: Type.OBJECT,
                properties: {
                  backend: { type: Type.ARRAY, items: { type: Type.STRING } },
                  frontend: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["backend", "frontend"]
              },
              dependencies: {
                type: Type.OBJECT,
                properties: {
                  backend: { type: Type.ARRAY, items: { type: Type.STRING } },
                  frontend: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["backend", "frontend"]
              },
              backend: {
                type: Type.OBJECT,
                properties: {
                  routes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  },
                  controllers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  },
                  models: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  },
                  middleware: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  },
                  validation: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  }
                },
                required: ["routes", "controllers", "models", "middleware", "validation"]
              },
              database: {
                type: Type.OBJECT,
                properties: {
                  collections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        schema: { type: Type.STRING }
                      },
                      required: ["name", "schema"]
                    }
                  }
                },
                required: ["collections"]
              },
              frontend: {
                type: Type.OBJECT,
                properties: {
                  components: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        code: { type: Type.STRING }
                      },
                      required: ["name", "code"]
                    }
                  }
                },
                required: ["components"]
              }
            },
            required: ["projectName", "structure", "dependencies", "backend", "database", "frontend"]
          }
        }
      });

      const text = response.text;
      if (!text) continue;
      
      return JSON.parse(text) as GeneratedApp;
    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e.message);
      lastError = e;
      // If it's a permission error, try the next model immediately
      if (e.message?.includes("PERMISSION_DENIED") || e.message?.includes("403")) {
        continue;
      }
      // For other errors, also try next model
      continue;
    }
  }

  throw lastError || new Error("Failed to generate application structure with all available models.");
}
