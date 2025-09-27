import { Wallet, keccak256, toUtf8Bytes } from "ethers";

export interface GenerateKeyParams {
  id: string;
  password: string;
  commitment: string;
  nullifier: string;
}

export async function generateKey(
  rpcUrl: string,
  { id, password, commitment, nullifier }: GenerateKeyParams
): Promise<any> {
  // 1) Derive keypair from password
  const pwdHash = keccak256(toUtf8Bytes(password));
  const wallet = new Wallet(pwdHash);

  // 2) Build message digest
  const message = id + commitment + nullifier;
  const digest = keccak256(toUtf8Bytes(message));

  // 3) Sign digest
  const sig = wallet.signingKey.sign(digest);
  const v =
    sig.v ??
    (sig.recoveryParam !== undefined
      ? 27 + sig.recoveryParam
      : sig.yParity !== undefined
      ? 27 + sig.yParity
      : 27);

  // 4) Build RPC body
  const body = {
    method: "generate_key",
    params: [
      {
        id,
        eoaFromPwd: wallet.address,
        commitment,
        nullifier,
        v,
        r: sig.r,
        s: sig.s,
      },
    ],
  };

  // 5) Send RPC call
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}