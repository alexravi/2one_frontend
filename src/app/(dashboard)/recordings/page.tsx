"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { getMyRecordings, type Recording } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Loader2 } from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RecordingsPage() {
  const { t } = useI18n();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchRecordings() {
      try {
        const data = await getMyRecordings();
        setRecordings(data);
      } catch {
        // Will show empty table
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecordings();
  }, []);

  const filtered = recordings.filter((r) => {
    const matchesSearch = r.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.validation_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("nav.recordings")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and track all your uploaded audio files.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input 
                placeholder="Search files..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading recordings…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {recordings.length === 0
                ? "No recordings yet. Upload audio files from the Dashboard."
                : "No recordings match your filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.file_name")}</TableHead>
                  <TableHead>{t("table.duration")}</TableHead>
                  <TableHead>{t("table.language")}</TableHead>
                  <TableHead>{t("table.upload_date")}</TableHead>
                  <TableHead>{t("table.validation_status")}</TableHead>
                  <TableHead>{t("table.payment_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{rec.file_name}</TableCell>
                    <TableCell className="font-mono">{formatDuration(rec.duration)}</TableCell>
                    <TableCell>{rec.language || "—"}</TableCell>
                    <TableCell>{formatDate(rec.upload_date)}</TableCell>
                    <TableCell>
                      <Badge variant={rec.validation_status === "approved" ? "success" : rec.validation_status === "rejected" ? "error" : "warning"}>
                        {rec.validation_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.payment_status === "paid" ? "info" : "default"}>
                        {rec.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
