import { after } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertHuman } from "@/lib/services/bot-check";
import { notifyEditors, sendAcknowledgement } from "@/lib/services/email";
import { assertSameOrigin, created, readMultipart } from "@/lib/services/http";
import { processUploadedImage } from "@/lib/services/images";
import { createSelfSubmission } from "@/lib/services/intake";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { clientIp, hashIdentifier } from "@/lib/services/request-meta";
import { submissionSchema } from "@/lib/validation/public-forms";

/** Multipart: `payload` (JSON string matching submissionSchema) + optional `photo` file. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const form = await readMultipart(req);

    const payload = form.get("payload");
    if (typeof payload !== "string") throw new AppError("VALIDATION", "Missing submission details.");
    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      throw new AppError("VALIDATION", "Malformed submission details.");
    }
    const input = submissionSchema.parse(raw);

    const ip = clientIp(req);
    const ipHash = hashIdentifier(ip);
    await assertHuman(input, ip);
    await enforceRateLimit("submission", ipHash);

    const photoEntry = form.get("photo");
    const photo =
      photoEntry instanceof File && photoEntry.size > 0
        ? { image: await processUploadedImage(photoEntry), name: photoEntry.name }
        : null;

    const id = await createSelfSubmission(input, photo, `public-form:submit ip=${ipHash}`);
    logger.info("submission_created", { id, hasPhoto: Boolean(photo) });

    after(async () => {
      await Promise.all([notifyEditors("submission"), sendAcknowledgement(input.email, input.fullName, "submission")]);
    });
    return created();
  } catch (err) {
    return errorResponse(err);
  }
}
