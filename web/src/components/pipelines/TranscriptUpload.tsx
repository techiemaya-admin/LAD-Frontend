'use client';

/**
 * Upload a WhatsApp chat export and read settings from it.
 *
 * WHY THIS EXISTS WHEN THE PICKER ALREADY DOES
 * The picker can only reach conversations already in Mr LAD. A studio's best
 * material is usually OLDER than their account - years of WhatsApp history
 * where a real person answered the pricing, parking and injury questions
 * properly. Export that chat from WhatsApp, upload it here, and it becomes
 * the same reviewed-proposal flow as everything else.
 *
 * TWO STEPS, AND THE SECOND ONE IS NOT OPTIONAL
 * 1. The file is parsed server-side (free, nothing stored) and the people in
 *    it come back with message counts.
 * 2. The studio marks which participant is THEM. The extractor trusts the
 *    studio's side like their written instructions and everyone else as a
 *    customer - so a skipped or wrong mapping doesn't fail, it produces
 *    confident settings attributed to the wrong side. The server refuses a
 *    scan without the mapping; this UI just makes that visible up front.
 *
 * The file never leaves this flow: parsed, read once, discarded.
 */

import React, { useRef, useState } from 'react';
import { Loader2, Upload, X, MessageSquare } from 'lucide-react';
import { previewTranscript } from '@lad/frontend-features/snapshots';
import type { PipelineKey, TranscriptPreview } from '@lad/frontend-features/snapshots';

/** Matches the server's parser cap; refused there, so refuse it here first. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export function TranscriptUpload({
  pipeline,
  isScanning,
  onScan,
  onCancel,
}: {
  pipeline: PipelineKey;
  isScanning: boolean;
  onScan: (transcript: string, studioParticipants: string[]) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<TranscriptPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioSide, setStudioSide] = useState<Set<string>>(new Set());

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPreview(null);
    setStudioSide(new Set());

    if (file.size > MAX_FILE_BYTES) {
      setError('That file is too large. In WhatsApp, export a shorter date range.');
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      // Parsed server-side so the file the studio sees judged is exactly the
      // file the scan will read - a second client-side parser would drift.
      const parsed = await previewTranscript(pipeline, text);
      setTranscript(text);
      setPreview(parsed);
      // No default. Someone has to SAY which side is theirs - see header.
    } catch (err) {
      const serverMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(serverMessage || 'Could not read that file.');
      setTranscript(null);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggle = (name: string) => {
    setStudioSide((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-blue-950/40 bg-gray-50 dark:bg-[#000c3b] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Upload a chat export
          </h4>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-300">
            In WhatsApp, open a chat → Export chat → <span className="font-medium">Without media</span>,
            then choose the .txt file here. It is read once and not kept.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isScanning}
          aria-label="Cancel upload"
          className="shrink-0 rounded p-1 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {!preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={parsing || isScanning}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#071131] px-3 py-6 text-sm text-gray-600 dark:text-slate-300 hover:border-emerald-600 hover:text-gray-900 dark:hover:text-white disabled:opacity-60"
        >
          {parsing
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Upload className="h-4 w-4" aria-hidden="true" />}
          {parsing ? 'Checking the file…' : 'Choose the exported .txt file'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-amber-800 dark:text-amber-300">{error}</p>
      )}

      {preview && (
        <>
          <p className="mt-3 text-xs text-gray-600 dark:text-slate-300">
            <span className="font-medium text-gray-900 dark:text-white">{fileName}</span>
            {' - '}{preview.messageCount} message{preview.messageCount === 1 ? '' : 's'}
            {preview.skipped > 0 && `, ${preview.skipped} media placeholder${preview.skipped === 1 ? '' : 's'} skipped`}.
          </p>

          {/* The load-bearing question. Answers from the studio's side are
              trusted like their written instructions; everyone else is a
              customer whose questions are not answers. */}
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            Which of these is your studio?
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {preview.participants.map((p) => {
              const checked = studioSide.has(p.name);
              const id = `studio-side-${p.name}`;
              return (
                <li key={p.name}>
                  <label
                    htmlFor={id}
                    className={`flex items-center gap-2.5 rounded-md border p-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-blue-950/40 bg-white dark:bg-[#071131]'
                    }`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      disabled={isScanning}
                      onChange={() => toggle(p.name)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 dark:border-blue-950/40 text-emerald-600 focus:ring-emerald-600 disabled:opacity-50"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">
                      {p.name}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 tabular-nums">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {p.messageCount}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {studioSide.size === 0 && (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
              Answers from your side are what the reading trusts most - without this,
              nothing in the chat counts as your answer.
            </p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => transcript && onScan(transcript, [...studioSide])}
              disabled={isScanning || studioSide.size === 0 || !transcript}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-600"
            >
              {isScanning && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Read this chat
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setTranscript(null); setError(null); }}
              disabled={isScanning}
              className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              Different file
            </button>
          </div>
        </>
      )}
    </div>
  );
}
