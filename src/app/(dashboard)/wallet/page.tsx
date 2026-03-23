"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  getBalance,
  getTransactions,
  getPayoutHistory,
  requestPayout,
  submitBankVerification,
  ApiError,
  type Transaction,
  type PayoutRequest,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Download, Pencil, ShieldCheck, AlertCircle, CheckCircle2, X, ArrowUpRight, Loader2 } from "lucide-react";

const MIN_PAYOUT = 10;

interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  verified: boolean;
  verificationStatus: "verified" | "pending" | "unverified";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WalletPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "payouts">("overview");

  // API data
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payout request form
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  // Bank account state
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    verified: false,
    verificationStatus: "unverified",
  });
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [editForm, setEditForm] = useState(bankDetails);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, txns, payouts] = await Promise.all([
          getBalance(),
          getTransactions(),
          getPayoutHistory(),
        ]);
        setBalance(balanceRes.balance);
        setTransactions(txns);
        setPayoutHistory(payouts);

        // If there's payout history, infer bank details from the latest payout
        if (payouts.length > 0) {
          const latest = payouts[0];
          setBankDetails({
            accountName: latest.bank_account_name,
            accountNumber: latest.account_number,
            ifscCode: latest.ifsc_code,
            bankName: "",
            verified: true,
            verificationStatus: "verified",
          });
          setEditForm({
            accountName: latest.bank_account_name,
            accountNumber: latest.account_number,
            ifscCode: latest.ifsc_code,
            bankName: "",
            verified: true,
            verificationStatus: "verified",
          });
        }
      } catch {
        // Will show empty/zero values
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute stats
  const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const pendingPayments = transactions
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const paidAmount = payoutHistory
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // ── Handlers ─────────────────────────────────────────────
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError("");
    setPayoutSuccess(false);

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < MIN_PAYOUT) {
      setPayoutError(`Minimum payout is $${MIN_PAYOUT}.`);
      return;
    }
    if (amount > balance) {
      setPayoutError("Amount exceeds available balance.");
      return;
    }
    if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
      setPayoutError("Please configure your bank account details first.");
      return;
    }

    setIsRequesting(true);
    try {
      await requestPayout({
        amount,
        bank_account_name: bankDetails.accountName,
        account_number: bankDetails.accountNumber,
        ifsc_code: bankDetails.ifscCode,
      });

      setPayoutSuccess(true);
      setPayoutAmount("");

      // Refresh data
      const [balanceRes, payouts] = await Promise.all([getBalance(), getPayoutHistory()]);
      setBalance(balanceRes.balance);
      setPayoutHistory(payouts);

      setTimeout(() => setPayoutSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setPayoutError(err.message);
      } else {
        setPayoutError("Payout request failed. Please try again.");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting bank details for verification:", editForm);
    try {
      await submitBankVerification({
        accountName: editForm.accountName,
        accountNumber: editForm.accountNumber,
        ifscCode: editForm.ifscCode,
        bankName: editForm.bankName,
      });
    } catch (err) {
      console.error("Failed to submit to backend", err);
    }
    setBankDetails({ ...editForm, verified: false, verificationStatus: "pending" });
    setIsEditingBank(false);
  };

  const handleVerifyBank = () => {
    setBankDetails((prev) => ({ ...prev, verified: true, verificationStatus: "verified" }));
  };

  const handleDownloadReceipt = (payout: PayoutRequest) => {
    const text = `PAYOUT RECEIPT\n────────────────────\nPayout ID: ${payout.id}\nDate: ${formatDate(payout.created_at)}\nAmount: $${Number(payout.amount).toFixed(2)}\nMethod: Bank Transfer\nAccount: ${payout.account_number}\nStatus: ${payout.status}\n────────────────────\n2une Platform`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${payout.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const verificationBadge = () => {
    switch (bankDetails.verificationStatus) {
      case "verified":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>;
      case "pending":
        return <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="error"><AlertCircle className="w-3 h-3 mr-1" /> Unverified</Badge>;
    }
  };

  const canRequestPayout = bankDetails.accountName && bankDetails.accountNumber && bankDetails.ifscCode && balance >= MIN_PAYOUT;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading wallet…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("nav.wallet")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track earnings, manage payouts, and configure your bank account.
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-blue-600 text-white border-blue-700">
          <CardContent className="py-5">
            <p className="text-xs font-medium text-blue-200 uppercase tracking-wide mb-1">{t("dashboard.total_earnings")}</p>
            <p className="text-3xl font-bold">${Number(totalEarnings).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("payouts.total_available")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${Number(balance).toFixed(2)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Min payout: ${MIN_PAYOUT}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("wallet.pending_payments")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${Number(pendingPayments).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("wallet.paid_amount")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${Number(paidAmount).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6" aria-label="Tabs">
          {[
            { id: "overview" as const, label: "Earnings & Transactions" },
            { id: "payouts" as const, label: "Payouts & Bank" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════════ TAB: Earnings ═══════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{t("wallet.transactions")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No transactions yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>{t("table.payment_amount")}</TableHead>
                      <TableHead>{t("table.date")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((trx) => (
                      <TableRow key={trx.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 font-mono text-xs">
                          {trx.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                          ${Number(trx.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{formatDate(trx.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={trx.status === "completed" ? "success" : "warning"}>
                            {trx.status === "completed" ? t("status.paid") : t("status.pending")}
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
      )}

      {/* ═══════════════ TAB: Payouts & Bank ═══════════════ */}
      {activeTab === "payouts" && (
        <div className="space-y-6">

          {/* Request Payout */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> {t("payouts.request_payout")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {payoutSuccess && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Payout requested successfully!
                </div>
              )}
              {payoutError && (
                <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {payoutError}
                </div>
              )}
              <form onSubmit={handleRequestPayout} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USD)</label>
                  <Input
                    type="number"
                    min={MIN_PAYOUT}
                    max={balance}
                    step="0.01"
                    required
                    placeholder={`Min $${MIN_PAYOUT}`}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    disabled={isRequesting}
                  />
                </div>
                <Button type="submit" disabled={isRequesting || !canRequestPayout} className="w-full sm:w-auto whitespace-nowrap">
                  {isRequesting ? "Processing…" : t("payouts.request_payout")}
                </Button>
              </form>
              {!canRequestPayout && !bankDetails.accountName && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Please configure your bank account details below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bank Account */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <CardTitle className="text-base">Bank Account</CardTitle>
                {bankDetails.accountName && verificationBadge()}
              </div>
              {!isEditingBank && (
                <Button variant="outline" size="sm" onClick={() => { setEditForm(bankDetails); setIsEditingBank(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> {t("common.edit")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {isEditingBank ? (
                <form onSubmit={handleSaveBankDetails} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("payouts.bank_account_name")}</label>
                      <Input required value={editForm.accountName} onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("payouts.account_number")}</label>
                      <Input required value={editForm.accountNumber} onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("payouts.ifsc_code")}</label>
                      <Input required value={editForm.ifscCode} onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("payouts.bank_name")}</label>
                      <Input required value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Updating bank details will require re-verification. Payouts are paused until verified.
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" size="sm">Save & Submit for Verification</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingBank(false)}>
                      <X className="w-3.5 h-3.5 mr-1" /> {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              ) : bankDetails.accountName ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Account Name</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{bankDetails.accountName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Account Number</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">IFSC Code</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{bankDetails.ifscCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Bank Name</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{bankDetails.bankName || "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No bank account configured.{" "}
                  <button
                    onClick={() => setIsEditingBank(true)}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Add bank details
                  </button>
                </div>
              )}
              {bankDetails.verificationStatus === "pending" && !isEditingBank && (
                <div className="mt-4 flex items-center gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">Bank details under review. Usually 1–2 business days.</p>
                  <Button size="sm" variant="outline" onClick={handleVerifyBank}>Simulate Verify</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{t("payouts.history")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payoutHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No payout requests yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>{t("table.date")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 font-mono text-xs">
                          {po.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                          ${Number(po.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{formatDate(po.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={po.status === "paid" ? "success" : po.status === "rejected" ? "error" : "warning"}>
                            {po.status === "paid" ? t("status.paid") : po.status === "rejected" ? "Rejected" : t("status.processing")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {po.status === "paid" ? (
                            <button onClick={() => handleDownloadReceipt(po)} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                              <Download className="w-4 h-4" /> Download
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
