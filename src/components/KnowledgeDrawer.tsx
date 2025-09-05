import React from 'react';
import { HelpCircle, Book, FileText, AlertTriangle, Wrench } from 'lucide-react';
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

type Tone = 'red' | 'violet' | 'cyan';

const toneClasses: Record<Tone, { badge: string; icon: string; heading: string; border: string }> = {
  red:    { badge: 'bg-red-50 ring-1 ring-red-100',    icon: 'text-red-600',    heading: 'text-gray-900', border: 'border-red-100' },
  violet: { badge: 'bg-violet-50 ring-1 ring-violet-100', icon: 'text-violet-600', heading: 'text-gray-900', border: 'border-violet-100' },
  cyan:   { badge: 'bg-cyan-50 ring-1 ring-cyan-100',  icon: 'text-cyan-600',   heading: 'text-gray-900', border: 'border-cyan-100' },
};

const knowledgeBase: Array<{
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  content: string[];
}> = [
  {
    tone: 'red',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Alert Management',
    content: [
      'Critical alerts require immediate attention and acknowledgment',
      'Warning alerts should be reviewed within 15 minutes',
      'Info alerts are for reference and can be reviewed later',
      'Always check Knowledge SOPs when available',
    ],
  },
  {
    tone: 'violet',
    icon: <FileText className="w-4 h-4" />,
    title: 'Standard Operating Procedures',
    content: [
      'Follow SOPs step-by-step for consistent incident handling',
      'Mark completed steps to track progress',
      'SOPs are role-specific and contain essential procedures',
      'Document any deviations from standard procedures',
    ],
  },
  {
    tone: 'cyan',
    icon: <Wrench className="w-4 h-4" />,
    title: 'System Operations',
    content: [
      'Use the Retail lens to filter views by retail locations',
      'Export functions respect active filters',
      'All data is updated in real-time',
      'Notifications appear as toasts and in the bell inbox',
    ],
  },
];

const KnowledgeDrawer: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          aria-label="Open Knowledge Center"
        >
          <HelpCircle className="w-4 h-4" />
          Help
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-white text-gray-900 border border-gray-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Book className="w-5 h-5" />
            Knowledge Center
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-5 pr-2">
            {knowledgeBase.map((section, index) => {
              const t = toneClasses[section.tone];
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${t.badge}`}>
                      <span className={t.icon}>{section.icon}</span>
                    </span>
                    <span className={`font-semibold ${t.heading}`}>{section.title}</span>
                  </div>

                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1">
                    {section.content.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  {index < knowledgeBase.length - 1 && <Separator className="my-3" />}
                </div>
              );
            })}

            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-sky-50 ring-1 ring-sky-100">
                  <Book className="w-4 h-4 text-sky-600" />
                </span>
                <span className="font-semibold text-gray-900">Quick Tips</span>
              </div>

              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1">
                <li>Keyboard shortcuts: <span className="font-medium">Ctrl+K</span> to search, <span className="font-medium">Esc</span> to close dialogs</li>
                <li>All timestamps show <span className="font-medium">local time</span></li>
                <li>Click notification toasts to jump to relevant sections</li>
                <li>System status indicators reflect real-time connectivity</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeDrawer;
