'use client';

import { Check, CheckCheck, Clock } from 'lucide-react';
import type { Email } from '@/app/inbox/page';
import { cn } from '@/lib/utils';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function ReadReceiptIcon({ status }: { status: Email['readReceiptStatus'] }) {
  switch (status) {
    case 'read':
      return (
        <span title="Read">
          <CheckCheck 
            className="h-4 w-4 text-primary" 
          />
        </span>
      );
    case 'unread':
      return (
        <span title="Sent (unread)">
          <Check 
            className="h-4 w-4 text-muted-foreground" 
          />
        </span>
      );
    case 'pending':
      return (
        <span title="Pending">
          <Clock 
            className="h-4 w-4 text-muted-foreground" 
          />
        </span>
      );
  }
}

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const isUnread = email.readReceiptStatus === 'unread';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border hover:bg-accent transition-colors',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <ReadReceiptIcon status={email.readReceiptStatus} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold' : 'font-medium',
              isSelected && 'text-foreground'
            )}>
              {email.recipient}
            </p>
            <span className={cn(
              'text-xs flex-shrink-0',
              isSelected ? 'text-foreground/70' : 'text-muted-foreground'
            )}>
              {formatDate(email.sentAt)}
            </span>
          </div>
          <p className={cn(
            'text-sm truncate',
            isUnread ? 'font-semibold' : 'font-normal',
            isSelected ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {email.subject}
          </p>
        </div>
      </div>
    </button>
  );
}

