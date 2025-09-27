"use client";

import React, { useState, useCallback, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { generateKey } from "@/utils/keyGeneration";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class SelfErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Self SDK Error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-semibold">Verification Error</h3>
          <p className="text-red-600">
            There was an issue with the verification component. Please refresh
            and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            type="button"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface SelfErrorDetails {
  error_code?: string;
  reason?: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUppercase: boolean;
}

interface FormData {
  username: string;
  password: string;
  zkCommitment: string;
}

type AppState = "form" | "verification" | "loading" | "completed";

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

function VerificationPage(): React.JSX.Element {
  const [userId, setUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppState>("form");
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    zkCommitment: "",
  });
  const [passwordValidation, setPasswordValidation] =
    useState<PasswordValidation>({
      minLength: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasUppercase: false,
    });

  useEffect(() => {
    setUserId(uuidv4());
    setIsClientLoaded(true);
  }, []);

  const scope = "zeno-self-demo";
  const endpoint = "https://nguyet-erythemal-sherlyn.ngrok-free.dev/api/verify";

  const app = React.useMemo(() => {
    if (!userId || !isClientLoaded) return null;

    try {
      return new SelfAppBuilder({
        version: 2,
        appName: "Zeno Project Self Demo",
        scope: scope,
        endpoint: endpoint,
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: userId,
        endpointType: "staging_https" as const,
        userIdType: "uuid" as const,
        userDefinedData: "Hello World",
        disclosures: {
          minimumAge: 18,
          excludedCountries: [],
          ofac: false,
        },
      }).build();
    } catch (buildError) {
      console.error("Failed to build Self app configuration:", buildError);
      setError("Failed to initialize verification component");
      return null;
    }
  }, [userId, isClientLoaded]);

  const handleSuccessfulVerification = useCallback(async (): Promise<void> => {
    console.log("Verification successful!");

    // Set loading state
    setAppState("loading");
    setError(null);

    try {
      // Call the nullifier API endpoint
      const nullifierResponse = await fetch("/api/nullifer");
      if (!nullifierResponse.ok) {
        throw new Error(`HTTP error! status: ${nullifierResponse.status}`);
      }
      const data = await nullifierResponse.json();
      const dataObj = {
        nullifer: data.nullifer,
        password: formData.password,
        username: formData.username,
        zkCommitment: formData.zkCommitment,
      };
      console.log(dataObj);
      const response = await generateKey(process.env.NEXT_PUBLIC_RPC_URL!, {
        id: dataObj.username,
        password: dataObj.password,
        commitment: dataObj.zkCommitment,
        nullifier: dataObj.nullifer,
      });
      console.log(response, "response");

      // Set completed state after successful API call
      setAppState("completed");

      // Clear form data after successful verification
      setFormData({ username: "", password: "", zkCommitment: "" });
      setPasswordValidation({
        minLength: false,
        hasNumber: false,
        hasSpecialChar: false,
        hasUppercase: false,
      });
    } catch (error) {
      console.error("Failed to fetch nullifier data:", error);
      setError("Failed to complete verification process");
      setAppState("verification");
    }
  }, [formData]);

  const handleVerificationError = useCallback(
    (errorDetails: SelfErrorDetails): void => {
      console.error("Verification error:", errorDetails);
      const errorMessage =
        errorDetails?.reason ||
        errorDetails?.error_code ||
        "Failed to verify identity";
      setError(errorMessage);
      setAppState("verification");
    },
    []
  );

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

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, username: value }));
    },
    []
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, password: value }));
      setPasswordValidation(validatePassword(value));
    },
    [validatePassword]
  );

  const handleZkCommitmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, zkCommitment: value }));
    },
    []
  );

  const isFormValid = useCallback((): boolean => {
    const isUsernameValid = formData.username.length >= 3;
    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    const isZkCommitmentValid = formData.zkCommitment.length > 0;
    return isUsernameValid && isPasswordValid && isZkCommitmentValid;
  }, [formData.username, formData.zkCommitment, passwordValidation]);

  const handleVerifyClick = useCallback((): void => {
    if (isFormValid()) {
      setAppState("verification");
    }
  }, [isFormValid]);

  // Move LoginForm outside to prevent recreation and focus loss
  const LoginForm = React.useMemo(
    () => (
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
              CREATE ACCOUNT
            </p>
          </div>

          {/* Form Fields */}
          <div className="p-8 space-y-6">
            <div className="group">
              <label className="block text-xs font-bold text-black mb-2 tracking-[0.15em] uppercase">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-black text-lg placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-300"
                  placeholder="Enter your username"
                  minLength={3}
                />
                {formData.username.length >= 3 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 bg-green-500 flex items-center justify-center animate-scale-in">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  </div>
                )}
              </div>
              {formData.username.length > 0 && formData.username.length < 3 && (
                <p className="mt-2 text-xs text-red-500 tracking-wide animate-shake">
                  Username must be at least 3 characters
                </p>
              )}
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-black mb-2 tracking-[0.15em] uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-black text-lg placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-300"
                  placeholder="Enter your password"
                />
                {Object.values(passwordValidation).every(Boolean) &&
                  formData.password.length > 0 && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <div className="w-6 h-6 bg-green-500 flex items-center justify-center animate-scale-in">
                        <span className="text-white text-xs font-bold">✓</span>
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

            <div className="group">
              <label className="block text-xs font-bold text-black mb-2 tracking-[0.15em] uppercase">
                ZK Commitment
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.zkCommitment}
                  onChange={handleZkCommitmentChange}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-300 text-black text-lg placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-300"
                  placeholder="Enter your ZK commitment"
                />
                {formData.zkCommitment.length > 0 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 bg-green-500 flex items-center justify-center animate-scale-in">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sign In Button */}
            <div className="pt-6">
              <button
                onClick={handleVerifyClick}
                disabled={!isFormValid()}
                className={`w-full py-4 px-6 font-bold text-sm tracking-[0.15em] uppercase transition-all duration-300 ${
                  isFormValid()
                    ? "bg-black text-white hover:bg-gray-800 cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                type="button"
              >
                Verify with Self
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="pt-4 text-center">
              <a
                href="/forgot-password"
                className="text-sm text-gray-600 hover:text-black transition-all duration-300 tracking-wide underline hover:no-underline"
              >
                Forgot your password?
              </a>
            </div>
          </div>
        </div>
      </div>
    ),
    [
      formData,
      passwordValidation,
      handleUsernameChange,
      handlePasswordChange,
      handleZkCommitmentChange,
      handleVerifyClick,
      isFormValid,
    ]
  );

  if (!isClientLoaded) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-8 bg-black flex items-center justify-center animate-pulse">
            <span className="text-white text-xl font-bold">Z</span>
          </div>
          <p className="text-black text-lg font-bold tracking-widest">
            LOADING VERIFICATION COMPONENT
          </p>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-1 h-8 bg-black animate-pulse"></div>
            <div
              className="w-1 h-8 bg-gray-400 animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-1 h-8 bg-gray-600 animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "form") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        {LoginForm}
      </div>
    );
  }

  if (appState === "completed") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white border-2 border-black shadow-2xl">
            {/* Header */}
            <div className="text-center py-12 px-6 border-b-2 border-black">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-500 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">✓</span>
              </div>
              <h1 className="text-black text-3xl font-bold mb-4 tracking-[0.2em]">
                VERIFICATION SUCCESSFUL
              </h1>
              <p className="text-gray-600 text-sm tracking-widest uppercase">
                Identity Confirmed
              </p>
            </div>

            {/* Success Content */}
            <div className="p-12 text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-black text-xl font-bold tracking-[0.15em] uppercase">
                  Account Created Successfully
                </h2>
                <p className="text-gray-700 text-base leading-relaxed max-w-2xl mx-auto">
                  Congratulations! Your identity has been successfully verified
                  and your account has been created. You can now use your
                  credentials to securely perform transactions.
                </p>
              </div>

              <div className="space-y-6">
                <p className="text-gray-600 text-sm tracking-wide">
                  Your account is now ready for secure transactions and platform
                  access.
                </p>
                <button
                  onClick={() => {
                    setAppState("form");
                    setFormData({
                      username: "",
                      password: "",
                      zkCommitment: "",
                    });
                    setPasswordValidation({
                      minLength: false,
                      hasNumber: false,
                      hasSpecialChar: false,
                      hasUppercase: false,
                    });
                  }}
                  className="px-8 py-4 bg-black text-white font-bold text-sm tracking-[0.15em] uppercase hover:bg-gray-800 transition-all duration-300"
                  type="button"
                >
                  Back to Home Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white border-2 border-black shadow-2xl">
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-8 bg-black flex items-center justify-center animate-pulse">
                <span className="text-white text-xl font-bold">Z</span>
              </div>
              <h1 className="text-black text-2xl font-bold mb-4 tracking-[0.2em]">
                PROCESSING VERIFICATION
              </h1>
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-8 bg-black animate-pulse"></div>
                <div
                  className="w-2 h-8 bg-gray-400 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-8 bg-gray-600 animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border-2 border-black shadow-2xl">
          <button
            onClick={() => setAppState("form")}
            className="m-6 p-3 text-gray-600 hover:text-black transition-all duration-300 flex items-center space-x-2 group"
            type="button"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform duration-300">
              ←
            </span>
            <span className="tracking-widest text-xs uppercase font-bold">
              Back
            </span>
          </button>

          <div className="text-center py-8 px-6 border-b-2 border-black">
            <div className="w-12 h-12 mx-auto mb-4 bg-black flex items-center justify-center">
              <span className="text-white text-xl font-bold">Z</span>
            </div>
            <h1 className="text-black text-2xl font-bold mb-2 tracking-[0.2em]">
              VERIFY YOUR IDENTITY
            </h1>
            <p className="text-gray-600 text-sm tracking-widest">
              SCAN THIS QR CODE WITH THE SELF APP
            </p>
          </div>

          {error && (
            <div className="mx-6 mb-6 p-6 bg-red-50 border-2 border-red-200">
              <div className="text-center">
                <div className="text-red-500 text-2xl mb-4">⚠</div>
                <p className="text-red-700 font-bold tracking-widest uppercase text-sm mb-2">
                  Verification Failed
                </p>
                <p className="text-red-600 text-xs tracking-wide">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 px-6 py-2 bg-red-500 text-white text-xs tracking-widest uppercase font-bold hover:bg-red-600 transition-all duration-300"
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <SelfErrorBoundary>
            <div className="p-12 flex justify-center">
              {app ? (
                <div className="relative">
                  <div className="bg-gray-50 p-8 border-2 border-black">
                    <SelfQRcodeWrapper
                      selfApp={app}
                      onSuccess={handleSuccessfulVerification}
                      onError={handleVerificationError}
                      size={280}
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black px-4 py-1">
                    <p className="text-white text-xs tracking-widest uppercase font-bold">
                      QR Code
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-center">
                  <div>
                    <div className="text-6xl mb-6 text-red-500">⚠</div>
                    <p className="mb-6 text-lg font-bold tracking-widest uppercase text-black">
                      Failed to initialize verification
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 bg-black text-white tracking-widest uppercase text-sm font-bold hover:bg-gray-800 transition-all duration-300"
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SelfErrorBoundary>

          {isClientLoaded && (
            <div className="p-6 bg-gray-50 border-t-2 border-black">
              <div className="text-center">
                <p className="text-xs text-black mb-3 tracking-widest uppercase font-bold">
                  User ID
                </p>
                <code className="bg-black px-3 py-1 text-white text-xs font-mono">
                  {userId}
                </code>
                <div className="mt-4 text-gray-600 text-xs tracking-widest uppercase">
                  Make sure you have the Self app installed
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerificationPage;
