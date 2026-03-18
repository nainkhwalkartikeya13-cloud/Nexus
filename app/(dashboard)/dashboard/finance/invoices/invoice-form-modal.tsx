"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { formatCurrency, CURRENCY_LIST } from "@/lib/currency";
import toast from "react-hot-toast";

interface Client {
    id: string;
    name: string;
    email: string;
    company: string | null;
    currency: string;
}

interface LineItem {
    description: string;
    quantity: number;
    rate: number;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function InvoiceFormModal({ onClose, onSuccess }: Props) {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [clientId, setClientId] = useState("");
    const [currency, setCurrency] = useState("INR");
    const [taxRate, setTaxRate] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
    });
    const [items, setItems] = useState<LineItem[]>([
        { description: "", quantity: 1, rate: 0 },
    ]);

    useEffect(() => {
        fetch("/api/clients")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setClients(data);
            });
    }, []);

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount - discount;

    const addItem = () => setItems([...items, { description: "", quantity: 1, rate: 0 }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], [field]: value };
        setItems(updated);
    };

    const handleSubmit = async (status: "DRAFT" | "SENT") => {
        if (!clientId) return toast.error("Please select a client");
        if (items.some((i) => !i.description || i.rate <= 0)) {
            return toast.error("Please fill in all line items");
        }

        setLoading(true);
        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    currency,
                    items: items.map((i) => ({
                        description: i.description,
                        quantity: Number(i.quantity),
                        rate: Number(i.rate),
                    })),
                    taxRate: Number(taxRate),
                    discount: Number(discount),
                    notes,
                    dueDate,
                    status,
                }),
            });

            if (res.ok) {
                toast.success(status === "DRAFT" ? "Invoice saved as draft!" : "Invoice created and sent! 🎉");
                onSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create invoice");
            }
        } catch {
            toast.error("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-bg-surface z-10 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-lg font-display font-bold text-text-primary">New Invoice</h2>
                            <p className="text-xs text-text-muted">Create a professional invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Client & Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Client *</label>
                            <select
                                value={clientId}
                                onChange={(e) => {
                                    setClientId(e.target.value);
                                    const c = clients.find((cl) => cl.id === e.target.value);
                                    if (c) setCurrency(c.currency);
                                }}
                                className="w-full px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                            >
                                <option value="">Select client...</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Currency</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                            >
                                {CURRENCY_LIST.map((c) => (
                                    <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Due Date *</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">Line Items</label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-3 px-1">
                                <span className="col-span-5 text-[9px] font-bold text-text-subtle uppercase tracking-widest">Description</span>
                                <span className="col-span-2 text-[9px] font-bold text-text-subtle uppercase tracking-widest">Qty</span>
                                <span className="col-span-2 text-[9px] font-bold text-text-subtle uppercase tracking-widest">Rate</span>
                                <span className="col-span-2 text-[9px] font-bold text-text-subtle uppercase tracking-widest text-right">Amount</span>
                                <span className="col-span-1" />
                            </div>
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                                    <input
                                        className="col-span-5 px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        placeholder="Service description"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="col-span-2 px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                                        min={1}
                                    />
                                    <input
                                        type="number"
                                        className="col-span-2 px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        placeholder="0.00"
                                        value={item.rate || ""}
                                        onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                                        min={0}
                                    />
                                    <div className="col-span-2 text-right text-sm font-black text-text-primary">
                                        {formatCurrency(item.quantity * item.rate, currency)}
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(idx)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addItem}
                                className="flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-text transition-colors py-2"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Line Item
                            </button>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-bg-base border border-border rounded-xl text-sm font-medium text-text-primary placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none h-24"
                                    placeholder="Payment terms, bank details, etc."
                                />
                            </div>
                        </div>

                        <div className="bg-bg-base border border-border rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-muted font-medium">Subtotal</span>
                                <span className="font-bold text-text-primary">{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-text-muted font-medium flex-shrink-0">Discount</span>
                                <input
                                    type="number"
                                    value={discount || ""}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-24 ml-auto px-2 py-1 bg-bg-surface border border-border rounded-lg text-sm text-right font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                    placeholder="0"
                                    min={0}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-text-muted font-medium flex-shrink-0">Tax Rate (%)</span>
                                <input
                                    type="number"
                                    value={taxRate || ""}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                    className="w-24 ml-auto px-2 py-1 bg-bg-surface border border-border rounded-lg text-sm text-right font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                    placeholder="0"
                                    min={0}
                                    max={100}
                                />
                            </div>
                            {taxAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted font-medium">Tax ({taxRate}%)</span>
                                    <span className="font-bold text-text-primary">{formatCurrency(taxAmount, currency)}</span>
                                </div>
                            )}
                            <div className="border-t border-border pt-3 flex items-center justify-between">
                                <span className="text-sm font-black text-text-primary uppercase tracking-widest">Total</span>
                                <span className="text-xl font-black text-accent">{formatCurrency(total, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-bg-hover/30 rounded-b-2xl">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="secondary" onClick={() => handleSubmit("DRAFT")} loading={loading}>
                        Save Draft
                    </Button>
                    <Button onClick={() => handleSubmit("SENT")} loading={loading}>
                        Create & Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
