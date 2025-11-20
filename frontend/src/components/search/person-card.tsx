'use client';

import React, { useState } from 'react';
import { Check, Mail, X, Send } from 'lucide-react';
import type { OrchestratorPerson } from '@/lib/api';
import { protectedApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface PersonCardProps {
  person: OrchestratorPerson;
  favicon?: string | null;
  companyName?: string;
  index: number;
}

export function PersonCard({ person, favicon, companyName, index }: PersonCardProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const hasEmail = person.emails && person.emails.length > 0;
  const targetEmail = hasEmail ? person.emails[0] : null;

  const handleSendEmail = async () => {
    if (!targetEmail) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      await protectedApi.sendEmail({
        to: targetEmail,
        subject: emailSubject,
        body: emailBody
      });
      setSendSuccess(true);
      setTimeout(() => {
        setIsComposing(false);
        setSendSuccess(false);
        setEmailSubject('');
        setEmailBody('');
      }, 2000);
    } catch (error) {
      setSendError((error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <article
        className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col relative"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {/* Favicon - Top Right */}
        {favicon && (
          <div className="absolute top-5 right-5 sm:top-6 sm:right-6 md:top-8 md:right-8">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] p-1.5 sm:p-2 flex items-center justify-center">
              <img
                src={favicon}
                alt={`${companyName} logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Person Info */}
        <div className="mb-5 sm:mb-6 flex-grow pr-12 sm:pr-14 md:pr-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-2 sm:mb-3">
            {person.name}
          </h2>
          {person.role && (
            <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed">
              {person.role}
            </p>
          )}
        </div>

        {/* Email Status & Action */}
        {hasEmail ? (
          <div className="flex items-center gap-3 mt-auto">
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 font-sans font-light tracking-wide">
              <Check className="w-3 h-3" />
              Email Found
            </Badge>
            
            <Button 
              onClick={() => setIsComposing(true)}
              size="sm" 
              className="bg-white text-black hover:bg-gray-200 font-sans font-light tracking-wide"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-sans font-light text-[#4a4a4a] italic">
            No verified emails found
          </p>
        )}
      </article>

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsComposing(false)}
          />
          
          <div className="relative w-full max-w-lg bg-[#151515] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-medium text-white">
                Send Email to {person.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                onClick={() => setIsComposing(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Subject</label>
                <Input
                  placeholder="Enter subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Message</label>
                <Textarea
                  placeholder="Write your message..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[150px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-blue-500 resize-none"
                />
              </div>

              {sendError && (
                <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
                  {sendError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 pt-0 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsComposing(false)}
                className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !emailSubject || !emailBody}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              >
                {isSending ? (
                  "Sending..."
                ) : sendSuccess ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Sent
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> Send
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
