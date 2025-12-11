'use client';

import { useState, useMemo } from 'react';
import { EmailListItem } from './email-list-item';
import type { Email } from '@/app/inbox/page';

// Demo data
const generateDemoEmails = (): Email[] => {
  const now = new Date();
  return [
    {
      id: '1',
      subject: 'Quick chat about Winter internship opportunities',
      recipient: 'Haz Hubble',
      recipientEmail: 'haz@bubble.com',
      sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hey Haz,\n\nI remember using Pally AI for relationship management a while back, love the UI and UX. Can\'t wait to see what other things you guys have in store.\n\nI\'ve been building for fun for ~2 years (thirdspace 1.3k + users, passr 40+), quite good with building end to end products.\n\nIf you\'re open, I\'d love a quick chat about potential internship opportunities for Winter.\n\nBest,\n\nKhizar\n\nwebsite: https://khizarmalik.com/\n\nlinkedin: https://www.linkedin.com/in/khizar--malik/\n\ntwitter: https://x.com/khizar_mm',
    },
    {
      id: '2',
      subject: 'Introduction and Partnership Opportunity',
      recipient: 'Michael Rodriguez',
      recipientEmail: 'm.rodriguez@techcorp.com',
      sentAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hello Michael,\n\nI hope this email finds you well. I wanted to introduce myself and discuss a potential partnership opportunity that I believe could be mutually beneficial.\n\nWould you be open to a brief call this week?\n\nLooking forward to hearing from you.',
    },
    {
      id: '3',
      subject: 'Thank you for your time',
      recipient: 'Emily Johnson',
      recipientEmail: 'emily.j@startup.io',
      sentAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Emily,\n\nThank you for taking the time to speak with me yesterday. I really enjoyed our conversation and I\'m excited about the potential collaboration.\n\nAs discussed, I\'ll send over the proposal by end of week.\n\nBest,\n',
    },
    {
      id: '4',
      subject: 'Quick question about your services',
      recipient: 'David Kim',
      recipientEmail: 'david.kim@company.com',
      sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'pending',
      body: 'Hi David,\n\nI have a quick question about your services. Could you provide more information about your pricing structure?\n\nThanks in advance!',
    },
    {
      id: '5',
      subject: 'Re: Project Proposal',
      recipient: 'Lisa Anderson',
      recipientEmail: 'lisa.a@business.com',
      sentAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Lisa,\n\nFollowing up on the project proposal we discussed. I\'ve attached the detailed document for your review.\n\nPlease let me know if you have any questions.\n\nBest regards',
    },
    {
      id: '6',
      subject: 'Networking Event Invitation',
      recipient: 'James Wilson',
      recipientEmail: 'j.wilson@network.org',
      sentAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hello James,\n\nI wanted to invite you to an upcoming networking event that I think you might find interesting. It\'s scheduled for next month.\n\nWould you like more details?',
    },
    {
      id: '7',
      subject: 'Product Demo Request',
      recipient: 'Alexandra Martinez',
      recipientEmail: 'a.martinez@enterprise.com',
      sentAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Alexandra,\n\nI wanted to reach out and see if you\'d be interested in a product demo. I think our solution could really help streamline your workflow.\n\nLet me know when would be a good time.\n\nBest regards',
    },
    {
      id: '8',
      subject: 'Re: Meeting Follow-up',
      recipient: 'Robert Taylor',
      recipientEmail: 'r.taylor@corp.com',
      sentAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hi Robert,\n\nFollowing up on our meeting last week. I wanted to share the resources we discussed.\n\nPlease let me know if you have any questions.\n\nBest,\n',
    },
    {
      id: '9',
      subject: 'Partnership Discussion',
      recipient: 'Maria Garcia',
      recipientEmail: 'maria.g@innovate.io',
      sentAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hello Maria,\n\nI wanted to discuss a potential partnership opportunity. I think there\'s great synergy between our companies.\n\nWould you be available for a call this week?\n\nLooking forward to hearing from you.',
    },
    {
      id: '10',
      subject: 'Thank You Note',
      recipient: 'Christopher Lee',
      recipientEmail: 'chris.lee@startup.com',
      sentAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'pending',
      body: 'Hi Christopher,\n\nThank you for taking the time to meet with me. I really appreciate your insights and feedback.\n\nI\'ll follow up with the next steps soon.\n\nBest regards',
    },
    {
      id: '11',
      subject: 'Re: Pricing Inquiry',
      recipient: 'Jennifer Brown',
      recipientEmail: 'j.brown@business.com',
      sentAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Jennifer,\n\nThank you for your interest in our services. I\'ve attached our pricing information and would be happy to discuss any questions you might have.\n\nBest regards',
    },
    {
      id: '12',
      subject: 'Introduction Email',
      recipient: 'Daniel White',
      recipientEmail: 'daniel.w@tech.com',
      sentAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hello Daniel,\n\nI wanted to introduce myself and our company. I think there might be an opportunity for collaboration.\n\nWould you be open to a brief conversation?\n\nBest,\n',
    },
    {
      id: '13',
      subject: 'Re: Contract Review',
      recipient: 'Patricia Davis',
      recipientEmail: 'p.davis@legal.com',
      sentAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Patricia,\n\nI wanted to follow up on the contract we discussed. I\'ve made the revisions you requested.\n\nPlease review and let me know if you need any changes.\n\nBest regards',
    },
    {
      id: '14',
      subject: 'Event Invitation',
      recipient: 'Thomas Miller',
      recipientEmail: 't.miller@events.com',
      sentAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hello Thomas,\n\nI wanted to invite you to an upcoming industry event. I think you\'d find it valuable.\n\nLet me know if you\'re interested in attending.\n\nBest,\n',
    },
    {
      id: '15',
      subject: 'Re: Proposal Feedback',
      recipient: 'Nancy Wilson',
      recipientEmail: 'nancy.w@consulting.com',
      sentAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Nancy,\n\nThank you for the feedback on our proposal. I\'ve incorporated your suggestions and updated the document.\n\nPlease let me know if you have any other thoughts.\n\nBest regards',
    },
    {
      id: '16',
      subject: 'Quick Check-in',
      recipient: 'Kevin Moore',
      recipientEmail: 'kevin.m@startup.io',
      sentAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'pending',
      body: 'Hi Kevin,\n\nJust wanted to check in and see how things are going. I hope everything is progressing well.\n\nLet me know if you need anything.\n\nBest,\n',
    },
    {
      id: '17',
      subject: 'Re: Next Steps',
      recipient: 'Amanda Jackson',
      recipientEmail: 'amanda.j@corp.com',
      sentAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Amanda,\n\nFollowing up on our conversation. Here are the next steps we discussed.\n\nPlease review and let me know if you have any questions.\n\nBest regards',
    },
    {
      id: '18',
      subject: 'Partnership Opportunity',
      recipient: 'Ryan Thompson',
      recipientEmail: 'ryan.t@business.com',
      sentAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hello Ryan,\n\nI wanted to discuss a potential partnership opportunity. I think there\'s great potential for collaboration.\n\nWould you be interested in a call?\n\nBest,\n',
    },
    {
      id: '19',
      subject: 'Thank You',
      recipient: 'Stephanie Harris',
      recipientEmail: 'stephanie.h@tech.com',
      sentAt: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      readReceiptStatus: 'read',
      body: 'Hi Stephanie,\n\nThank you for your time and consideration. I really appreciate the opportunity to discuss this with you.\n\nLooking forward to next steps.\n\nBest regards',
    },
    {
      id: '20',
      subject: 'Re: Schedule Meeting',
      recipient: 'Brandon Clark',
      recipientEmail: 'brandon.c@startup.com',
      sentAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      readAt: null,
      readReceiptStatus: 'unread',
      body: 'Hi Brandon,\n\nI wanted to schedule a meeting to discuss the project in more detail.\n\nAre you available next week?\n\nBest,\n',
    },
  ];
};

interface EmailListProps {
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
}

export function EmailList({ selectedEmailId, onSelectEmail }: EmailListProps) {
  const [emails] = useState<Email[]>(generateDemoEmails());

  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }, [emails]);

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No emails sent yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-muted-foreground">
          {emails.length} {emails.length === 1 ? 'email' : 'emails'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedEmails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={() => onSelectEmail(email.id)}
          />
        ))}
      </div>
    </div>
  );
}

