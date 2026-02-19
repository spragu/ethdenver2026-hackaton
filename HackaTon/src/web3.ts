import { http, createConfig } from "wagmi";
import { arbitrum, mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  // arbitrum = primary interactive chain; mainnet = read-only, needed for ENS resolution
  chains: [arbitrum, mainnet],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
    [mainnet.id]: http(), // ENS lookups run on mainnet
  },
});
