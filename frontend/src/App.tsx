import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  Database, 
  Layout, 
  Code2, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  Copy, 
  Check,
  Github,
  Server,
  Cpu,
  Trash2,
  History,
  ExternalLink,
  Save,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  FileJson,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { TaskBoard } from "@/components/TaskBoard";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { AuthPage } from "@/components/Auth";
import { saveProject, subscribeToProjects, testConnection, deleteProject, clearHistory } from "@/services/projectService";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateAppStructure, type GeneratedApp } from "@/lib/gemini";
import { ModularIdeView } from "@/components/ModularIdeView";
import { promptSchema } from "@/lib/schemas";
import { z } from "zod";

const MAX_PROMPT_LENGTH = 1000;

export default function App() {
  const [user, userLoading] = useAuthState(auth);
  const [isOffline, setIsOffline] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedApp | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  const loadingMessages = [
    "Connecting to Gemini 3.5 AI Engine...",
    "Analyzing your architectural prompt...",
    "Designing the MVC file structure...",
    "Generating database schemas & collections...",
    "Drafting authentication controllers (JWT & Bcrypt)...",
    "Injecting Zod input schema validations...",
    "Building responsive React frontend components...",
    "Assembling the full MERN code files...",
    "Polishing structures and checking dependency trees..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loading) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await testConnection();
        setIsOffline(false);
      } catch (error) {
        setIsOffline(true);
      }
    };
    checkConnection();

    // Listen for browser online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToProjects((projects) => {
        setHistory(projects);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    setResult(null);
    setHistory([]);
    toast.info("Logged out successfully");
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    try {
      await deleteProject(id);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }

    try {
      await clearHistory();
      setConfirmClear(false);
    } catch (error) {
      console.error("Clear history failed:", error);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveProject(result);
      toast.success("Project saved to your library!");
    } catch (error) {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    
    try {
      promptSchema.parse(trimmedPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const data = await generateAppStructure(trimmedPrompt);
      setResult(data);
      toast.success("Application structure generated!");
      
      // Scroll to results after a short delay to allow rendering
      setTimeout(() => {
        const resultElement = document.getElementById("generation-results");
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadProjectZip = async () => {
    if (!result) return;
    
    const zip = new JSZip();
    const backend = zip.folder("backend");
    const frontend = zip.folder("frontend");

    // Backend Files
    if (backend) {
      const routes = backend.folder("routes");
      const controllers = backend.folder("controllers");
      const models = backend.folder("models");
      const middleware = backend.folder("middleware");
      const validation = backend.folder("validation");

      result.backend.routes.forEach(f => routes?.file(f.name, f.code));
      result.backend.controllers.forEach(f => controllers?.file(f.name, f.code));
      result.backend.models.forEach(f => models?.file(f.name, f.code));
      result.backend.middleware.forEach(f => middleware?.file(f.name, f.code));
      result.backend.validation.forEach(f => validation?.file(f.name, f.code));
      
      backend.file("package.json", JSON.stringify({
        name: `${result.projectName.toLowerCase().replace(/\s+/g, "-")}-backend`,
        version: "1.0.0",
        dependencies: result.dependencies.backend.reduce((acc, dep) => ({ ...acc, [dep]: "latest" }), {})
      }, null, 2));
    }

    // Frontend Files
    if (frontend) {
      const components = frontend.folder("components");
      result.frontend.components.forEach(f => components?.file(f.name, f.code));
      
      frontend.file("package.json", JSON.stringify({
        name: `${result.projectName.toLowerCase().replace(/\s+/g, "-")}-frontend`,
        version: "1.0.0",
        dependencies: result.dependencies.frontend.reduce((acc, dep) => ({ ...acc, [dep]: "latest" }), {})
      }, null, 2));
    }

    // Root Readme
    zip.file("README.md", `# ${result.projectName}\n\nGenerated by AI SaaS Builder.\n\n## Getting Started\n\nFollow the instructions in the "Getting Started" tab of the builder.`);
    
    // Include the full JSON configuration
    zip.file("project-config.json", JSON.stringify(result, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${result.projectName.toLowerCase().replace(/\s+/g, "-")}-project.zip`);
    toast.success("Project ZIP downloaded successfully!");
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.projectName.toLowerCase().replace(/\s+/g, "-")}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Project configuration downloaded");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-orange-500/30">
      <Toaster position="top-center" richColors />
      
      {/* Background Grid Effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="fixed inset-0 bg-radial-gradient(circle_at_50%_50%,rgba(242,125,38,0.05),transparent_50%) pointer-events-none" />

      <header className="relative border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(242,125,38,0.3)]">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              AI SaaS Builder
            </h1>
            {isOffline && (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1 py-0 px-2 text-[10px]">
                <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                Offline
              </Badge>
            )}
            <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/5 ml-2">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 mr-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-orange-500 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      user.email?.[0].toUpperCase()
                    )}
                  </div>
                  <span className="text-sm text-zinc-400 hidden md:inline-block">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-12">
        {!user ? (
          <AuthPage onAuthSuccess={() => {}} />
        ) : (
          <div className="flex flex-col gap-12 w-full min-w-0 max-w-5xl mx-auto">
            <div className="space-y-8 w-full min-w-0">
              <div className="space-y-4 text-center">
                <h2 className="text-4xl font-bold tracking-tight lg:text-6xl">
                  Generate your next <span className="text-orange-500 italic">SaaS</span> in seconds.
                </h2>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Describe your application architecture, features, and requirements. 
                  Our AI will generate a production-ready MERN stack structure for you.
                </p>
              </div>

              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl overflow-hidden border-t-orange-500/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Prompt Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="e.g., Build a Task Management SaaS with team collaboration, project boards, and Stripe integration..."
                    className={`h-14 bg-black/50 border-zinc-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-lg text-zinc-100 pl-4 pr-32 transition-colors ${
                      prompt.length > MAX_PROMPT_LENGTH ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""
                    }`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  />
                  <div className="absolute right-32 top-1/2 -translate-y-1/2 px-3 border-r border-zinc-800 hidden sm:block">
                    <span className={`text-[10px] font-mono ${prompt.length > MAX_PROMPT_LENGTH ? "text-rose-500" : "text-zinc-500"}`}>
                      {prompt.length}/{MAX_PROMPT_LENGTH}
                    </span>
                  </div>
                  <Button 
                    className="absolute right-2 top-2 h-10 bg-orange-500 hover:bg-orange-600 text-black font-semibold shadow-[0_0_15px_rgba(242,125,38,0.4)] transition-all active:scale-95 disabled:opacity-50"
                    onClick={handleGenerate}
                    disabled={loading || prompt.length > MAX_PROMPT_LENGTH}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Generate
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    <Sparkles className="w-3 h-3" />
                    Example Prompts
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Task Management SaaS with team collaboration and Stripe",
                      "E-commerce platform with inventory and analytics",
                      "Social media scheduler with post analytics",
                      "Real-time chat app with channels and file sharing"
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/30 border border-zinc-800 hover:border-orange-500/30 hover:bg-orange-500/5 text-zinc-400 hover:text-orange-500 transition-all text-left"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                  <div className="text-xl font-bold text-white animate-pulse min-h-[30px] text-center px-4">
                    {loadingMessages[loadingMessageIndex]}
                  </div>
                  <p className="text-zinc-400 text-sm">Drafting full codebase architecture...</p>
                </motion.div>
              )}

              {result ? (
                <motion.div
                  key="result"
                  id="generation-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12 w-full min-w-0 scroll-mt-24"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md sticky top-24 z-40 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Sparkles className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-zinc-100">{result.projectName}</h3>
                        <p className="text-sm text-zinc-500">Generated Architecture</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-orange-500/30 bg-orange-500/5 text-orange-500 hover:bg-orange-500/10" 
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save to Library
                      </Button>
                      <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900/50" onClick={downloadJSON}>
                        Download JSON
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-orange-500"
                        onClick={() => {
                          if (result) {
                            copyToClipboard(JSON.stringify(result, null, 2), "header-json");
                          }
                        }}
                      >
                        {copied === "header-json" ? (
                          <><Check className="w-4 h-4 mr-2 text-emerald-500" /> Copied JSON</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" /> Copy JSON</>
                        )}
                      </Button>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold" onClick={downloadProjectZip}>
                        Download Project ZIP
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="backend" className="w-full min-w-0">
                    <div className="flex justify-center mb-8">
                      <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 h-12 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex-nowrap max-w-full">
                        <TabsTrigger value="backend" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          Backend
                        </TabsTrigger>
                        <TabsTrigger value="database" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Database
                        </TabsTrigger>
                        <TabsTrigger value="frontend" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <Layout className="w-4 h-4" />
                          Frontend
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Live Preview
                        </TabsTrigger>
                        <TabsTrigger value="guide" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          Getting Started
                        </TabsTrigger>
                        <TabsTrigger value="raw" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 shrink-0 px-6 flex items-center gap-2">
                          <FileJson className="w-4 h-4" />
                          Raw JSON
                        </TabsTrigger>
                      </TabsList>
                    </div>

                      <TabsContent value="preview" className="mt-6 w-full min-w-0">
                        <Card className="border-zinc-800 bg-zinc-900/50 p-8">
                          <div className="mb-8 space-y-2">
                            <h3 className="text-xl font-bold text-zinc-200">Interactive Task Board</h3>
                            <p className="text-sm text-zinc-500">A live preview of the generated frontend components with real-time state management.</p>
                          </div>
                          <TaskBoard />
                        </Card>
                      </TabsContent>

                    <TabsContent value="backend" className="mt-6 space-y-6 w-full min-w-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                              <Terminal className="w-4 h-4" />
                              Project Structure
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs font-mono text-orange-500 font-semibold mb-1">backend/</div>
                                <div className="pl-3 space-y-1">
                                  {result.structure.backend.map(s => (
                                    <div key={s} className="text-[11px] font-mono text-zinc-400">{s}</div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-mono text-orange-500 font-semibold mb-1">frontend/</div>
                                <div className="pl-3 space-y-1">
                                  {result.structure.frontend.map(s => (
                                    <div key={s} className="text-[11px] font-mono text-zinc-400">{s}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                              <Cpu className="w-4 h-4" />
                              Workspace Dependencies
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-bold">Backend Modules</div>
                              <div className="flex flex-wrap gap-1.5">
                                {result.dependencies.backend.map(d => (
                                  <Badge key={d} variant="secondary" className="bg-zinc-800 text-zinc-300 text-[10px]">{d}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-bold">Frontend Libraries</div>
                              <div className="flex flex-wrap gap-1.5">
                                {result.dependencies.frontend.map(d => (
                                  <Badge key={d} variant="secondary" className="bg-zinc-800 text-zinc-300 text-[10px]">{d}</Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <ModularIdeView result={result} moduleType="backend" />
                    </TabsContent>

                    <TabsContent value="database" className="mt-6 w-full min-w-0">
                      <ModularIdeView result={result} moduleType="database" />
                    </TabsContent>

                    <TabsContent value="frontend" className="mt-6 w-full min-w-0 font-sans">
                      <ModularIdeView result={result} moduleType="frontend" />
                    </TabsContent>

                    <TabsContent value="guide" className="mt-6 w-full min-w-0">
                      <div className="grid gap-6">
                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader>
                            <CardTitle className="text-orange-500 flex items-center gap-2">
                              <Database className="w-5 h-5" />
                              Step 0: Database Setup (MongoDB Atlas)
                            </CardTitle>
                            <CardDescription>Configure your cloud database before deploying</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-400">
                              <li>Sign up at <span className="text-zinc-200">mongodb.com/atlas</span> and create a free cluster.</li>
                              <li>Go to <span className="text-zinc-200">Network Access</span> and click "Add IP Address". Select "Allow Access from Anywhere" (0.0.0.0/0) for Render compatibility.</li>
                              <li>Go to <span className="text-zinc-200">Database Access</span> and create a database user with a password.</li>
                              <li>Click <span className="text-zinc-200">Connect</span> {"->"} "Drivers" {"->"} "Node.js" to get your connection string.</li>
                              <li>Replace <code className="text-orange-500">&lt;password&gt;</code> with your user password in the string.</li>
                            </ol>
                          </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader>
                            <CardTitle className="text-orange-500 flex items-center gap-2">
                              <Server className="w-5 h-5" />
                              Step 1: Backend Deployment (Render)
                            </CardTitle>
                            <CardDescription>Deploy your Express API to Render.com</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-400">
                              <li>Create a new <span className="text-zinc-200">Web Service</span> on Render and connect your GitHub repo.</li>
                              <li>If your backend is in a subfolder, set the <span className="text-zinc-200">Root Directory</span> (e.g., <code className="text-orange-500">backend</code>).</li>
                              <li>Set <span className="text-zinc-200">Environment</span> to <code className="bg-black px-1 rounded text-orange-500">Node</code>.</li>
                              <li>
                                Configure the build and start commands:
                                <div className="mt-2 bg-black p-3 rounded font-mono text-xs space-y-1">
                                  <div className="flex justify-between"><span className="text-zinc-500">Build Command:</span> <span>npm install</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-500">Start Command:</span> <span>node server.js</span></div>
                                </div>
                              </li>
                              <li>
                                Add <span className="text-zinc-200">Environment Variables</span> in the "Env" tab:
                                <div className="mt-2 bg-black p-3 rounded font-mono text-xs space-y-1">
                                  <div className="flex justify-between"><span className="text-zinc-500">MONGODB_URI:</span> <span>your_atlas_connection_string</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-500">PORT:</span> <span>10000</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-500">NODE_ENV:</span> <span>production</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-500">CORS_ORIGIN:</span> <span>https://your-vercel-app.vercel.app</span></div>
                                </div>
                              </li>
                            </ol>
                          </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader>
                            <CardTitle className="text-orange-500 flex items-center gap-2">
                              <Layout className="w-5 h-5" />
                              Step 2: Frontend Deployment (Vercel)
                            </CardTitle>
                            <CardDescription>Deploy your React application to Vercel.com</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-400">
                              <li>Import your project from GitHub into <span className="text-zinc-200">Vercel</span>.</li>
                              <li>If your frontend is in a subfolder, set the <span className="text-zinc-200">Root Directory</span> (e.g., <code className="text-orange-500">frontend</code>).</li>
                              <li>Vercel will detect <span className="text-zinc-200">Vite</span>. Verify the settings:
                                <div className="mt-2 bg-black p-3 rounded font-mono text-xs space-y-1">
                                  <div className="flex justify-between"><span className="text-zinc-500">Build Command:</span> <span>npm run build</span></div>
                                  <div className="flex justify-between"><span className="text-zinc-500">Output Directory:</span> <span>dist</span></div>
                                </div>
                              </li>
                              <li>
                                Add <span className="text-zinc-200">Environment Variables</span>:
                                <div className="mt-2 bg-black p-3 rounded font-mono text-xs space-y-1">
                                  <div className="flex justify-between"><span className="text-zinc-500">VITE_API_URL:</span> <span>https://your-render-app.onrender.com</span></div>
                                </div>
                              </li>
                              <li>Click <span className="text-zinc-200 font-semibold">Deploy</span>. Once finished, update the <code className="text-orange-500">CORS_ORIGIN</code> on Render with your new Vercel URL.</li>
                            </ol>
                          </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900/50">
                          <CardHeader>
                            <CardTitle className="text-orange-500 flex items-center gap-2">
                              <Terminal className="w-5 h-5" />
                              Step 3: Local Development
                            </CardTitle>
                            <CardDescription>Run the project on your machine</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Install Dependencies</p>
                              <div className="bg-black p-3 rounded font-mono text-xs text-zinc-400">
                                # Backend<br />
                                cd backend && npm install {result.dependencies.backend.join(" ")}<br /><br />
                                # Frontend<br />
                                cd frontend && npm install {result.dependencies.frontend.join(" ")}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Start Development Servers</p>
                              <div className="bg-black p-3 rounded font-mono text-xs text-zinc-400">
                                # Backend (runs on port 5000)<br />
                                npm run dev<br /><br />
                                # Frontend (runs on port 5173)<br />
                                npm run dev
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="raw" className="mt-6 w-full min-w-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-zinc-200">Raw Project Configuration</h4>
                            <p className="text-xs text-zinc-500">The complete JSON structure used to generate this application.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-orange-500"
                            onClick={downloadJSON}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download JSON
                          </Button>
                        </div>
                        <CodeSection 
                          title="Configuration Data" 
                          items={[{ name: "project-config.json", code: JSON.stringify(result, null, 2) }]} 
                          icon={<FileJson className="w-4 h-4" />} 
                          copyToClipboard={copyToClipboard}
                          copied={copied}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid md:grid-cols-2 gap-6"
                >
                  <Card className="border-zinc-800 bg-zinc-900/50 p-8 flex flex-col items-center text-center justify-center space-y-4 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Ready to build?</h3>
                      <p className="text-sm text-zinc-500 max-w-[250px]">
                        Enter a prompt above to generate your production-ready MERN stack application.
                      </p>
                    </div>
                  </Card>
                  
                  {history.length > 0 ? (
                    <Card className="border-zinc-800 bg-zinc-900/50 p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <History className="w-5 h-5 text-orange-500" />
                          Your Library
                        </h3>
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                          {history.length} Projects
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {history.slice(0, 4).map(item => (
                          <div 
                            key={item.id}
                            onClick={() => setResult(item.config)}
                            className="p-4 rounded-xl bg-black/30 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/30 transition-all cursor-pointer group flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold group-hover:text-orange-500 transition-colors">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
                              </span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                          </div>
                        ))}
                        {history.length > 4 && (
                          <p className="text-[10px] text-zinc-600 text-center pt-2">
                            + {history.length - 4} more in your history
                          </p>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-zinc-800 bg-zinc-900/50 p-8 flex flex-col items-center text-center justify-center space-y-4 border-dashed">
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Database className="w-8 h-8 text-zinc-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-zinc-500">No projects yet</h3>
                        <p className="text-sm text-zinc-600 max-w-[200px]">
                          Your generated applications will appear here for quick access.
                        </p>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid md:grid-cols-2 gap-8 mt-12 pt-12 border-t border-zinc-800">
              {history.length > 0 && (
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-4 h-4 text-orange-500" />
                        Recent Generations
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                          confirmClear ? "text-rose-500 hover:text-rose-600" : "text-zinc-500 hover:text-rose-500"
                        }`}
                        onClick={handleClearHistory}
                      >
                        {confirmClear ? "Confirm Clear?" : "Clear All"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            className="group relative flex items-center gap-2 p-3 rounded-xl hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
                            onClick={() => setResult(item.config)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-zinc-200 truncate font-medium group-hover:text-orange-500 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                {item.config.dependencies.backend.length + item.config.dependencies.frontend.length} deps
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-[10px] uppercase font-bold transition-colors ${
                                  confirmDeleteId === item.id ? "text-rose-500 hover:text-rose-600" : "text-zinc-500 hover:text-rose-500"
                                }`}
                                onClick={(e) => handleDeleteProject(e, item.id)}
                              >
                                {confirmDeleteId === item.id ? "Confirm?" : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                              <ChevronRight className="w-4 h-4 text-zinc-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                  <CardDescription>Real-time AI processing metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-sm text-zinc-400">Model</span>
                    <span className="text-sm font-mono text-orange-500">gemini-1.5-pro</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-sm text-zinc-400">Latency</span>
                    <span className="text-sm font-mono text-zinc-200">~2.4s</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-zinc-400">Status</span>
                    <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Operational
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>

      <footer className="border-t border-zinc-800/50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}

function CodeSection({ title, items, icon, copyToClipboard, copied }: { 
  title: string; 
  items: { name: string; code: string }[]; 
  icon: React.ReactNode;
  copyToClipboard: (text: string, id: string) => void;
  copied: string | null;
}) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [fullScreenItem, setFullScreenItem] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'tsx' || ext === 'ts') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'css') return 'css';
    if (ext === 'json') return 'json';
    return 'typescript';
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-zinc-400 font-medium">
          {icon}
          {title}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[10px] uppercase tracking-wider font-bold text-zinc-500 hover:text-orange-500"
          onClick={() => {
            const allCode = items.map(i => `// ${i.name}\n${i.code}`).join('\n\n');
            copyToClipboard(allCode, `${title}-all`);
          }}
        >
          {copied === `${title}-all` ? (
            <><Check className="w-3 h-3 mr-1.5 text-emerald-500" /> Copied All</>
          ) : (
            <><Copy className="w-3 h-3 mr-1.5" /> Copy All</>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 w-full">
        {items.map((item, idx) => {
          const isExpanded = expandedItems[idx];
          const language = getLanguage(item.name);
          const copyId = `${title}-${idx}`;
          
          return (
            <Card key={idx} className="relative border-zinc-800 bg-black/40 overflow-hidden transition-all duration-300 w-full min-w-0">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-400">{item.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase border-zinc-700 text-zinc-500 h-4 px-1">
                    {language}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                    onClick={() => {
                      const blob = new Blob([item.code], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = item.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(`Downloaded ${item.name}`);
                    }}
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                    onClick={() => setFullScreenItem(fullScreenItem === idx ? null : idx)}
                    title={fullScreenItem === idx ? "Exit Full Screen" : "Full Screen"}
                  >
                    {fullScreenItem === idx ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                    onClick={() => toggleExpand(idx)}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold transition-all ${
                      copied === copyId ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 hover:text-white"
                    }`}
                    onClick={() => copyToClipboard(item.code, copyId)}
                  >
                    {copied === copyId ? (
                      <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </div>
              <div className={`${fullScreenItem === idx ? "fixed inset-0 z-[100] bg-zinc-950 p-6" : isExpanded ? "h-auto max-h-[1200px]" : "h-[320px]"} w-full overflow-auto transition-all duration-300 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent`}>
                {fullScreenItem === idx && (
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-zinc-200">{item.name}</span>
                      <Badge variant="outline" className="text-xs uppercase border-zinc-700 text-zinc-500">
                        {language}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-zinc-800 bg-zinc-900"
                      onClick={() => setFullScreenItem(null)}
                    >
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Exit Full Screen
                    </Button>
                  </div>
                )}
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  wrapLongLines={true}
                  customStyle={{
                    margin: 0,
                    padding: fullScreenItem === idx ? "2rem" : "2rem",
                    background: "transparent",
                    fontSize: fullScreenItem === idx ? "18px" : "15px",
                    lineHeight: "1.8",
                    width: "100%",
                    minHeight: "100%",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'var(--font-mono)',
                      width: '100%',
                      display: 'block'
                    }
                  }}
                >
                  {item.code || `// No code generated for ${item.name}`}
                </SyntaxHighlighter>
              </div>
              {!isExpanded && item.code.split('\n').length > 8 && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2 cursor-pointer group"
                  onClick={() => toggleExpand(idx)}
                >
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 flex items-center gap-1">
                    Show more <ChevronDown className="w-3 h-3" />
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
