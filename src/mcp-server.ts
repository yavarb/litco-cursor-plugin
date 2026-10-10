// stdio MCP server → Litco HTTP API with your connection token.
//
// Every tool is a thin call to one LitKit / LitLex / LitSpace route. The server
// decides what the token may do (your live roles ∩ your firm's policy ∩ the
// products and matters you chose); this shim adds nothing and hides nothing,
// except one local preference: LITCO_READ_ONLY=1 (or --read-only) leaves the
// write tools out of this install. Every agent your firm enables gets the same
// tools and the same writes — the shim has no per-client rules.
//
// Billing entry tools reach your own time and expenses through the same
// token (a token pinned to matters is refused for them).
//
// A firm API key (lkf_) reaches LitLex research only, so only the LitLex tools
// are registered for it.

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ApiError, LitcoClient } from "./client.js";

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const MAX_TEXT_CHARS = 200_000;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function ok(data: unknown): ToolResult {
  let text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS) + `\n…[truncated at ${MAX_TEXT_CHARS} characters]`;
  }
  return { content: [{ type: "text", text }] };
}

function fail(err: unknown): ToolResult {
  const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: msg }], isError: true };
}

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err);
  }
}

const id = (what: string) => z.string().min(1).max(128).describe(what);
const seg = (s: string) => encodeURIComponent(s);

export interface ToolSpec {
  name: string;
  product: "identity" | "litkit" | "litlex" | "litspace" | "billing";
  write: boolean;
}

