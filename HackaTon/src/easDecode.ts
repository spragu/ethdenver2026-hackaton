import { decodeAbiParameters, type AbiParameter } from "viem";

// EASScan GraphQL
const EAS_ARB = "https://arbitrum.easscan.org/graphql";

async function gql<T>(query: string, variables: any): Promise<T> {
  const res = await fetch(EAS_ARB, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export type EasSchema = {
  id: string;
  schema: string; // e.g. "string name,uint256 score,address winner"
};

export async function fetchSchema(schemaId: string): Promise<EasSchema | null> {
  const query = `
    query SchemaById($id: String!) {
      schema(where: { id: $id }) {
        id
        schema
      }
    }
  `;
  const data = await gql<{ schema: EasSchema | null }>(query, { id: schemaId });
  return data.schema;
}

// Converts EAS schema string -> viem AbiParameter[]
// Supports common forms like:
// "string name,uint256 score,address winner"
// "string name, uint256 score, address winner"
export function parseEasSchema(schema: string): AbiParameter[] {
  const parts = schema
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((p) => {
    // "uint256 score" OR "uint256"
    const [type, name] = p.split(/\s+/).filter(Boolean);
    return {
      type,
      name: name ?? undefined,
    } as AbiParameter;
  });
}

export function decodeAttestationData(schema: string, dataHex: `0x${string}`) {
  const abiParams = parseEasSchema(schema);
  const values = decodeAbiParameters(abiParams, dataHex);

  // Return as a nice object: { fieldName: value, ... }
  const out: Record<string, any> = {};
  abiParams.forEach((p, i) => {
    const key = (p.name && p.name.length > 0) ? p.name : `field_${i}`;
    const v = values[i];

    // BigInt -> string for UI
    out[key] = typeof v === "bigint" ? v.toString() : v;
  });
  return out;
}
