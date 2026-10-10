import { createHash } from "node:crypto";
import { Schema } from "effect";
import { Sha256 } from "../shared/model";

const toSha256 = Schema.decodeUnknownSync(Sha256);

export const sha256 = (data: string | Uint8Array): Sha256 => toSha256(createHash("sha256").update(data).digest("hex"));