/** Register the tools for this credential. Returns what was registered. */
export function registerTools(server: McpServer, client: LitcoClient, opts: { readOnly: boolean }): ToolSpec[] {
  const registered: ToolSpec[] = [];
  const connection = client.kind === "connection";

  function tool<S extends z.ZodRawShape>(
    spec: ToolSpec,
    description: string,
    shape: S,
    handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>,
  ) {
    if (spec.write && opts.readOnly) return;
    if (!connection && spec.product !== "litlex") return;
    // The SDK's generic callback type does not follow a shape through this
    // helper; the SDK validates `args` against `shape` before calling us.
    const callback = async (args: unknown) => run(() => handler(args as z.objectOutputType<S, z.ZodTypeAny>));
    server.registerTool(
      spec.name,
      {
        description,
        inputSchema: shape,
        annotations: { readOnlyHint: !spec.write, destructiveHint: spec.write, openWorldHint: true },
      },
      callback as Parameters<typeof server.registerTool>[2],
    );
    registered.push(spec);
  }

  // ── identity ──────────────────────────────────────────────────────────────
  tool(
    { name: "litco_whoami", product: "identity", write: false },
    "Who this connection acts as, its products, and the matters it can reach (with your role on each).",
    {},
    () => client.request("/api/me"),
  );

  // ── LitKit: reads ─────────────────────────────────────────────────────────
  tool(
    { name: "litkit_list_matters", product: "litkit", write: false },
    "List the LitKit matters this connection can open.",
    {},
    () => client.request("/api/matters"),
  );
  tool(
    { name: "litkit_search_documents", product: "litkit", write: false },
    "Search a matter's documents (keyword / boolean, with optional metadata filters).",
    {
      matterId: id("Matter id"),
      q: z.string().max(200).describe("Search text"),
      limit: z.number().int().min(1).max(200).optional(),
      custodian: z.string().max(200).optional(),
      author: z.string().max(200).optional(),
      dateFrom: z.string().max(10).optional().describe("YYYY-MM-DD"),
      dateTo: z.string().max(10).optional().describe("YYYY-MM-DD"),
      bates: z.string().max(100).optional(),
    },
    ({ matterId, ...query }) => client.request(`/api/matters/${seg(matterId)}/search`, { query }),
  );
  tool(
    { name: "litkit_get_document", product: "litkit", write: false },
    "A document's metadata and review state.",
    { documentId: id("Document id") },
    ({ documentId }) => client.request(`/api/documents/${seg(documentId)}`),
  );
  tool(
    { name: "litkit_document_text", product: "litkit", write: false },
    "A document's extracted text.",
    { documentId: id("Document id") },
    ({ documentId }) => client.request(`/api/documents/${seg(documentId)}/text`),
  );
  tool(
    { name: "litkit_document_family", product: "litkit", write: false },
    "A document's family (parent email and attachments).",
    { documentId: id("Document id") },
    ({ documentId }) => client.request(`/api/documents/${seg(documentId)}/family`),
  );
  tool(
    { name: "litkit_list_tags", product: "litkit", write: false },
    "The tags defined on a matter (ids are needed to tag documents).",
    { matterId: id("Matter id") },
    ({ matterId }) => client.request("/api/tags", { query: { matterId } }),
  );
  tool(
    { name: "litkit_list_threads", product: "litkit", write: false },
    "A matter's threads.",
    { matterId: id("Matter id") },
    ({ matterId }) => client.request(`/api/matters/${seg(matterId)}/threads`),
  );
  tool(
    { name: "litkit_get_thread", product: "litkit", write: false },
    "One thread with its posts.",
    { matterId: id("Matter id"), threadId: id("Thread id") },
    ({ matterId, threadId }) => client.request(`/api/matters/${seg(matterId)}/threads/${seg(threadId)}`),
  );
  tool(
    { name: "litkit_list_review_jobs", product: "litkit", write: false },
    "A matter's Review & Tag runs and their progress.",
    { matterId: id("Matter id") },
    ({ matterId }) => client.request(`/api/matters/${seg(matterId)}/review-jobs`),
  );

  // ── LitKit: writes (applied directly, as in the browser) ──────────────────
  tool(
    { name: "litkit_tag_document", product: "litkit", write: true },
    "Apply a tag to a document (optionally to its attachments or whole family).",
    {
      documentId: id("Document id"),
      tagId: z.string().uuid().describe("Tag id from litkit_list_tags"),
      scope: z.enum(["doc", "attachments", "family"]).optional(),
    },
    ({ documentId, tagId, scope }) =>
      client.request(`/api/documents/${seg(documentId)}/tags`, { method: "POST", json: { tagId, scope } }),
  );
  tool(
    { name: "litkit_untag_document", product: "litkit", write: true },
    "Remove a tag from a document.",
    { documentId: id("Document id"), tagId: z.string().uuid() },
    ({ documentId, tagId }) =>
      client.request(`/api/documents/${seg(documentId)}/tags`, { method: "DELETE", json: { tagId } }),
  );
  tool(
    { name: "litkit_save_note", product: "litkit", write: true },
    "Save your note on a document (replaces your current note).",
    { documentId: id("Document id"), body: z.string().max(20_000) },
    ({ documentId, body }) =>
      client.request(`/api/documents/${seg(documentId)}/notes`, { method: "PUT", json: { body } }),
  );
  tool(
    { name: "litkit_post_to_thread", product: "litkit", write: true },
    "Post a message in a matter thread under your name.",
    {
      matterId: id("Matter id"),
      threadId: id("Thread id"),
      text: z.string().min(1).max(20_000),
      notForAna: z.boolean().optional().describe("true = don't address Ana with this post"),
    },
    ({ matterId, threadId, text, notForAna }) =>
      client.request(`/api/matters/${seg(matterId)}/threads/${seg(threadId)}/messages`, {
        method: "POST",
        json: { text, ...(notForAna ? { agent: "suppress" } : {}) },
      }),
  );

  // ── Billing: your time and expense entries ────────────────────────────────
  // Billing scopes every call to you: your own entries, plus everyone's on a
  // matter where you are a billing admin. A change to more than one entry, a
  // delete, or a move to another matter comes back first as a dry run
  // (preview + confirm_token, 10 minutes); show the preview to your person
  // and call again with the same arguments and confirm_token only once they
  // agree. Every applied change returns a change_id for billing_undo_change.
  const entries = (name: string, body: Record<string, unknown>) =>
    client.request(`/api/billing/entries/${name}`, { method: "POST", json: body });
  const day = (what: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe(`${what} (YYYY-MM-DD)`);
  const kind = z.enum(["time", "expense"]);
  const confirm = z.string().max(4096).optional().describe("confirm_token from the dry run, once your person agrees");
  const entryIds = z.array(id("Entry id")).min(1).max(200);

  tool(
    { name: "billing_list_entries", product: "billing", write: false },
    "List your logged Billing time and expense entries (and, on matters you administer for billing, everyone's).",
    {
      kind: kind.optional(),
      matter_id: z.string().max(128).optional().describe("Billing matter id"),
      user_id: z.string().max(128).optional().describe("Billing user id (billing admins)"),
      date_from: day("First day").optional(),
      date_to: day("Last day").optional(),
      status: z.enum(["draft", "ready", "billed", "written_off"]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      cursor: z.string().max(512).optional(),
    },
    (body) => entries("entries_list", body),
  );
  tool(
    { name: "billing_search_entries", product: "billing", write: false },
    "Search your logged Billing entries by narrative, matter or client text.",
    {
      q: z.string().min(1).max(200),
      kind: kind.optional(),
      matter_id: z.string().max(128).optional(),
      date_from: day("First day").optional(),
      date_to: day("Last day").optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    (body) => entries("entries_search", body),
  );
  tool(
    { name: "billing_get_entry", product: "billing", write: false },
    "One Billing entry in full.",
    { entry_id: id("Entry id") },
    (body) => entries("entry_get", body),
  );
  tool(
    { name: "billing_create_entry", product: "billing", write: true },
    "Create a Billing time or expense entry (a draft unless status is final).",
    {
      kind,
      matter_id: id("Billing matter id"),
      date: day("Day of the work"),
      hours: z.string().max(10).optional().describe("Decimal hours, e.g. 1.5 (time)"),
      amount: z.string().max(20).optional().describe("Amount, e.g. 42.50 (expense)"),
      narrative: z.string().min(1).max(4000),
      task_code: z.string().max(32).optional(),
      activity_code: z.string().max(32).optional(),
      expense_code: z.string().max(32).optional(),
      status: z.enum(["draft", "final"]).optional(),
      confirm_token: confirm,
    },
    (body) => entries("entry_create", body),
  );
  tool(
    { name: "billing_update_entry", product: "billing", write: true },
    "Edit a Billing entry's narrative, hours, amount, codes or date. Billed or locked entries are refused.",
    {
      entry_id: id("Entry id"),
      patch: z
        .object({
          narrative: z.string().max(4000).optional(),
          hours: z.string().max(10).optional(),
          amount: z.string().max(20).optional(),
          date: day("Day").optional(),
          task_code: z.string().max(32).optional(),
          activity_code: z.string().max(32).optional(),
          expense_code: z.string().max(32).optional(),
        })
        .describe("Only the fields to change"),
      confirm_token: confirm,
    },
    (body) => entries("entry_update", body),
  );
  tool(
    { name: "billing_move_entries", product: "billing", write: true },
    "Move Billing entries to another day or another matter, optionally recoding them.",
    {
      entry_ids: entryIds,
      to_date: day("New day").optional(),
      to_matter_id: z.string().max(128).optional().describe("Billing matter id"),
      task_code: z.string().max(32).optional(),
      activity_code: z.string().max(32).optional(),
      confirm_token: confirm,
    },
    (body) => entries("entry_move", body),
  );
  tool(
    { name: "billing_copy_entry", product: "billing", write: true },
    "Copy one Billing entry onto other days (same matter, codes and narrative), as drafts by default.",
    {
      entry_id: id("Entry to copy"),
      dates: z.array(day("Day")).min(1).max(31),
      hours_override: z.string().max(10).optional().describe("Hours on every copy, e.g. 8.0"),
      status: z.enum(["draft", "final"]).optional(),
      confirm_token: confirm,
    },
    (body) => entries("entry_duplicate", body),
  );
  tool(
    { name: "billing_delete_entries", product: "billing", write: true },
    "Delete Billing entries (always a dry run first). Billed or locked entries are refused.",
    { entry_ids: entryIds, confirm_token: confirm },
    (body) => entries("entry_delete", body),
  );
  tool(
    { name: "billing_undo_change", product: "billing", write: true },
    "Undo one applied Billing entry change by its change_id.",
    { change_id: id("change_id") },
    (body) => entries("entry_change_undo", body),
  );

  // ── LitSpace ──────────────────────────────────────────────────────────────
  tool(
    { name: "litspace_list_files", product: "litspace", write: false },
    "List files in a matter's LitSpace vault (optionally inside a folder).",
    { matterId: id("LitKit matter id"), parentId: z.string().max(128).optional() },
    ({ matterId, parentId }) =>
      client.request(`/api/litspace/matters/${seg(matterId)}/files`, { query: { parentId } }),
  );
  tool(
    { name: "litspace_search", product: "litspace", write: false },
    "Search a matter's LitSpace vault.",
    { matterId: id("LitKit matter id"), q: z.string().min(1).max(200) },
    ({ matterId, q }) => client.request(`/api/litspace/matters/${seg(matterId)}/search`, { query: { q } }),
  );
  tool(
    { name: "litspace_read_file", product: "litspace", write: false },
    "Read a LitSpace file's content as text.",
    { fileId: id("File id") },
    ({ fileId }) => client.request(`/api/litspace/files/${seg(fileId)}/content`, { text: true }),
  );
  tool(
    { name: "litspace_upload_file", product: "litspace", write: true },
    "Upload a local file into a matter's LitSpace vault (needs your repository write access).",
    {
      matterId: id("LitKit matter id"),
      path: z.string().min(1).max(4096).describe("Local file path"),
      filename: z.string().max(255).optional(),
      parentId: z.string().max(128).optional().describe("Folder id"),
    },
    async ({ matterId, path, filename, parentId }) => {
      const info = await stat(path);
      if (!info.isFile()) throw new Error("path is not a file");
      if (info.size > MAX_UPLOAD_BYTES) throw new Error(`file is larger than ${MAX_UPLOAD_BYTES} bytes`);
      const bytes = await readFile(path);
      const form = new FormData();
      const name = filename ?? basename(path);
      form.set("file", new Blob([bytes]), name);
      form.set("filename", name);
      if (parentId) form.set("parentId", parentId);
      return client.request(`/api/litspace/matters/${seg(matterId)}/files/upload`, { method: "POST", form });
    },
  );

  // ── LitLex (research; read-only by construction) ──────────────────────────
  tool(
    { name: "litlex_search", product: "litlex", write: false },
    "Search published case law.",
    {
      q: z.string().min(3).max(500),
      topK: z.number().int().min(1).max(25).optional(),
      offset: z.number().int().min(0).optional(),
      mode: z.enum(["boolean", "hybrid"]).optional(),
      court: z.string().max(100).optional(),
      after: z.string().max(10).optional().describe("YYYY-MM-DD"),
      before: z.string().max(10).optional().describe("YYYY-MM-DD"),
    },
    (query) => client.request("/api/litlex/search", { query }),
  );
  tool(
    { name: "litlex_get_opinion", product: "litlex", write: false },
    "An opinion's text and metadata.",
    { opinionId: id("Opinion id"), full: z.boolean().optional() },
    ({ opinionId, full }) =>
      client.request(`/api/litlex/opinions/${seg(opinionId)}`, { query: { full: full ? "1" : undefined } }),
  );
  tool(
    { name: "litlex_citator", product: "litlex", write: false },
    "How later cases treat an opinion.",
    { opinionId: id("Opinion id") },
    ({ opinionId }) => client.request(`/api/litlex/opinions/${seg(opinionId)}/citator`),
  );
  tool(
    { name: "litlex_resolve_citations", product: "litlex", write: false },
    "Resolve case citations (e.g. \"576 U.S. 644\") to opinions.",
    { cites: z.array(z.string().min(1).max(200)).min(1).max(50) },
    ({ cites }) => client.request("/api/litlex/cite-resolve", { method: "POST", json: { cites } }),
  );
  tool(
    { name: "litlex_check_quote", product: "litlex", write: false },
    "Check that a quotation actually appears in the cited opinion.",
    {
      quote: z.string().min(15).max(2000),
      opinionId: z.string().max(128).optional(),
      paragraphNumber: z.number().int().min(1).optional(),
    },
    (body) => client.request("/api/litlex/cite-check", { method: "POST", json: body }),
  );
  tool(
    { name: "litlex_statute", product: "litlex", write: false },
    "Look up a statute by citation.",
    { cite: z.string().min(1).max(200) },
    ({ cite }) => client.request("/api/litlex/statute", { query: { cite } }),
  );

  return registered;
}

export async function serve(client: LitcoClient, opts: { readOnly: boolean }): Promise<void> {
  const server = new McpServer({ name: "litco", version: "0.1.0" });
  registerTools(server, client, opts);
  await server.connect(new StdioServerTransport());
}
