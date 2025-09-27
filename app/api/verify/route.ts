// app/api/verify/route.ts
import { NextResponse } from "next/server";
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from "@selfxyz/core";
import { writeHash } from "@/utils/helper";

const SCOPE = "zeno-self-demo";
const ENDPOINT = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify` : "http://localhost:3000/api/verify";

console.log("Backend scope:", SCOPE);
console.log("Backend endpoint:", ENDPOINT);

// Reuse a single verifier instance
const selfBackendVerifier = new SelfBackendVerifier(
  SCOPE,
  ENDPOINT,
  true, // mockPassport: false = mainnet, true = staging/testnet
  AllIds,
  new DefaultConfigStore({
    minimumAge: 18,
     excludedCountries: [],
     ofac: false
  }),
  "uuid" // userIdentifierType
);

export async function POST(req: Request) {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Extract data from the request
    const { attestationId, proof, publicSignals, userContextData } = await req.json();

    console.log("Request data:", {
      attestationId,
      hasProof: !!proof,
      hasPublicSignals: !!publicSignals,
      hasUserContextData: !!userContextData
    });

    // Verify all required fields are present
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      return NextResponse.json(
        {
          message: "Proof, publicSignals, attestationId and userContextData are required",
          status: "error",
        },
        { status: 400 }
      );
    }

    // Verify the proof
    const result = await selfBackendVerifier.verify(
      attestationId,    // Document type (1 = passport, 2 = EU ID card, 3 = Aadhaar)
      proof,            // The zero-knowledge proof
      publicSignals,    // Public signals array
      userContextData   // User context data (hex string)
    );

    console.log("Verification result:", {
      isValid: result.isValidDetails.isValid,
      details: result.isValidDetails,
      data: result.userData.userDefinedData,
      identifier: result.userData.userIdentifier,
      nullifier: result.discloseOutput.nullifier,
      proof
    });

    // Check if verification was successful
    if (result.isValidDetails.isValid) {
      // Verification successful - return comprehensive data including nullifier
      writeHash(result.discloseOutput.nullifier);
      const responseData = {
        status: "success",
        result: true,
        credentialSubject: {
          ...result.discloseOutput,
          nullifier: result.discloseOutput.nullifier
        },
        nullifier: result.discloseOutput.nullifier,
        proof
      };

      console.log("Returning verification response:", {
        status: responseData.status,
        nullifier: responseData.nullifier
      });

      return NextResponse.json(responseData, { headers: corsHeaders });
    } else {
      // Verification failed
      console.log("❌ Verification failed:", result.isValidDetails);
      return NextResponse.json(
        {
          status: "error",
          result: false,
          reason: "Verification failed",
          error_code: "VERIFICATION_FAILED",
          details: result.isValidDetails,
        },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        status: "error",
        result: false,
        reason: error instanceof Error ? error.message : "Unknown error",
        error_code: "UNKNOWN_ERROR"
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}