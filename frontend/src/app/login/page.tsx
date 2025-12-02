'use client';

import { AuthQuote } from '@/components/auth/auth-quote';
import { SignIn } from '@clerk/nextjs';

/**
 * Login Page
 * Split-screen authentication page with branding and Clerk sign-in
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col lg:grid lg:grid-cols-2 lg:max-w-none lg:px-0 overflow-hidden">
      <AuthQuote>
        <div className="lg:hidden">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-[#151515] border-[#2a2a2a] shadow-none",
                headerTitle: "text-[#e8e8e8] font-light",
                headerSubtitle: "text-[#6a6a6a] font-light",
                socialButtonsBlockButton: "bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] hover:bg-[#1a1a1a]",
                socialButtonsBlockButtonText: "text-[#e8e8e8] font-light",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-light",
                formFieldInput: "bg-[#151515] border-[#2a2a2a] text-[#e8e8e8]",
                formFieldLabel: "text-[#e8e8e8] font-light",
                footerActionLink: "text-blue-400 hover:text-blue-300",
              },
            }}
          />
        </div>
      </AuthQuote>
      <div className="hidden lg:flex lg:p-8 items-center justify-center bg-[#0a0a0a] min-h-screen">
        <div className="w-full max-w-md">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-[#151515] border-[#2a2a2a] shadow-none",
                headerTitle: "text-[#e8e8e8] font-light",
                headerSubtitle: "text-[#6a6a6a] font-light",
                socialButtonsBlockButton: "bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] hover:bg-[#1a1a1a]",
                socialButtonsBlockButtonText: "text-[#e8e8e8] font-light",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-light",
                formFieldInput: "bg-[#151515] border-[#2a2a2a] text-[#e8e8e8]",
                formFieldLabel: "text-[#e8e8e8] font-light",
                footerActionLink: "text-blue-400 hover:text-blue-300",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

