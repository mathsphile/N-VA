'use client';

import { ProofRunner } from '@/components/app/ProofRunner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProofRequest } from '@/lib/midnight/types';

export function ProofRequestDialog({
  request,
  open,
  onOpenChange,
  onDone,
}: {
  request: ProofRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (request: ProofRequest) => void;
}) {
  return (
    <Dialog open={open && request !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{request?.name ?? 'Proof request'}</DialogTitle>
          <DialogDescription>Generate a private proof for this request.</DialogDescription>
        </DialogHeader>
        {/* key forces a fresh runner per request so phases never leak */}
        {request && (
          <ProofRunner
            key={request.id}
            request={request}
            compact
            onComplete={() => {
              onDone?.(request);
              window.setTimeout(() => onOpenChange(false), 1600);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
