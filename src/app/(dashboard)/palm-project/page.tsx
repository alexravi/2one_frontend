"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  getMyPalmSubmissions,
  getPresignedImageUrl,
  registerPalmSubmission,
  type PalmSubmission,
  uploadFileToBlob,
  type PresignedImageUrlResponse,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type SlotKey =
  | "RIGHT_BACK_BG1"
  | "RIGHT_BACK_BG2"
  | "RIGHT_BACK_BG3"
  | "RIGHT_FRONT_BG1"
  | "RIGHT_FRONT_BG2"
  | "RIGHT_FRONT_BG3"
  | "LEFT_BACK_BG1"
  | "LEFT_BACK_BG2"
  | "LEFT_BACK_BG3"
  | "LEFT_FRONT_BG1"
  | "LEFT_FRONT_BG2"
  | "LEFT_FRONT_BG3";

type SlotState = {
  file: File | null;
  previewUrl: string | null;
  meta: { width?: number; height?: number; mime?: string } | null;
  status: "empty" | "ready" | "uploading" | "done" | "error";
  fileId: string | null;
  errorMsg?: string;
};

const GROUPS: Array<{
  title: string;
  description: string;
  slots: Array<{ key: SlotKey; label: string }>;
}> = [
  {
    title: "Right palm — Back camera",
    description: "Same right palm, different lighting/backgrounds.",
    slots: [
      { key: "RIGHT_BACK_BG1", label: "Background / Lighting 1" },
      { key: "RIGHT_BACK_BG2", label: "Background / Lighting 2" },
      { key: "RIGHT_BACK_BG3", label: "Background / Lighting 3" },
    ],
  },
  {
    title: "Right palm — Front / Selfie camera",
    description: "Same right palm, different lighting/backgrounds.",
    slots: [
      { key: "RIGHT_FRONT_BG1", label: "Background / Lighting 1" },
      { key: "RIGHT_FRONT_BG2", label: "Background / Lighting 2" },
      { key: "RIGHT_FRONT_BG3", label: "Background / Lighting 3" },
    ],
  },
  {
    title: "Left palm — Back camera",
    description: "Same left palm, different lighting/backgrounds.",
    slots: [
      { key: "LEFT_BACK_BG1", label: "Background / Lighting 1" },
      { key: "LEFT_BACK_BG2", label: "Background / Lighting 2" },
      { key: "LEFT_BACK_BG3", label: "Background / Lighting 3" },
    ],
  },
  {
    title: "Left palm — Front / Selfie camera",
    description: "Same left palm, different lighting/backgrounds.",
    slots: [
      { key: "LEFT_FRONT_BG1", label: "Background / Lighting 1" },
      { key: "LEFT_FRONT_BG2", label: "Background / Lighting 2" },
      { key: "LEFT_FRONT_BG3", label: "Background / Lighting 3" },
    ],
  },
];

const ALL_SLOTS: SlotKey[] = GROUPS.flatMap((g) => g.slots.map((s) => s.key));

async function readImageMeta(file: File): Promise<{ width?: number; height?: number; mime?: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const meta = { width: bitmap.width, height: bitmap.height, mime: file.type };
    const maybeClose = (bitmap as any).close;
    if (typeof maybeClose === "function") maybeClose.call(bitmap);
    return meta;
  } catch {
    return { mime: file.type };
  }
}

function slotToOrderLabel(slot: SlotKey) {
  switch (slot) {
    case "RIGHT_BACK_BG1":
      return "Right Back (1)";
    case "RIGHT_BACK_BG2":
      return "Right Back (2)";
    case "RIGHT_BACK_BG3":
      return "Right Back (3)";
    case "RIGHT_FRONT_BG1":
      return "Right Front (1)";
    case "RIGHT_FRONT_BG2":
      return "Right Front (2)";
    case "RIGHT_FRONT_BG3":
      return "Right Front (3)";
    case "LEFT_BACK_BG1":
      return "Left Back (1)";
    case "LEFT_BACK_BG2":
      return "Left Back (2)";
    case "LEFT_BACK_BG3":
      return "Left Back (3)";
    case "LEFT_FRONT_BG1":
      return "Left Front (1)";
    case "LEFT_FRONT_BG2":
      return "Left Front (2)";
    case "LEFT_FRONT_BG3":
      return "Left Front (3)";
  }
}

