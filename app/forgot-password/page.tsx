"use client";

import { getUserInfo } from "@/utils/getUserInfo";
import Link from "next/link";
import React, { useState, useCallback } from "react";
import SelfQRVerification from "@/components/SelfQRVerification";

interface PasswordValidation {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUppercase: boolean;
}

// Move ValidationCheckItem outside to prevent recreation
const ValidationCheckItem = React.memo(
  ({
    isValid,
    text,
  }: {
    isValid: boolean;
    text: string;
  }): React.JSX.Element => (
    <div
      className={`flex items-center space-x-2 text-xs transition-all duration-300 ${
        isValid ? "text-green-600" : "text-gray-400"
      }`}
    >
      <div
        className={`w-4 h-4 flex items-center justify-center transition-all duration-300 text-xs ${
          isValid
            ? "bg-green-500 text-white animate-scale-in"
            : "border border-gray-300 text-gray-400"
        }`}
      >
        {isValid ? "✓" : ""}
      </div>
      <span className="font-medium tracking-wide">{text}</span>
    </div>
  )
);
ValidationCheckItem.displayName = "ValidationCheckItem";

type AppState =
  | "form"
  | "verification"
  | "passwordReset"
  | "verificationFailed";

function ForgotPassword(): React.JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>("form");
  const [userNullifier, setUserNullifier] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [passwordValidation, setPasswordValidation] =
    useState<PasswordValidation>({
      minLength: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasUppercase: false,
    });

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUsername(value);
    },
    []
  );

  const isFormValid = useCallback((): boolean => {
    return username.length >= 3;
  }, [username]);

  const validatePassword = useCallback(
    (password: string): PasswordValidation => {
      return {
        minLength: password.length >= 8,
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
      };
    },
    []
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewPassword(value);
      setPasswordValidation(validatePassword(value));
    },
    [validatePassword]
  );

  const handleContinueClick = useCallback(async (): Promise<void> => {
    if (isFormValid() && !isLoading) {
      console.log("Continue with password recovery for:", username);
      setIsLoading(true);
      setError(null);

      try {
        const data = await getUserInfo(
          process.env.NEXT_PUBLIC_RPC_URL!,
          username
        );
        console.log(data);

        if (data.nullifier) {
          setUserNullifier(data.nullifier);
          setAppState("verification");
        } else {
          throw new Error("No nullifier found for user");
        }
      } catch (error) {
        console.log("Failed to fetch user info", error);

        // Extract error message after "RPC Error:"
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const rpcErrorMatch = errorMessage.match(/RPC Error:\s*(.+)/);
        const displayError = rpcErrorMatch
          ? rpcErrorMatch[1]
          : "Username doesn't exist";

        setError(`${displayError}. Please try again.`);

        // Auto-dismiss error after 5 seconds
        setTimeout(() => {
          setError(null);
          setUsername("");
        }, 5000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isFormValid, username, isLoading]);

  const handleSelfVerificationSuccess = useCallback(
    async (nullifier: string): Promise<void> => {
      console.log("Self verification successful, nullifier:", nullifier);

      if (nullifier === userNullifier) {
        console.log(nullifier, "nullifier");
        console.log(userNullifier, "user nullifier");
        setAppState("passwordReset");
      } else {
        setAppState("verificationFailed");
      }
    },
    [userNullifier]
  );

  const handleSelfVerificationError = useCallback((errorDetails: any): void => {
    console.error("Self verification error:", errorDetails);
    setAppState("verificationFailed");
  }, []);

  const handleChangePassword = useCallback((): void => {
    if (Object.values(passwordValidation).every(Boolean)) {
      // TODO: Implement password change logic
      console.log(
        "Change password for:",
        username,
        "New password:",
        newPassword
      );
      window.location.href = "/";
    }
  }, [passwordValidation, username, newPassword]);

  const handleTryAgain = useCallback((): void => {
    setAppState("form");
    setUsername("");
    setUserNullifier("");
    setNewPassword("");
    setPasswordValidation({
      minLength: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasUppercase: false,
    });
    setError(null);
  }, []);

  // Self QR Verification State
  if (appState === "verification") {
    return (
      <SelfQRVerification
        onSuccess={handleSelfVerificationSuccess}
        onError={handleSelfVerificationError}
        onBack={() => setAppState("form")}
        title="VERIFY YOUR IDENTITY"
        subtitle="SCAN THIS QR CODE TO RESET PASSWORD"
      />
    );
  }

  // Verification Failed State
  if (appState === "verificationFailed") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white border-2 border-black shadow-2xl">
            {/* Header */}
            <div className="text-center py-12 px-6 border-b-2 border-black">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-500 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">✗</span>
              </div>
              <h1 className="text-black text-3xl font-bold mb-4 tracking-[0.2em]">
                VERIFICATION FAILED
              </h1>
              <p className="text-gray-600 text-sm tracking-widest uppercase">
                Identity Mismatch
              </p>
            </div>

            {/* Error Content */}
            <div className="p-12 text-center space-y-8">
              <div className="space-y-4">
                <p className="text-gray-700 text-base leading-relaxed max-w-2xl mx-auto">
                  This user ID does not belong to this provided identity. Please
                  try again.
                </p>
              </div>

              <div className="space-y-6">
                <button
                  onClick={handleTryAgain}
                  className="px-8 py-4 bg-black text-white font-bold text-sm tracking-[0.15em] uppercase hover:bg-gray-800 transition-all duration-300"
                  type="button"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password Reset State
  if (appState === "passwordReset") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white border-2 border-black shadow-2xl">
            {/* Header */}
            <div className="text-center py-8 px-6 border-b-2 border-black">
              <div className="w-12 h-12 mx-auto mb-4 bg-black flex items-center justify-center">
                <span className="text-white text-xl font-bold">Z</span>
              </div>
              <h1 className="text-black text-2xl font-bold mb-2 tracking-[0.2em]">
                ZENO PROJECT
              </h1>
              <p className="text-gray-600 text-sm tracking-widest">
                RESET PASSWORD
              </p>
            </div>

            {/* Form Fields */}
            <div className="p-8 space-y-6">
              <div className="group">
                <label className="block text-xs font-bold text-black mb-2 tracking-[0.15em] uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-black text-lg placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-300"
                    placeholder="Enter your new password"
                  />
                  {Object.values(passwordValidation).every(Boolean) &&
                    newPassword.length > 0 && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                        <div className="w-6 h-6 bg-green-500 flex items-center justify-center animate-scale-in">
                          <span className="text-white text-xs font-bold">
                            ✓
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200">
                  <p className="text-black text-xs font-bold mb-4 tracking-[0.15em] uppercase">
                    Password Requirements
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <ValidationCheckItem
                      isValid={passwordValidation.minLength}
                      text="8+ characters"
                    />
                    <ValidationCheckItem
                      isValid={passwordValidation.hasUppercase}
                      text="Uppercase"
                    />
                    <ValidationCheckItem
                      isValid={passwordValidation.hasNumber}
                      text="Number"
                    />
                    <ValidationCheckItem
                      isValid={passwordValidation.hasSpecialChar}
                      text="Special char"
                    />
                  </div>
                </div>
              </div>

              {/* Change Password Button */}
              <div className="pt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={!Object.values(passwordValidation).every(Boolean)}
                  className={`w-full py-4 px-6 font-bold text-sm tracking-[0.15em] uppercase transition-all duration-300 ${
                    Object.values(passwordValidation).every(Boolean)
                      ? "bg-black text-white hover:bg-gray-800 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  type="button"
                >
                  Change Password
                </button>
              </div>

              <div className="pt-4 text-center">
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-black transition-all duration-300 tracking-wide underline hover:no-underline"
                >
                  Create New Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Username Form State (default)
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border-2 border-black shadow-2xl">
          {/* Header */}
          <div className="text-center py-8 px-6 border-b-2 border-black">
            <div className="w-12 h-12 mx-auto mb-4 bg-black flex items-center justify-center">
              <span className="text-white text-xl font-bold">Z</span>
            </div>
            <h1 className="text-black text-2xl font-bold mb-2 tracking-[0.2em]">
              ZENO PROJECT
            </h1>
            <p className="text-gray-600 text-sm tracking-widest">
              FORGOT PASSWORD?
            </p>
          </div>

          {/* Form Fields */}
          <div className="p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200">
                <div className="text-center">
                  <div className="text-red-500 text-xl mb-2">⚠</div>
                  <p className="text-red-700 font-bold tracking-wide uppercase text-sm">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-xs font-bold text-black mb-2 tracking-[0.15em] uppercase">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-black text-lg placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-300"
                  placeholder="Enter your username"
                  minLength={3}
                />
                {username.length >= 3 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 bg-green-500 flex items-center justify-center animate-scale-in">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  </div>
                )}
              </div>
              {username.length > 0 && username.length < 3 && (
                <p className="mt-2 text-xs text-red-500 tracking-wide animate-shake">
                  Username must be at least 3 characters
                </p>
              )}
            </div>

            {/* Continue Button */}
            <div className="pt-6">
              <button
                onClick={handleContinueClick}
                disabled={!isFormValid() || isLoading}
                className={`w-full py-4 px-6 font-bold text-sm tracking-[0.15em] uppercase transition-all duration-300 ${
                  isFormValid() && !isLoading
                    ? "bg-black text-white hover:bg-gray-800 cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                type="button"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Loading</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-white animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-white animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  "Continue"
                )}
              </button>
            </div>

            <div className="pt-4 text-center">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-black transition-all duration-300 tracking-wide underline hover:no-underline"
              >
                Create New Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
