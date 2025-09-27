export async function getUserInfo(rpcUrl: string, id: string) {
  const body = {
    method: "get_user_info",
    params: [id],
  };

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`RPC Error: ${data.error}`);
  }

  return data.result;
}