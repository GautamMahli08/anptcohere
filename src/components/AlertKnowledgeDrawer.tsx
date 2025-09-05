import React, { useState } from 'react';
import { Book, CheckCircle, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { knowledgeSOPs } from '@/demo/sops';
import { AlertLifecycle } from '@/types/lifecycle';

interface AlertKnowledgeDrawerProps {
  alert: AlertLifecycle;
  onSopUpdate?: (alertId: string, completedSteps: number[]) => void;
  readOnly?: boolean;
}

const AlertKnowledgeDrawer: React.FC<AlertKnowledgeDrawerProps> = ({ 
  alert, 
  onSopUpdate,
  readOnly = false 
}) => {
  const sop = knowledgeSOPs.find(s => s.type === alert.type);
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    alert.sop?.completed || []
  );

  if (!sop) {
    return null;
  }

  const toggleStep = (stepIndex: number) => {
    if (readOnly) return;
    
    const newCompleted = completedSteps.includes(stepIndex)
      ? completedSteps.filter(i => i !== stepIndex)
      : [...completedSteps, stepIndex];
    
    setCompletedSteps(newCompleted);
    onSopUpdate?.(alert.id, newCompleted);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-knowledge">
          <Book className="w-4 h-4 mr-1" />
          SOP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-knowledge" />
            {sop.title}
          </DialogTitle>
        </DialogHeader>
        
        <Separator />
        
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {sop.steps.map((step, index) => {
              const isCompleted = completedSteps.includes(index);
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isCompleted 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-card border-border hover:bg-muted/50'
                  } ${!readOnly ? 'cursor-pointer' : ''}`}
                  onClick={() => toggleStep(index)}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isCompleted ? 'text-success' : 'text-foreground'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="text-xs text-muted-foreground text-center">
          {completedSteps.length} of {sop.steps.length} steps completed
          {readOnly && ' (read-only)'}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertKnowledgeDrawer;