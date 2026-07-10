import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { taskSchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Design system architecture', status: 'done', priority: 'high' },
    { id: '2', title: 'Implement authentication flow', status: 'in-progress', priority: 'high' },
    { id: '3', title: 'Setup database schemas', status: 'todo', priority: 'medium' },
    { id: '4', title: 'Create landing page assets', status: 'todo', priority: 'low' },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const addTask = () => {
    const trimmedTitle = newTaskTitle.trim();
    
    try {
      taskSchema.parse({ title: trimmedTitle });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      status: 'todo',
      priority: 'medium'
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  const toggleStatus = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const nextStatus: Task['status'] = 
          task.status === 'todo' ? 'in-progress' : 
          task.status === 'in-progress' ? 'done' : 'todo';
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return <Circle className="w-4 h-4 text-zinc-500" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'done': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input 
          placeholder="Add a new task..." 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="bg-black/40 border-zinc-800 focus:border-orange-500/50"
        />
        <Button onClick={addTask} className="bg-orange-500 hover:bg-orange-600 text-black">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['todo', 'in-progress', 'done'] as const).map((column) => (
          <div key={column} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                {getStatusIcon(column)}
                {column.replace('-', ' ')}
              </h4>
              <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">
                {tasks.filter(t => t.status === column).length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {tasks.filter(t => t.status === column).map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-3 border-zinc-800 bg-black/40 hover:border-zinc-700 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <p className={`text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] px-1.5 h-4 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-zinc-500 hover:text-white"
                            onClick={() => toggleStatus(task.id)}
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-zinc-500 hover:text-rose-500"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