export default function PalmProjectPage() {
  const { t } = useI18n();
  useAuth(); // ensure authenticated

  const [existingSubmission, setExistingSubmission] = useState<PalmSubmission | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  const initialSlots = useMemo(() => {
    const state: Record<SlotKey, SlotState> = {} as any;
    for (const slot of ALL_SLOTS) {
      state[slot] = { file: null, previewUrl: null, meta: null, status: "empty", fileId: null };
    }
    return state;
  }, []);

  const [slots, setSlots] = useState<Record<SlotKey, SlotState>>(initialSlots);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<string>("female");
  const [ethnos, setEthnos] = useState<string>("european");
  const [profession, setProfession] = useState<string>("");
  const [smartphoneModel, setSmartphoneModel] = useState<string>("");
  const [dominantHand, setDominantHand] = useState<string>("right");

  const canSubmit = useMemo(() => {
    if (existingSubmission) return false;
    if (isSubmitting) return false;
    if (!profession.trim() || !smartphoneModel.trim()) return false;
    if (age < 18) return false;
    return ALL_SLOTS.every((s) => slots[s].file && slots[s].status !== "error");
  }, [age, dominantHand, existingSubmission, isSubmitting, profession, smartphoneModel, slots]);

  const uploadDisabled = !!existingSubmission || isSubmitting || isLoadingExisting;

  useEffect(() => {
    async function load() {
      try {
        const submissions = await getMyPalmSubmissions();
        setExistingSubmission(submissions[0] ?? null);
      } catch {
        setExistingSubmission(null);
      } finally {
        setIsLoadingExisting(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    // Revoke object URLs on unmount to avoid memory leaks.
    return () => {
      for (const slot of ALL_SLOTS) {
        const url = slots[slot].previewUrl;
        if (url) URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlotFile = async (slot: SlotKey, file: File) => {
    setSlots((prev) => {
      const oldUrl = prev[slot].previewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return {
        ...prev,
        [slot]: {
          ...prev[slot],
          file,
          previewUrl: URL.createObjectURL(file),
          meta: prev[slot].meta,
          status: "ready",
          fileId: null,
          errorMsg: undefined,
        },
      };
    });

    const meta = await readImageMeta(file);
    setSlots((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        meta,
      },
    }));
  };

  const removeSlotFile = (slot: SlotKey) => {
    setSlots((prev) => {
      const oldUrl = prev[slot].previewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return {
        ...prev,
        [slot]: { file: null, previewUrl: null, meta: null, status: "empty", fileId: null, errorMsg: undefined },
      };
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      // 1) Upload each image to Blob via presigned URL.
      for (const slot of ALL_SLOTS) {
        const slotState = slots[slot];
        if (!slotState.file) continue;

        setSlots((prev) => ({ ...prev, [slot]: { ...prev[slot], status: "uploading", errorMsg: undefined } }));

        let presigned: PresignedImageUrlResponse;
        try {
          presigned = await getPresignedImageUrl(slotState.file.name);
        } catch (err) {
          setSlots((prev) => ({
            ...prev,
            [slot]: {
              ...prev[slot],
              status: "error",
              errorMsg: err instanceof Error ? err.message : "Failed to get upload URL",
            },
          }));
          throw err;
        }

        try {
          await uploadFileToBlob(presigned.upload_url, slotState.file);
        } catch (err) {
          setSlots((prev) => ({
            ...prev,
            [slot]: {
              ...prev[slot],
              status: "error",
              errorMsg: err instanceof Error ? err.message : "Blob upload failed",
            },
          }));
          throw err;
        }

        setSlots((prev) => ({
          ...prev,
          [slot]: { ...prev[slot], status: "done", fileId: presigned.file_id },
        }));
      }

      // 2) Register the full 12-photo set in backend.
      const photosPayload = ALL_SLOTS.map((slot) => {
        const s = slots[slot];
        return {
          file_id: s.fileId!,
          filename: s.file!.name,
          size: s.file!.size,
          slot,
          client_meta: {
            width: s.meta?.width,
            height: s.meta?.height,
            mime: s.meta?.mime,
          },
        };
      });

      const created = await registerPalmSubmission({
        age,
        gender,
        ethnos,
        profession,
        smartphone_model: smartphoneModel,
        dominant_hand: dominantHand,
        photos: photosPayload,
      });

      setExistingSubmission(created);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("palm.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("palm.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("palm.instructions_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Photo requirements</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-5">
                <li>Take separate photos of your palms using both smartphone cameras.</li>
                <li>For each palm: 3 photos with the back camera + 3 photos with the front/selfie camera (different backgrounds/lighting).</li>
                <li>Only one hand should be visible; your palm should occupy at least 50% of the frame.</li>
                <li>Gloves prohibited; keep skin texture clearly visible.</li>
                <li>Palm should be as parallel to the image plane as possible.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Rejections (common)</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-5">
                <li>Low-quality image: dark, blurry, unclear, or heavily cropped.</li>
                <li>Palm angled improperly or not parallel.</li>
                <li>Flipping/mirroring or using someone else’s hand.</li>
                <li>Strong direct sunlight or very strong artificial lighting.</li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            After you submit, your set will show <span className="font-medium">Verification pending</span> until an internal reviewer approves it.
          </div>
        </CardContent>
      </Card>

      {existingSubmission ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Submission status</CardTitle>
            <Badge
              variant={
                existingSubmission.validation_status === "approved"
                  ? "success"
                  : existingSubmission.validation_status === "rejected"
                    ? "error"
                    : "warning"
              }
            >
              {existingSubmission.validation_status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingSubmission.validation_status === "approved" ? (
              <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                Approved. You have been credited <span className="font-semibold">$1</span>.
              </div>
            ) : existingSubmission.validation_status === "rejected" ? (
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                Rejected. {existingSubmission.rejection_reason ? `Reason: ${existingSubmission.rejection_reason}` : "No rejection reason provided."}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Loader2 className="w-4 h-4 mt-0.5 animate-spin" />
                {t("palm.pending_verification")}. An internal team will review your full 12-photo set.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingSubmission.photos.slice(0, 12).map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {p.blob_url?.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.blob_url} alt={p.slot} className="w-full h-28 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                      {slotToOrderLabel(p.slot as SlotKey)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("palm.participant_info")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Age (18+)</div>
              <Input type="number" min={18} value={age} onChange={(e) => setAge(Number(e.target.value))} disabled={uploadDisabled} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Gender</div>
              <Select value={gender} onChange={(e) => setGender(e.target.value)} disabled={uploadDisabled}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Ethnos</div>
              <Select value={ethnos} onChange={(e) => setEthnos(e.target.value)} disabled={uploadDisabled}>
                <option value="european">European</option>
                <option value="african">African</option>
                <option value="hindi">Hindi</option>
                <option value="asian">Asian</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Dominant hand</div>
              <Select value={dominantHand} onChange={(e) => setDominantHand(e.target.value)} disabled={uploadDisabled}>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Current profession</div>
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g., teacher, student, engineer" disabled={uploadDisabled} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Smartphone model used</div>
              <Input value={smartphoneModel} onChange={(e) => setSmartphoneModel(e.target.value)} placeholder="e.g., iPhone 15 Pro / Samsung S22" disabled={uploadDisabled} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("palm.sample_images_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.title}</div>
                <div className="grid grid-cols-3 gap-2">
                  {group.slots.map((s) => (
                    <div key={s.key} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/palm-samples/${s.key}.svg`}
                        alt={s.label}
                        className="w-full h-20 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Replace these placeholders with final sample photos when available.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">{t("palm.upload_title")}</CardTitle>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Submitting…
              </>
            ) : (
              t("palm.submit_verification")
            )}
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{group.description}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {group.slots.map((s) => {
                  const st = slots[s.key];
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-white dark:bg-gray-900/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{s.label}</div>
                        {st.status === "done" ? (
                          <Badge variant="success">Uploaded</Badge>
                        ) : st.status === "uploading" ? (
                          <Badge variant="warning">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading
                          </Badge>
                        ) : st.status === "error" ? (
                          <Badge variant="error">Error</Badge>
                        ) : st.status === "ready" ? (
                          <Badge variant="info">Ready</Badge>
                        ) : (
                          <Badge variant="default">Empty</Badge>
                        )}
                      </div>

                      {st.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={st.previewUrl} alt={s.key} className="w-full h-32 object-cover rounded-lg bg-gray-100" />
                      ) : (
                        <div className="w-full h-32 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                          Choose image
                        </div>
                      )}

                      {st.meta ? (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                          {st.meta.width && st.meta.height ? `${st.meta.width}x${st.meta.height}` : "—"}
                          {" · "}
                          {st.meta.mime ?? "unknown mime"}
                          {st.file ? ` · ${(st.file.size / 1024 / 1024).toFixed(2)} MB` : ""}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Meta will show after selection</div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadDisabled}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSlotFile(s.key, file);
                          }}
                        />
                        {st.file ? (
                          <Button variant="outline" size="sm" disabled={uploadDisabled} onClick={() => removeSlotFile(s.key)}>
                            Remove
                          </Button>
                        ) : null}
                      </div>

                      {st.errorMsg ? <div className="text-xs text-red-600 dark:text-red-400">{st.errorMsg}</div> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Submit will upload all 12 photos and then create a single palm submission. You will see <span className="font-medium">Verification pending</span> until the admin team approves it.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

