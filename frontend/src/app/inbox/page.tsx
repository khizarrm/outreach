'use client';

import { EmailList } from '@/components/inbox/email-list';
import { EmailDetail } from '@/components/inbox/email-detail';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Email {
  id: string;
  subject: string;
  recipient: string;
  recipientEmail: string;
  sentAt: Date;
  readAt: Date | null;
  readReceiptStatus: 'read' | 'unread' | 'pending';
  body: string;
}

export default function InboxPage() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        {selectedEmailId && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSelectedEmailId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to list</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold">Inbox</h1>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Email List - hidden on mobile when email is selected */}
          <div className={`
            flex-1 border-r border-border overflow-hidden flex flex-col
            ${selectedEmailId ? 'hidden md:flex' : 'flex'}
          `}>
            <EmailList 
              selectedEmailId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
            />
          </div>
          {/* Email Detail - full width on mobile when selected */}
          <div className={`
            overflow-hidden
            ${selectedEmailId ? 'flex-1 flex' : 'hidden md:flex md:flex-1'}
          `}>
            {selectedEmailId ? (
              <EmailDetail emailId={selectedEmailId} />
            ) : (
              <div className="hidden md:flex items-center justify-center w-full h-full text-muted-foreground">
                <p>Select an email to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

