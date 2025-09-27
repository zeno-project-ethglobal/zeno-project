"use client";

import React, { useState, useCallback, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";

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

interface SelfQRVerificationProps {
  onSuccess: (nullifier: string) => Promise<void>;
  onError: (error: SelfErrorDetails) => void;
  onBack: () => void;
  title?: string;
  subtitle?: string;
}

function SelfQRVerification({
  onSuccess,
  onError,
  onBack,
  title = "VERIFY YOUR IDENTITY",
  subtitle = "SCAN THIS QR CODE WITH THE SELF APP",
}: SelfQRVerificationProps): React.JSX.Element {
  const [userId, setUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    setIsLoading(true);
    setError(null);

    try {
      // Call the nullifier API endpoint
      const nullifierResponse = await fetch("/api/nullifer");
      if (!nullifierResponse.ok) {
        throw new Error(`HTTP error! status: ${nullifierResponse.status}`);
      }
      const data = await nullifierResponse.json();
      console.log(data, "nullifier data");
      await onSuccess(data.nullifer);
    } catch (error) {
      console.error("Failed to fetch nullifier data:", error);
      setError("Failed to complete verification process");
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  const handleVerificationError = useCallback(
    (errorDetails: SelfErrorDetails): void => {
      console.error("Verification error:", errorDetails);
      const errorMessage =
        errorDetails?.reason ||
        errorDetails?.error_code ||
        "Failed to verify identity";
      setError(errorMessage);
      onError(errorDetails);
    },
    [onError]
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

  if (isLoading) {
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
            onClick={onBack}
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
              {title}
            </h1>
            <p className="text-gray-600 text-sm tracking-widest">{subtitle}</p>
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

export default SelfQRVerification;
