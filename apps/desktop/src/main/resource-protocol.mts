import { pathToFileURL } from "node:url";

import type { GetResourceAccessQuery } from "@showflow/application";
import {
  parseEntityId,
  type ResourceId,
  type StudioId,
} from "@showflow/domain";
import {
  parseResourceProtocolUrl,
  type ResourceProtocolVariant,
} from "@showflow/resources";
import { net, type Protocol } from "electron";

import type { DesktopResourceFileAdapter } from "./resource-file-adapter.mjs";

interface ResourceAccessGrant {
  readonly expiresAt: number;
  readonly resourceId: ResourceId;
  readonly studioId: StudioId;
  readonly variant: ResourceProtocolVariant;
}

export class ResourceProtocolService {
  static readonly GRANT_LIFETIME_MS = 5 * 60 * 1_000;

  readonly #grants = new Map<string, ResourceAccessGrant>();

  constructor(
    readonly access: Pick<GetResourceAccessQuery, "execute">,
    readonly files: DesktopResourceFileAdapter,
  ) {}

  async issueUrl(
    resourceId: ResourceId,
    studioId: StudioId,
    variant: ResourceProtocolVariant,
  ): Promise<string> {
    await this.access.execute(resourceId, studioId);
    const token = crypto.randomUUID();
    const now = Date.now();
    for (const [grantToken, grant] of this.#grants) {
      if (grant.expiresAt <= now) this.#grants.delete(grantToken);
    }
    this.#grants.set(token, {
      expiresAt: now + ResourceProtocolService.GRANT_LIFETIME_MS,
      resourceId,
      studioId,
      variant,
    });
    return `showflow-resource://resource/${variant}/${resourceId}?access=${token}`;
  }

  async register(protocol: Protocol): Promise<void> {
    if (await protocol.isProtocolHandled("showflow-resource")) {
      protocol.unhandle("showflow-resource");
    }
    protocol.handle("showflow-resource", async (request) => {
      const parsed = parseResourceProtocolUrl(request.url);
      if (parsed === undefined)
        return new Response("Resource request is invalid.", { status: 400 });
      const grant = this.#grants.get(parsed.accessToken);
      if (grant !== undefined && grant.expiresAt <= Date.now()) {
        this.#grants.delete(parsed.accessToken);
      }
      if (
        grant === undefined ||
        grant.expiresAt <= Date.now() ||
        grant.resourceId !== parsed.resourceId ||
        grant.variant !== parsed.variant
      ) {
        return new Response("Resource access is not authorized.", {
          status: 403,
        });
      }
      const resource = await this.access.execute(
        parseEntityId<"resource">(parsed.resourceId),
        grant.studioId,
      );
      if (
        resource.availability !== "available" ||
        resource.localPath === undefined
      ) {
        return new Response("Resource file is unavailable.", { status: 404 });
      }
      const thumbnailPath =
        parsed.variant === "thumbnail"
          ? await this.files.deriveThumbnail(resource)
          : undefined;
      const filePath = thumbnailPath ?? resource.localPath;
      const fileResponse = await net.fetch(pathToFileURL(filePath).href);
      return new Response(fileResponse.body, {
        headers: {
          "Cache-Control": "private, max-age=300",
          "Content-Type":
            thumbnailPath === undefined ? resource.mimeType : "image/png",
        },
        status: fileResponse.status,
      });
    });
  }
}
