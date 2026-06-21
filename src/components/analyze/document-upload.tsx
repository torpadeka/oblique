"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, X, Loader2, ArrowRight, Lock, PenLine, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { QvacParseResult } from "@/lib/types";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

const fmtBytes = (n: number) =>
  n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  onParsed: (result: QvacParseResult) => void;
  onManual: () => void;
}

export function DocumentUpload({ onParsed, onManual }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const rejected = incoming.filter((f) => !(f.type === "application/pdf" || /\.pdf$/i.test(f.name)) || f.size > MAX_BYTES);
    if (rejected.length) {
      toast.error(`Skipped ${rejected.length} file(s) — PDFs under 10 MB only.`);
    }
    const accepted = incoming.filter((f) => (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) && f.size <= MAX_BYTES);
    setFiles((prev) => {
      const byName = new Map(prev.map((f) => [f.name + f.size, f]));
      for (const f of accepted) byName.set(f.name + f.size, f);
      return [...byName.values()].slice(0, MAX_FILES);
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function parse() {
    if (!files.length) return;
    setParsing(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/qvac/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Parse failed (${res.status})`);
      const result = json as QvacParseResult;
      toast.success(
        `Parsed ${result.receipt.extractedFields}/${result.receipt.totalFields} fields via ${result.receipt.engine === "qvac-llm" ? "QVAC" : "local parser"}.`,
      );
      onParsed(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not parse the documents.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Upload the application <span className="text-fog">documents</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            QVAC reads your PDFs on-device and drafts the application — no field-by-field typing.
          </p>
        </div>
        <Badge variant="secure" className="gap-1">
          <Lock className="size-3" />
          parsed on-device
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>
            Credit memo, financial statements, KYC — PDF, up to {MAX_FILES} files / 10 MB each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary/50 bg-muted/40" : "border-border hover:border-primary/50 hover:bg-muted/40"
            }`}
          >
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
              <UploadCloud className="size-5" />
            </span>
            <span className="text-sm font-medium text-foreground">Drop PDFs here, or click to browse</span>
            <span className="text-xs text-muted-foreground">Your documents are parsed locally and never sent to a cloud model.</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={f.name + f.size}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.name}</span>
                  <span className="text-xs text-muted-foreground tnum">{fmtBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={parse} disabled={!files.length || parsing} className="cursor-pointer h-10 px-5">
          {parsing ? (
            <>
              <Loader2 className="animate-spin" />
              Parsing with QVAC…
            </>
          ) : (
            <>
              Parse documents
              <ArrowRight />
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onManual} disabled={parsing} className="cursor-pointer h-10">
          <PenLine />
          Enter manually instead
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="cursor-pointer ml-auto text-muted-foreground"
          render={<a href="/sample-credit-memo.pdf" download />}
        >
          <Download />
          Sample memo PDF
        </Button>
      </div>
    </div>
  );
}
