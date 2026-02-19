// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App


import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchAttestations } from "./eas";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchSchema, decodeAttestationData } from "./easDecode";

type Attestation = {
  id: string;
  schemaId: string;
  attester: string;
  recipient: string;
  time: number;
  revoked: boolean;
  data: `0x${string}`;
};

export default function App() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["easAtts", address],
    queryFn: () => fetchAttestations(address!),
    enabled: !!address,
  });

  const atts: Attestation[] = (data as any)?.attestations ?? [];

  const schemaIds = useMemo(() => [...new Set(atts.map(a => a.schemaId))], [atts]);


  const schemaQueries = useQueries({
    queries: schemaIds.map((id) => ({
      queryKey: ["easSchema", id] as const,
      queryFn: () => fetchSchema(id),
      enabled: !!id,
      staleTime: 1000 * 60 * 60,
    })),
  });

  const schemaMap = useMemo(() => {
    const m = new Map<string, string>();
    schemaQueries.forEach((q, idx) => {
      const schema = (q.data as any)?.schema?.schema ?? (q.data as any)?.schema;
      // depending on response shape; we’ll standardize once we see it
      if (schema) m.set(schemaIds[idx], schema);
    });
    return m;
  }, [schemaQueries, schemaIds]);


  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>HackaTon</h1>

      {!isConnected ? (
        <>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </button>
          {error && <p style={{ color: "crimson" }}>{error.message}</p>}
        </>
      ) : (
        <>
          <p>
            Connected: <code>{address}</code>
          </p>
          <p>
            Chain: <code>{chain?.name ?? "Unknown"}</code>
          </p>
          <button onClick={() => disconnect()}>Disconnect</button>

          <hr style={{ margin: "24px 0" }} />

          <h2>On-chain Credentials (EAS)</h2>

          {isLoading && <p>Loading attestations…</p>}
          {isError && <p style={{ color: "crimson" }}>Error loading attestations.</p>}

          {!isLoading && !isError && (
            <>
              <p>Found: {atts.length}</p>
              <div style={{ display: "grid", gap: 12 }}>
                {atts.map((a: any) => {
                  const schema = schemaMap.get(a.schemaId);

                  let decoded: Record<string, any> | null = null;
                  let decodeError: string | null = null;

                  if (schema) {
                    try {
                      decoded = decodeAttestationData(schema, a.data);
                    } catch (e: any) {
                      decodeError = e?.message ?? String(e);
                    }
                  }

                  return (
                    <div
                      key={a.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div>
                        <strong>Schema:</strong> <code>{a.schemaId}</code>
                      </div>
                      <div>
                        <strong>Attester:</strong> <code>{a.attester}</code>
                      </div>
                      <div>
                        <strong>Time:</strong> <code>{a.time}</code>
                      </div>
                      <div>
                        <strong>Revoked:</strong> <code>{String(a.revoked)}</code>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <strong>Decoded:</strong>
                      </div>

                      {!schema && (
                        <div style={{ opacity: 0.7 }}>
                          (Loading schema…)
                        </div>
                      )}

                      {schema && decoded && (
                        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                          {JSON.stringify(decoded, null, 2)}
                        </pre>
                      )}

                      {schema && !decoded && (
                        <div style={{ color: "crimson", marginTop: 8 }}>
                          Decode failed: {decodeError ?? "unknown error"}
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
