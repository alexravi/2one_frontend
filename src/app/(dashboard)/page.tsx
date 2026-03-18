"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useAuth } from "@/lib/AuthContext";
import {
  getBalance,
  getMyRecordings,
  getPresignedUrl,
  uploadFileToBlob,
  registerRecording,
  type Recording,
} from "@/lib/api";
import { FileUpload } from "@/components/ui/FileUpload";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AudioFile {
  id: string;
  file: File;
  name: string;
  format: string;
  fileSize: string;
  duration: string;
  sampleRate: string;
  channels: number;
  detectedLanguage: string;
  speakers: number;
  status: "ready" | "uploading" | "done" | "error";
  language: string;
  errorMsg?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { t, language } = useI18n();
  useAuth(); // ensure authenticated
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live stats from API
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch dashboard stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const [balanceRes, recs] = await Promise.all([
          getBalance(),
          getMyRecordings(),
        ]);
        setWalletBalance(balanceRes.balance);
        setRecordings(recs);
      } catch {
        // Stats will show fallback values
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Compute stats from recordings
  const approvedRecordings = recordings.filter((r) => r.validation_status === "approved");
  const totalApprovedHours =
    approvedRecordings.reduce((sum, r) => sum + Number(r.duration || 0), 0) / 3600;
  const totalEarnings = approvedRecordings.length * 0.5; // $0.50 per approved recording

  const handleFilesSelected = async (newFiles: File[]) => {
    setIsProcessing(true);

    const processFile = async (file: File): Promise<AudioFile> => {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();

      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const durationSec = audioBuffer.duration;
        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        await audioContext.close();

        return {
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          format: file.name.split(".").pop()?.toUpperCase() || "WAV",
          fileSize: formatFileSize(file.size),
          duration: formatDuration(durationSec),
          sampleRate: (sampleRate / 1000).toFixed(1),
          channels,
          detectedLanguage: language,
          speakers: channels >= 2 ? 2 : 1,
          status: "ready" as const,
          language,
        };
      } catch {
        await audioContext.close();

        return new Promise((resolve) => {
          const url = URL.createObjectURL(file);
          const audio = new Audio(url);

          audio.onloadedmetadata = () => {
            const dur = audio.duration;
            URL.revokeObjectURL(url);
            resolve({
              id: Math.random().toString(36).substring(2, 9),
              file,
              name: file.name,
              format: file.name.split(".").pop()?.toUpperCase() || "UNK",
              fileSize: formatFileSize(file.size),
              duration: isFinite(dur) ? formatDuration(dur) : "Unknown",
              sampleRate: "—",
              channels: 1,
              detectedLanguage: language,
              speakers: 1,
              status: "ready" as const,
              language,
            });
          };

          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({
              id: Math.random().toString(36).substring(2, 9),
              file,
              name: file.name,
              format: file.name.split(".").pop()?.toUpperCase() || "UNK",
              fileSize: formatFileSize(file.size),
              duration: "Error",
              sampleRate: "—",
              channels: 1,
              detectedLanguage: language,
              speakers: 1,
              status: "ready" as const,
              language,
            });
          };
        });
      }
    };

    const newAudioFiles = await Promise.all(newFiles.map(processFile));
    setFiles((prev) => [...prev, ...newAudioFiles]);
    setIsProcessing(false);
  };

  const handleLanguageChange = (id: string, newLang: string) => {
    setFiles(files.map((f) => (f.id === id ? { ...f, language: newLang } : f)));
  };

  const removeFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Upload each file via presigned URL flow
    for (const audioFile of files) {
      setFiles((prev) =>
        prev.map((f) => (f.id === audioFile.id ? { ...f, status: "uploading" } : f))
      );

      try {
        // 1. Get presigned upload URL
        const { upload_url, file_id } = await getPresignedUrl(audioFile.name);

        // 2. Upload file to Azure Blob
        await uploadFileToBlob(upload_url, audioFile.file);

        // 3. Register recording in backend
        await registerRecording({
          file_id,
          filename: audioFile.name,
          size: audioFile.file.size,
        });

        setFiles((prev) =>
          prev.map((f) => (f.id === audioFile.id ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === audioFile.id
              ? { ...f, status: "error", errorMsg: err instanceof Error ? err.message : "Upload failed" }
              : f
          )
        );
      }
    }

    setIsSubmitting(false);

    // Refresh stats after upload
    try {
      const [balanceRes, recs] = await Promise.all([getBalance(), getMyRecordings()]);
      setWalletBalance(balanceRes.balance);
      setRecordings(recs);
    } catch {
      // Silently fail — stats will refresh on next page load
    }

    // Clear completed files after a delay
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status === "error"));
    }, 3000);
  };

  const readyFiles = files.filter((f) => f.status === "ready");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("nav.dashboard")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your voice data contributions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("dashboard.wallet_balance")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statsLoading ? (
                <span className="inline-block w-20 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                `$${Number(walletBalance ?? 0).toFixed(2)}`
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("dashboard.total_approved_hours")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statsLoading ? (
                <span className="inline-block w-20 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                `${Number(totalApprovedHours).toFixed(1)} hrs`
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("dashboard.total_earnings")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statsLoading ? (
                <span className="inline-block w-20 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                `$${Number(totalEarnings).toFixed(2)}`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <FileUpload onFilesSelected={handleFilesSelected} />

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing audio metadata…
        </div>
      )}

      {/* Metadata Table */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">
              {files.length} file{files.length > 1 ? "s" : ""}{" "}
              {readyFiles.length > 0 ? "ready" : ""}
            </CardTitle>
            {readyFiles.length > 0 && (
              <Button onClick={handleSubmit} size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  t("dashboard.submit_verification")
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.file_name")}</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>{t("table.file_format")}</TableHead>
                  <TableHead>{t("table.duration")}</TableHead>
                  <TableHead>{t("table.sample_rate")}</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>{t("table.speakers_detected")}</TableHead>
                  <TableHead>{t("table.language")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate block max-w-[180px]" title={file.name}>
                        {file.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 whitespace-nowrap">{file.fileSize}</TableCell>
                    <TableCell>
                      <Badge variant="default">{file.format}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-gray-900 whitespace-nowrap">{file.duration}</TableCell>
                    <TableCell className="whitespace-nowrap">{file.sampleRate} kHz</TableCell>
                    <TableCell>{file.channels}</TableCell>
                    <TableCell>{file.speakers}</TableCell>
                    <TableCell>
                      <Select
                        value={file.language}
                        onChange={(e) => handleLanguageChange(file.id, e.target.value)}
                        className="w-[110px] h-8 text-xs"
                        disabled={file.status !== "ready"}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="hi">Hindi</option>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {file.status === "ready" && <Badge variant="success">Ready</Badge>}
                      {file.status === "uploading" && (
                        <Badge variant="warning">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Uploading
                        </Badge>
                      )}
                      {file.status === "done" && (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {file.status === "error" && (
                        <Badge variant="error">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.status === "ready" && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
