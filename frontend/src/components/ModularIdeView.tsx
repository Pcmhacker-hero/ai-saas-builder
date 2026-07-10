import { useState, useEffect, useMemo } from "react";
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileJson, 
  Copy, 
  Check, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  Cpu,
  Bookmark,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { type GeneratedApp } from "@/lib/gemini";

interface VirtualFile {
  name: string;
  path: string;
  folder: string;
  code: string;
}

interface ModularIdeViewProps {
  result: GeneratedApp;
  moduleType: "backend" | "database" | "frontend";
}

export function ModularIdeView({ result, moduleType }: ModularIdeViewProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    middleware: true,
    validation: true,
    routes: true,
    controllers: true,
    models: true,
    collections: true,
    components: true
  });

  // Map generated code structure to flat virtual files
  const files = useMemo(() => {
    const list: VirtualFile[] = [];

    if (moduleType === "backend") {
      if (result.backend.middleware) {
        result.backend.middleware.forEach(f => {
          list.push({ name: f.name, path: `middleware/${f.name}`, folder: "middleware", code: f.code });
        });
      }
      if (result.backend.validation) {
        result.backend.validation.forEach(f => {
          list.push({ name: f.name, path: `validation/${f.name}`, folder: "validation", code: f.code });
        });
      }
      if (result.backend.routes) {
        result.backend.routes.forEach(f => {
          list.push({ name: f.name, path: `routes/${f.name}`, folder: "routes", code: f.code });
        });
      }
      if (result.backend.controllers) {
        result.backend.controllers.forEach(f => {
          list.push({ name: f.name, path: `controllers/${f.name}`, folder: "controllers", code: f.code });
        });
      }
      if (result.backend.models) {
        result.backend.models.forEach(f => {
          list.push({ name: f.name, path: `models/${f.name}`, folder: "models", code: f.code });
        });
      }
    } else if (moduleType === "database") {
      if (result.database?.collections) {
        result.database.collections.forEach(f => {
          list.push({ 
            name: `${f.name}.schema`, 
            path: `collections/${f.name}.schema`, 
            folder: "collections", 
            code: f.schema 
          });
        });
      }
    } else if (moduleType === "frontend") {
      if (result.frontend?.components) {
        result.frontend.components.forEach(f => {
          list.push({ name: f.name, path: `components/${f.name}`, folder: "components", code: f.code });
        });
      }
    }

    return list;
  }, [result, moduleType]);

  // Set the first file as active file by default
  const [activePath, setActivePath] = useState<string>("");

  useEffect(() => {
    if (files.length > 0) {
      setActivePath(files[0].path);
    } else {
      setActivePath("");
    }
  }, [files]);

  const activeFile = useMemo(() => {
    return files.find(f => f.path === activePath) || null;
  }, [files, activePath]);

  // Folders and their files structure for sidebar
  const folders = useMemo(() => {
    const map: Record<string, VirtualFile[]> = {};
    files.forEach(file => {
      if (!map[file.folder]) {
        map[file.folder] = [];
      }
      map[file.folder].push(file);
    });
    return map;
  }, [files]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const currentLanguage = useMemo(() => {
    if (!activeFile) return "typescript";
    const filename = activeFile.name;
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'tsx' || ext === 'ts') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'css') return 'css';
    if (ext === 'json' || filename.endsWith('schema')) return 'json';
    return 'typescript';
  }, [activeFile]);

  const copyFileToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    toast.success(`Copied content of ${activeFile?.name || "file"}`);
    setTimeout(() => {
      setCopiedPath(null);
    }, 2000);
  };

  const downloadSingleFile = (file: VirtualFile) => {
    const blob = new Blob([file.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${file.name}`);
  };

  const copyEntireModule = () => {
    const combinedCode = files.map(f => `// File: ${moduleType}/${f.path}\n${f.code}`).join("\n\n");
    navigator.clipboard.writeText(combinedCode);
    toast.success(`Copied all ${files.length} code files in this tab!`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Workspace Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Terminal className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200 capitalize">{moduleType} Codebase Workspace</h4>
            <p className="text-xs text-zinc-500">
              Highly structured, production-ready MVC architecture • {files.length} compiled {files.length === 1 ? "file" : "files"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyEntireModule}
          className="border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800 hover:text-orange-500 text-xs w-full sm:w-auto"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy Entire Workspace
        </Button>
      </div>

      {/* Workspace Layout Container */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden min-h-[600px] shadow-2xl">
        
        {/* Sidebar explorer panel */}
        <div className="border-r border-zinc-900 bg-black/40 flex flex-col h-[600px]">
          {/* Sidebar Title */}
          <div className="p-4 border-b border-zinc-900/80 bg-zinc-900/20 flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-500 uppercase">File Explorer</span>
            <Badge variant="outline" className="border-zinc-800 text-zinc-500 font-mono text-[9px] h-4 leading-none">
              v1.0.0
            </Badge>
          </div>

          {/* Directory Tree */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {/* Virtual root path */}
              <div className="flex items-center gap-1.5 px-2 text-xs font-mono text-orange-500 font-bold">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{moduleType}/</span>
              </div>

              <div className="space-y-2 pl-2">
                {Object.keys(folders).map(folderName => {
                  const isExpanded = expandedFolders[folderName];
                  const folderFiles = folders[folderName];

                  return (
                    <div key={folderName} className="space-y-1">
                      {/* Folder Row */}
                      <button
                        onClick={() => toggleFolder(folderName)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-zinc-900/40 rounded text-left transition-colors font-mono text-xs text-zinc-400 group"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-orange-500/80 group-hover:text-orange-400" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                          )}
                          <span className="group-hover:text-zinc-200">{folderName}/</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </button>

                      {/* Folder Contents */}
                      {isExpanded && (
                        <div className="space-y-0.5 border-l border-zinc-900/80 pl-3.5 ml-[7px]">
                          {folderFiles.map(file => {
                            const isFileActive = activePath === file.path;
                            return (
                              <button
                                key={file.path}
                                onClick={() => setActivePath(file.path)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-all font-mono text-xs text-left ${
                                  isFileActive
                                    ? "bg-orange-500/10 text-orange-400 font-medium border-l-2 border-orange-500"
                                    : "text-zinc-500 hover:bg-zinc-900/30 hover:text-zinc-300"
                                }`}
                              >
                                {file.folder === "collections" ? (
                                  <FileJson className={`w-3.5 h-3.5 ${isFileActive ? "text-orange-400" : "text-zinc-600"}`} />
                                ) : (
                                  <FileCode className={`w-3.5 h-3.5 ${isFileActive ? "text-orange-400" : "text-zinc-600"}`} />
                                )}
                                <span className="truncate">{file.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Code editor viewport section */}
        <div className="flex flex-col h-[600px] overflow-hidden bg-[#070707] relative">
          
          {/* Active File Header Status bar */}
          {activeFile ? (
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur">
              <div className="flex items-center gap-3">
                <Breadcrumbs activeFile={activeFile} moduleType={moduleType} />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Download individual file */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                  title="Download Raw File"
                  onClick={() => downloadSingleFile(activeFile)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>

                {/* Copy path */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                  title="Copy File Path"
                  onClick={() => {
                    navigator.clipboard.writeText(`${moduleType}/${activeFile.path}`);
                    toast.success("File path copied!");
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>

                {/* Copy entire code inside this file */}
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 text-xs font-bold font-mono transition-all px-3 ${
                    copiedPath === activeFile.path ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/5"
                  }`}
                  onClick={() => copyFileToClipboard(activeFile.code, activeFile.path)}
                >
                  {copiedPath === activeFile.path ? (
                    <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" /> Copy Code</>
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Mobile Selector Dropdown */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-900 md:hidden block">
            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Active Workspace File:</label>
            <select
              value={activePath}
              onChange={(e) => setActivePath(e.target.value)}
              className="w-full bg-[#111] border border-zinc-800 text-zinc-300 text-xs rounded p-2 focus:border-orange-500/50 focus:outline-none"
            >
              {files.map(f => (
                <option key={f.path} value={f.path}>
                  {moduleType}/{f.path}
                </option>
              ))}
            </select>
          </div>

          {/* Syntax Highlighter code panel */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {activeFile ? (
              <SyntaxHighlighter
                language={currentLanguage}
                style={vscDarkPlus}
                wrapLongLines={true}
                showLineNumbers={true}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  background: "transparent",
                  fontSize: "13px",
                  lineHeight: "1.7",
                  fontFamily: "var(--font-mono)",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: "var(--font-mono)",
                    background: "transparent"
                  }
                }}
              >
                {activeFile.code || `// Empty file: ${activeFile.name}`}
              </SyntaxHighlighter>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 font-mono">
                <FileCode className="w-8 h-8 text-zinc-800 animate-pulse" />
                <span className="text-xs">No active file selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs({ activeFile, moduleType }: { activeFile: VirtualFile, moduleType: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
      <span className="text-zinc-600">{moduleType}</span>
      <span className="text-zinc-800">/</span>
      <span className="text-zinc-500">{activeFile.folder}</span>
      <span className="text-zinc-800">/</span>
      <span className="text-orange-400 font-semibold">{activeFile.name}</span>
      <Badge variant="outline" className="border-orange-500/20 text-orange-500/80 bg-orange-500/5 h-4 px-1 text-[9px] scale-90">
        IDE
      </Badge>
    </div>
  );
}
