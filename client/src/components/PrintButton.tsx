import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { printDocument } from '../lib/print';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';

export interface PrintableRequest {
  _id: string;
  requestNumber?: string;
  status: string;
  numberOfCopies: number;
  numberOfPages?: number;
  paperSize: string;
  orientation: string;
  sides?: string;
  printingType?: string;
  pageSelection?: string;
  pageRange?: string;
  documentId?: { _id: string; fileType: 'PDF' | 'DOCX'; originalName?: string } | null;
}

interface Props {
  request: PrintableRequest;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  onDone?: () => void;
}

const blockedStatuses = ['COLLECTED', 'CANCELLED', 'REJECTED'];

export function PrintButton({ request, size = 'sm', full, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const doc = request.documentId;
  const disabled = !doc || blockedStatuses.includes(request.status) || busy;

  const print = async () => {
    if (!doc) {
      toast('This request has no document to print.', 'error');
      return;
    }
    setBusy(true);
    try {
      const prepared = await printDocument({
        documentId: doc._id,
        fileType: doc.fileType,
        paperSize: request.paperSize,
        orientation: request.orientation,
        copies: request.numberOfCopies,
        numberOfPages: request.numberOfPages,
        printingType: request.printingType || 'COLOUR',
        pageSelection: request.pageSelection || 'ALL',
        pageRange: request.pageRange,
        sides: request.sides,
      });
      await api.post('/print-jobs', {
        requestId: request._id,
        numberOfCopiesPrinted: request.numberOfCopies,
        outcome: 'SUCCESS',
        requestedSettings: {
          copies: request.numberOfCopies,
          paperSize: request.paperSize,
          sides: request.sides,
          orientation: request.orientation,
          colour: request.printingType,
        },
      });
      toast(
        prepared.prepared
          ? `${request.requestNumber || 'Request'} sent to print — ${prepared.pageCount} page${prepared.pageCount === 1 ? '' : 's'} prepared, job recorded. Keep Copies = 1 in the dialog.`
          : `${request.requestNumber || 'Request'} printed, but settings could not be embedded. Check pages, copies and colour in the dialog next time.`,
        prepared.prepared ? 'success' : 'info'
      );
      qc.invalidateQueries();
      onDone?.();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Printing could not be started. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="primary"
      size={size}
      icon={Printer}
      loading={busy}
      disabled={disabled}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void print(); }}
      className={full ? 'w-full' : ''}
      title={doc ? `Print ${doc.originalName || 'document'}` : 'No document available'}
    >
      {busy ? 'Preparing...' : 'Print now'}
    </Button>
  );
}
