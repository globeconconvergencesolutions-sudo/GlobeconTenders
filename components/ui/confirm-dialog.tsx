"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  requireTypedPhrase?: string;
  typedPhraseLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  error,
  requireTypedPhrase,
  typedPhraseLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  const needsTypedConfirm = Boolean(requireTypedPhrase);
  const typedMatch =
    !needsTypedConfirm ||
    typedValue.trim() === requireTypedPhrase?.trim();

  function handleOpenChange(next: boolean) {
    if (!next) setTypedValue("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {needsTypedConfirm && (
          <div className="space-y-2">
            <Label htmlFor="confirm-typed-phrase">
              {typedPhraseLabel ??
                `Type ${requireTypedPhrase} to confirm`}
            </Label>
            <Input
              id="confirm-typed-phrase"
              value={typedValue}
              autoComplete="off"
              spellCheck={false}
              placeholder={requireTypedPhrase}
              onChange={(event) => setTypedValue(event.target.value)}
            />
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={loading || !typedMatch}
            onClick={() => void onConfirm()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
