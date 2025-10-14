"use client";

import * as React from "react";
import {
  Copy,
  FileText,
  Loader2,
  Mic,
  Pause,
  Settings,
  Share2,
  Square,
  Trash2,
} from "lucide-react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WRITING_STYLES, type WritingStyle } from "@/lib/styles";
import type { Note } from "@/types/note";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "style-select" | "processing" | "preview" | "paywall";
type ProcessingStage = "upload" | "transcribe" | "rewrite";

interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  pageSize: number;
  styles: WritingStyle[];
}

const MAX_FREE_NOTES = 3;
const TIMER_SECONDS = 10 * 60;

const stageOrder: ProcessingStage[] = ["upload", "transcribe", "rewrite"];
const stageLabels: Record<ProcessingStage, string> = {
  upload: "1 / 3 Uploading audio",
  transcribe: "2 / 3 Transcribing",
  rewrite: "3 / 3 Rewriting",
};

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function useToast(duration = 3200) {
  const [toast, setToast] = React.useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const createToast = React.useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToast({ message, tone });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, duration);
    },
    [duration],
  );

  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return { toast, createToast };
}

export function DashboardView() {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);
  const [total, setTotal] = React.useState(0);
  const [loadingNotes, setLoadingNotes] = React.useState(true);
  const [recordingState, setRecordingState] = React.useState<RecordingState>("idle");
  const [processingStage, setProcessingStage] = React.useState<ProcessingStage>("upload");
  const [countdown, setCountdown] = React.useState(TIMER_SECONDS);
  const [isPaused, setIsPaused] = React.useState(false);
  const [selectedStyle, setSelectedStyle] = React.useState<WritingStyle | null>(null);
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
  const [showTranscript, setShowTranscript] = React.useState(false);
  const [limitReachedMessage, setLimitReachedMessage] = React.useState<string | null>(null);
  const [activeStyles, setActiveStyles] = React.useState<WritingStyle[]>(WRITING_STYLES);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState("");
  const [editedTitle, setEditedTitle] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const stageTimeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

  const { toast, createToast } = useToast();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const cleanupStream = React.useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    chunksRef.current = [];
  }, []);

  const resetRecordingState = React.useCallback(() => {
    cleanupStream();
    stageTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    stageTimeoutsRef.current = [];
    setCountdown(TIMER_SECONDS);
    setIsPaused(false);
    setRecordedBlob(null);
    setSelectedStyle(null);
    setLimitReachedMessage(null);
    setRecordingState("idle");
    setProcessingStage("upload");
  }, [cleanupStream]);

  const fetchNotes = React.useCallback(
    async (nextPage = 1) => {
      try {
        setLoadingNotes(true);
        const response = await fetch(`/api/notes?page=${nextPage}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load notes");
        }

        const data: NotesResponse = await response.json();
        setNotes(data.notes);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
        setActiveStyles(data.styles);
      } catch (error) {
        console.error(error);
        createToast("Unable to load notes. Please refresh.", "error");
      } finally {
        setLoadingNotes(false);
      }
    },
    [createToast],
  );

  React.useEffect(() => {
    fetchNotes(1);
  }, [fetchNotes]);

  React.useEffect(() => {
    if (selectedNote) {
      setEditedContent(selectedNote.content ?? "");
      setEditedTitle(selectedNote.title ?? "");
    } else {
      setEditedContent("");
      setEditedTitle("");
      setShowTranscript(false);
      setIsSaving(false);
    }
  }, [selectedNote]);

  const handleStartRecording = React.useCallback(async () => {
    if (total >= MAX_FREE_NOTES) {
      setLimitReachedMessage("Go Premium and unlock unlimited notes.");
      setRecordingState("paywall");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      createToast("Your browser does not support audio recording.", "error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordingState("style-select");
        setCountdown(TIMER_SECONDS);
        setIsPaused(false);
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;

      recorder.start();
      setCountdown(TIMER_SECONDS);
      setRecordingState("recording");
      setIsPaused(false);
    } catch (error) {
      console.error(error);
      createToast("Microphone permission is required to record.", "error");
    }
  }, [cleanupStream, createToast, total]);

  const handleStopRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      resetRecordingState();
    }
  }, [resetRecordingState]);

  const handleTogglePause = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
    }
  }, []);

  const handleCancelRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    resetRecordingState();
  }, [resetRecordingState]);

  React.useEffect(() => {
    if (recordingState !== "recording" || isPaused) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleStopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingState, isPaused, handleStopRecording]);

  React.useEffect(
    () => () => {
      resetRecordingState();
    },
    [resetRecordingState],
  );

  const simulateStageProgress = React.useCallback(() => {
    stageTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    stageTimeoutsRef.current = [];

    stageTimeoutsRef.current.push(
      setTimeout(() => setProcessingStage("transcribe"), 1400),
      setTimeout(() => setProcessingStage("rewrite"), 3200),
    );
  }, []);

  const handleCreateNote = React.useCallback(
    async (style: WritingStyle) => {
      if (!recordedBlob) {
        createToast("No audio found. Please record again.", "error");
        resetRecordingState();
        return;
      }

      setSelectedStyle(style);
      setRecordingState("processing");
      setProcessingStage("upload");
      simulateStageProgress();

      const formData = new FormData();
      formData.append("audio", recordedBlob, `walknote-${Date.now()}.webm`);
      formData.append("styleId", style.id);

      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        stageTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        stageTimeoutsRef.current = [];

        if (response.status === 403) {
          const payload = await response.json();
          if (payload?.error === "LIMIT_REACHED") {
            setLimitReachedMessage(payload?.message ?? "Go Premium and unlock unlimited notes.");
            setRecordingState("paywall");
            setRecordedBlob(null);
            return;
          }
        }

        if (!response.ok) {
          throw new Error("Failed to create note");
        }

        const payload = await response.json();
        const newNote: Note | undefined = payload?.note;

        if (newNote) {
          createToast("Note created successfully.");
          setSelectedNote(newNote);
          setShowTranscript(false);
          await fetchNotes(1);
        }
      } catch (error) {
        console.error(error);
        createToast("We hit a snag creating that note. Please try again.", "error");
        setRecordingState("idle");
      } finally {
        resetRecordingState();
      }
    },
    [createToast, fetchNotes, recordedBlob, resetRecordingState, simulateStageProgress],
  );

  const handleDeleteNote = React.useCallback(
    async (noteId: string) => {
      try {
        setIsDeleting(true);
        const response = await fetch(`/api/notes/${noteId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Delete failed");
        }

        createToast("Note deleted.");
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        await fetchNotes(page);
      } catch (error) {
        console.error(error);
        createToast("Unable to delete note. Please retry.", "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [createToast, fetchNotes, page, selectedNote],
  );

  const handleCopy = React.useCallback(
    async (note: Note) => {
      try {
        await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
        createToast("Copied to clipboard.");
      } catch (error) {
        console.error(error);
        createToast("Copy failed. Try again.", "error");
      }
    },
    [createToast],
  );

  const handleShare = React.useCallback(
    async (note: Note) => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: note.title,
            text: note.content,
          });
          createToast("Shared via device dialog.");
          return;
        } catch (error) {
          console.error(error);
        }
      }

      handleCopy(note);
    },
    [createToast, handleCopy],
  );

  const handleSaveNote = React.useCallback(async () => {
    if (!selectedNote) {
      return;
    }

    if (editedContent === selectedNote.content && editedTitle === selectedNote.title) {
      createToast("No changes to save.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content: editedContent, title: editedTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const payload = await response.json();
      const updatedNote: Note | undefined = payload?.note;

      if (updatedNote) {
        setSelectedNote(updatedNote);
        setNotes((prevNotes) =>
          prevNotes.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
        );
      } else {
        setSelectedNote((prev) =>
          prev ? { ...prev, content: editedContent, title: editedTitle } : prev,
        );
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === selectedNote.id
              ? { ...note, content: editedContent, title: editedTitle }
              : note,
          ),
        );
      }

      createToast("Note updated.");
    } catch (error) {
      console.error(error);
      createToast("Unable to save note. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [createToast, editedContent, editedTitle, selectedNote]);

  const usedNotes = Math.min(total, MAX_FREE_NOTES);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-white">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UserButton afterSignOutUrl="/" />
              <div className="hidden text-sm text-slate-500 md:block">
                Signed in · {usedNotes}/{MAX_FREE_NOTES} notes used
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="!rounded-2xl border border-[#0b1e3f]/15">
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings (coming soon)</TooltipContent>
              </Tooltip>
              <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
                <Button variant="ghost" size="sm">
                  Sign out
                </Button>
              </SignOutButton>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-[#0b1e3f]/5 px-6 py-4 text-sm text-[#0b1e3f] md:flex-row">
            <div className="font-medium">Upgrade to Premium</div>
            <div>No limits, unlimited notes, priority processing. Coming soon.</div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-32">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold text-[#0b1e3f]">WalkNotes</h1>
            <p className="text-lg text-slate-500">Capture any thought on the spot.</p>
          </div>

          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing {notes.length > 0 ? (page - 1) * pageSize + 1 : 0}-
                {Math.min(page * pageSize, total)} of {total} notes
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1 || loadingNotes}
                  onClick={() => fetchNotes(page - 1)}
                >
                  ◄
                </Button>
                <span className="text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages || loadingNotes}
                  onClick={() => fetchNotes(page + 1)}
                >
                  ►
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {loadingNotes ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="h-40 animate-pulse rounded-3xl bg-slate-100"
                  />
                ))
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[#0b1e3f]/30 bg-white p-12 text-center">
                  <div className="rounded-full bg-[#0b1e3f]/10 p-4 text-[#0b1e3f]">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div className="max-w-md text-lg text-slate-600">
                    Your notes will appear here after you record your first WalkNote.
                  </div>
                </div>
              ) : (
                notes.map((note) => {
                  const trimmedContent = (note.content ?? "").trim();
                  const previewContent =
                    trimmedContent.length > 220
                      ? `${trimmedContent.slice(0, 220)}…`
                      : trimmedContent || note.transcript || "";

                  return (
                    <Card
                      key={note.id}
                      className="cursor-pointer bg-white transition hover:-translate-y-1"
                      onClick={() => {
                        setSelectedNote(note);
                        setShowTranscript(false);
                      }}
                    >
                      <CardHeader>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#0b1e3f]">
                          {note.style_name}
                        </div>
                        <h2 className="text-2xl font-semibold text-[#0b1e3f]">{note.title}</h2>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 text-sm text-slate-600">
                          {previewContent}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        </main>

        <div className="pointer-events-none fixed inset-x-0 bottom-10 flex justify-center">
          <Button
            size="icon"
            className="pointer-events-auto h-20 w-20 animate-pulse bg-[#0b1e3f] text-white shadow-2xl hover:scale-105"
            onClick={handleStartRecording}
            disabled={recordingState === "recording" || recordingState === "processing"}
          >
            <Mic className="h-8 w-8" />
          </Button>
        </div>

        {recordingState === "recording" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-[#0b1e3f] px-10 py-12 text-white shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <div className="text-sm uppercase tracking-[0.3em] text-white/70">Recording</div>
                <div className="text-6xl font-semibold tracking-widest">{formatCountdown(countdown)}</div>
                <div className="flex h-16 w-full items-center justify-center gap-2">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <div
                      key={`wave-${index}`}
                      className="h-full w-1 rounded-full bg-white/80"
                      style={{
                        animation: `wave 1.2s ease-in-out ${index * 50}ms infinite`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-14 w-14 bg-white/10 text-white hover:bg-white/20"
                    onClick={handleTogglePause}
                  >
                    {isPaused ? <Mic className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                  </Button>
                  <Button
                    size="icon"
                    className="h-16 w-16 bg-red-500 text-white hover:bg-red-600"
                    onClick={handleStopRecording}
                  >
                    <Square className="h-7 w-7" />
                  </Button>
                </div>
                <button
                  className="text-sm text-white/70 underline-offset-4 hover:underline"
                  onClick={handleCancelRecording}
                >
                  Cancel recording
                </button>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={recordingState === "style-select"}
          onOpenChange={(open) => {
            if (!open) {
              resetRecordingState();
            }
          }}
        >
          <DialogContent className="max-w-4xl bg-white text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-[#0b1e3f]">Choose how to rewrite your thought</DialogTitle>
              <DialogDescription className="text-slate-500">
                Select one of your WalkNotes styles. We&apos;ll transform the transcript right away.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {activeStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleCreateNote(style)}
                  className="flex flex-col gap-3 rounded-3xl border border-[#0b1e3f]/20 bg-white p-6 text-left transition hover:border-[#0b1e3f]"
                >
                  <div className="text-lg font-semibold text-[#0b1e3f]">{style.name}</div>
                  <p className="text-sm text-slate-500">{style.description}</p>
                </button>
              ))}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" className="mt-6 w-full text-slate-500">
                Cancel
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

        {recordingState === "processing" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-[#0b1e3f] px-10 py-14 text-white shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="h-12 w-12 animate-spin text-white/80" />
                <div className="text-sm uppercase tracking-[0.4em] text-white/70">Processing</div>
                <div className="flex flex-col gap-2 text-center text-lg font-medium">
                  {stageOrder.map((stage) => (
                    <div
                      key={stage}
                      className={cn(
                        "rounded-full px-6 py-3 transition",
                        processingStage === stage
                          ? "bg-white text-[#0b1e3f]"
                          : "bg-white/10 text-white/70",
                      )}
                    >
                      {stageLabels[stage]}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/60">
                  Hang tight—WalkNotes is polishing your thought in{" "}
                  {selectedStyle?.name ?? "your chosen style"}.
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={recordingState === "paywall"}
          onOpenChange={(open) => {
            if (!open) {
              resetRecordingState();
            }
          }}
        >
          <DialogContent className="max-w-md bg-white text-center text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#0b1e3f]">Go Premium</DialogTitle>
              <DialogDescription className="text-slate-600">
                {limitReachedMessage ?? "Go premium and unlock unlimited notes."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 flex flex-col gap-3">
              <Button disabled className="cursor-not-allowed">
                Go Premium (coming soon)
              </Button>
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(selectedNote)} onOpenChange={(open) => !open && setSelectedNote(null)}>
          <DialogContent className="max-w-5xl bg-[#0b1e3f] p-10 text-white">
            {selectedNote && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-sm uppercase tracking-wider text-white/70">{selectedNote.style_name}</div>
                    <DialogTitle asChild className="mt-2 w-full">
                      <input
                        aria-label="Edit note title"
                        value={editedTitle}
                        onChange={(event) => setEditedTitle(event.target.value)}
                        className="w-full rounded-xl bg-transparent px-3 py-2 text-3xl font-semibold text-white outline-none ring-white/25 transition focus:ring-2"
                        placeholder="Untitled note"
                      />
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/15 hover:text-white"
                          onClick={() => handleCopy(selectedNote)}
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/15 hover:text-white"
                          onClick={() => handleShare(selectedNote)}
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-200 hover:bg-red-500/20 hover:text-white"
                          disabled={isDeleting}
                          onClick={() => handleDeleteNote(selectedNote.id)}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/10 p-6 text-left text-base leading-relaxed">
                  <textarea
                    aria-label="Edit note content"
                    value={editedContent}
                    onChange={(event) => setEditedContent(event.target.value)}
                    className="min-h-[360px] w-full resize-y rounded-2xl border-none bg-transparent p-4 text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/25"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    className="rounded-full bg-white/10 text-sm text-white hover:bg-white/20"
                    onClick={() => setShowTranscript((prev) => !prev)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {showTranscript ? "Hide Transcript" : "View Transcript"}
                  </Button>
                  <Button
                    className="rounded-full bg-white px-6 text-sm font-semibold text-[#0b1e3f] hover:bg-white/90"
                    disabled={
                      isSaving ||
                      (editedContent === selectedNote.content &&
                        editedTitle === selectedNote.title)
                    }
                    onClick={handleSaveNote}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                </div>

                {showTranscript && (
                  <div className="rounded-3xl bg-white/5 p-6 text-sm text-white/80">
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/60">
                      Original transcript
                    </div>
                    <p className="whitespace-pre-wrap">{selectedNote.transcript}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {toast && (
          <div
            className={cn(
              "fixed bottom-8 right-8 z-50 rounded-full px-4 py-2 text-sm shadow-lg",
              toast.tone === "success"
                ? "bg-emerald-500/90 text-white"
                : "bg-red-500/90 text-white",
            )}
          >
            {toast.message}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
