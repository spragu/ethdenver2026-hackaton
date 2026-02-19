import { request, gql } from "graphql-request";

const EAS_ARB = "https://arbitrum.easscan.org/graphql";

const ATTESTATIONS_FOR_RECIPIENT = gql`
  query AttestationsForRecipient($recipient: String!, $take: Int!) {
    attestations(
      where: { recipient: { equals: $recipient } }
      take: $take
      orderBy: { time: desc }
    ) {
      id
      schemaId
      attester
      recipient
      time
      revoked
      data
    }
  }
`;

export async function fetchAttestations(recipient: string) {
  return request(EAS_ARB, ATTESTATIONS_FOR_RECIPIENT, {
    recipient: recipient,
    take: 50,
  });
}
