'use client'
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  useEffect(() => {
    // Define the global listener that phone.email will call after successful OTP verification
    (window as any).phoneEmailListener = (userObj: any) => {
      const user_json_url = userObj.user_json_url;
      handlePhoneLogin(user_json_url);
    };

    // Dynamically load the phone.email script if not already present
    const scriptId = 'phone-email-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.phone.email/themes/anywhere/js/fetch-with-phone.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Clean up script on unmount (optional but good practice)
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        document.body.removeChild(existingScript);
        delete (window as any).phoneEmailListener;
      }
    };
  }, []);

  const handlePhoneLogin = async (url: string) => {
    const res = await fetch('/api/auth/phone-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_json_url: url }),
    });

    const data = await res.json();
    if (data.success) {
      // Navigate based on whether the user needs onboarding or can go to dashboard
      window.location.href = data.redirectUrl;
    } else {
      alert(data.error || "Login failed");
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-8">Simple Ledger</h1>
      
      <div className="flex flex-col gap-4">
        {/* Google Login */}
        <button 
          onClick={handleGoogleLogin}
          className="px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 flex items-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>

        {/* Phone.email Login Widget */}
        <div className="phone-email-container">
          <div 
            className="pe_signin_button" 
            data-client-id={process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID}
          ></div>
        </div>
      </div>
    </div>
  );
}