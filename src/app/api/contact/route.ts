import { after } from "next/server";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertHuman } from "@/lib/services/bot-check";
import { notifyEditors, sendAcknowledgement } from "@/lib/services/email";
import { assertSameOrigin, created, readJson } from "@/lib/services/http";
import { createContactMessage } from "@/lib/services/intake";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { clientIp, hashIdentifier } from "@/lib/services/request-meta";
import { contactSchema } from "@/lib/validation/public-forms";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = contactSchema.parse(await readJson(req));

    const ip = clientIp(req);
    await assertHuman(input, ip);
    await enforceRateLimit("contact", hashIdentifier(ip));

    const id = await createContactMessage(input);
    logger.info("contact_created", { id, subject: input.subject });

    after(async () => {
      await Promise.all([notifyEditors("contact"), sendAcknowledgement(input.email, input.name, "contact")]);
    });
    return created();
  } catch (err) {
    return errorResponse(err);
  }
}
