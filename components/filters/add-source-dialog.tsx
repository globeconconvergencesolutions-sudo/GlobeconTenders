"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { SourceCatalogPanel } from "@/components/filters/source-catalog-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ParseResult = {
  sourceName: string;
  inserted: number;
  updated: number;
  errors: string[];
};

type AddSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddSourceDialog({
  open,
  onOpenChange,
  onCreated,
}: AddSourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function resetForm() {
    setName("");
    setUrl("");
    setFile(null);
    setError(null);
    setSuccess(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function createLinkSource() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "link",
        name,
        url,
        adapter: url.includes("/feed") ? "generic-rss" : "generic-link",
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to add source");
      return;
    }
    resetForm();
    onOpenChange(false);
    onCreated();
  }

  async function createDocumentSource() {
    if (!file) {
      setError("Choose a document to upload");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", file);
    const response = await fetch("/api/sources", {
      method: "POST",
      body: formData,
    });
    setLoading(false);
    const data = await response.json();
    if (!response.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Failed to upload document source",
      );
      return;
    }

    const parseResult = data.parseResult as ParseResult | undefined;
    if (parseResult?.errors.length) {
      setSuccess(
        `Uploaded to Cloudinary. Parsing issue: ${parseResult.errors[0]}`,
      );
    } else if (parseResult) {
      setSuccess(
        `Uploaded and parsed — ${parseResult.inserted} tender${parseResult.inserted === 1 ? "" : "s"} extracted.`,
      );
    } else {
      setSuccess("Document uploaded successfully.");
    }

    setName("");
    setFile(null);
    onCreated();

    window.setTimeout(() => {
      resetForm();
      onOpenChange(false);
    }, 1800);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add tender source</DialogTitle>
          <DialogDescription>
            Install popular portals in one click, or add a custom RSS link or
            document bulletin.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="link">Custom link</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-4">
            <SourceCatalogPanel
              onInstalled={() => {
                onCreated();
              }}
            />
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground dark:border-border dark:bg-muted/40">
              Paste any public RSS/Atom feed URL. URLs containing{" "}
              <code className="rounded bg-white px-1 dark:bg-background">
                /feed
              </code>{" "}
              are auto-detected as RSS.
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-name">Source name</Label>
              <Input
                id="source-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. County procurement RSS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-url">Feed or portal URL</Label>
              <Input
                id="source-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed/"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={createLinkSource}
                disabled={loading || !name || !url}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add custom source"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="document" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document label</Label>
              <Input
                id="doc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. March Kenya bulletin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-file">Upload file</Label>
              <Input
                id="doc-file"
                type="file"
                accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                CSV, TXT, or PDF bulletins are parsed into tenders and stored in
                Cloudinary.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={createDocumentSource}
                disabled={loading || !name || !file}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading & parsing...
                  </>
                ) : (
                  "Upload & parse document"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            {success}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
