import { after } from "next/server";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertHuman } from "@/lib/services/bot-check";
import { notifyEditors, sendAcknowledgement } from "@/lib/services/email";
import { assertSameOrigin, created, readJson } from "@/lib/services/http";
import { createNomination } from "@/lib/services/intake";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { clientIp, hashIdentifier } from "@/lib/services/request-meta";
import { nominationSchema } from "@/lib/validation/public-forms";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = nominationSchema.parse(await readJson(req));

    const ip = clientIp(req);
    const ipHash = hashIdentifier(ip);
    await assertHuman(input, ip);
    await enforceRateLimit("nomination", ipHash);

    const id = await createNomination(input, `public-form:nominate ip=${ipHash}`);
    logger.info("nomination_created", { id });

    // Only the nominator is emailed; the nominee is contacted by an editor, never automatically.
    after(async () => {
      await Promise.all([
        notifyEditors("nomination"),
        sendAcknowledgement(input.nominatorEmail, input.nominatorName, "nomination"),
      ]);
    });
    return created();
  } catch (err) {
    return errorResponse(err);
  }
}
