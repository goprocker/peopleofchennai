import { AdminHeader, EmptyState, Panel, SimplePager } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dbFail, pageRange } from "@/lib/admin/db";
import { requirePagePermission } from "@/lib/auth/session";
import { publicMediaUrl } from "@/lib/db/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listQuerySchema } from "@/lib/validation/query";
import { deleteMedia, updateMediaAlt, uploadMedia } from "./actions";
import { MediaItemForms, UploadForm } from "./media-forms";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requirePagePermission("media.manage");
  const { page } = listQuerySchema.parse({ page: (await searchParams).page });
  const db = await createSupabaseServerClient();
  const { data, count, error } = await db
    .from("media_assets")
    .select("id, storage_path, original_filename, alt_text, width, height, file_size, created_at", {
      count: "exact",
    })
    .eq("bucket", "public-media")
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (error && error.code !== "PGRST103") dbFail("list_media", error);

  return (
    <>
      <AdminHeader
        title="Media library"
        description="Public images for portraits, galleries and story covers. Submitted photos stay private until promoted from a submission."
      />
      <Panel title="Upload" className="mb-8">
        <UploadForm action={uploadMedia} />
      </Panel>
      {data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <li key={m.id} className="border-border bg-surface rounded-md border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicMediaUrl(m.storage_path)}
                alt={m.alt_text}
                className="bg-surface-sunk aspect-[4/3] w-full rounded-sm object-cover"
              />
              <p className="text-muted mt-2 truncate text-xs" title={m.original_filename}>
                {m.original_filename} · {m.width}×{m.height} · {Math.round(m.file_size / 1024)} KB
              </p>
              {!m.alt_text && <p className="text-error text-xs font-semibold">Missing alt text</p>}
              <div className="mt-2">
                <MediaItemForms
                  alt={m.alt_text}
                  update={updateMediaAlt.bind(null, m.id)}
                  remove={deleteMedia.bind(null, m.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No images yet.</EmptyState>
      )}
      <SimplePager
        page={page}
        total={count ?? 0}
        pageSize={ADMIN_PAGE_SIZE}
        hrefFor={(p) => `/admin/media?page=${p}`}
      />
    </>
  );
}
