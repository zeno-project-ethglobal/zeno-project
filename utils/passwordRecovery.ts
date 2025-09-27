import { ethers } from "ethers";

export interface RecoverPasswordParams {
  rpcUrl: string;
  issuerPrivateKey: string;
  id: string;
  newEOA: string;
}

export async function recoverPassword({
  rpcUrl,
  issuerPrivateKey,
  id,
  newEOA,
}: RecoverPasswordParams): Promise<any> {
  const wallet = new ethers.Wallet(issuerPrivateKey);

  // Build raw message exactly like Go
  const message = "PASSWORD RECOVERY" + id + newEOA;
  const msgHash = ethers.keccak256(ethers.toUtf8Bytes(message));

  // Sign raw hash (no Ethereum prefix)
  const sig = wallet.signingKey.sign(msgHash);

  const v = sig.v;
  const r = sig.r;
  const s = sig.s;

  // Build JSON-RPC payload
  const payload = {
    method: "recover_password",
    params: [
      {
        id,
        new_eoa_from_password: newEOA,
        v,
        r,
        s,
      },
    ],
  };

  // Call node RPC
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export function passwordToKeyPair(password: string) {
  // Hash the password → 32-byte hex
  const hash = ethers.keccak256(ethers.toUtf8Bytes(password));

  // Use as private key
  const wallet = new ethers.Wallet(hash);

  return {
    privateKey: wallet.privateKey,
    address: wallet.address,
  };
}