export type SuiNetwork = "testnet" | "mainnet";

/** Everything the inspector needs to talk to a Walrus Memory account. */
export interface InspectorSettings {
    /** Ed25519 delegate private key, hex — same value MemWal.create() takes. */
    delegateKey: string;
    /** MemWalAccount object ID on Sui. */
    accountId: string;
    /** Relayer base URL. */
    serverUrl: string;
    /** Default namespace for search and write actions. */
    namespace: string;
    network: SuiNetwork;
    /** Sui fullnode gRPC endpoint used for on-chain enumeration. */
    suiGrpcUrl: string;
    /** Walrus package ID — determines the `::blob::Blob` object type to list. */
    walrusPackageId: string;
    /** Walrus Memory dashboard origin used for the one-click connect flow. */
    dashboardUrl: string;
}

/** MemWalAccount fields read from chain. */
export interface AccountInfo {
    owner: string;
    createdAt: number | null;
    active: boolean;
    delegateKeyCount: number;
}

/**
 * One memory as seen from the chain: a Walrus Blob object owned by the
 * account owner, tagged with memwal_* metadata attributes. `text` and
 * `distance` are filled in later by joining recall() results on blob_id.
 */
export interface MemoryBlob {
    objectId: string;
    blobId: string;
    namespace: string;
    agentId: string;
    packageId: string;
    size: number | null;
    registeredEpoch: number | null;
    certifiedEpoch: number | null;
    endEpoch: number | null;
    deletable: boolean | null;
    text?: string;
    distance?: number;
}
