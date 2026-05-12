// lib/utils.ts (or create a new file)

/**
 * Safely extract an ID from a field that could be a string or an object with _id
 */
export function extractId(ref: unknown): string | undefined {
    if (typeof ref === "string") return ref;
    if (ref && typeof ref === "object" && "_id" in ref) {
        const obj = ref as Record<string, unknown>;
        if (typeof obj._id === "string") return obj._id;
    }
    return undefined;
}