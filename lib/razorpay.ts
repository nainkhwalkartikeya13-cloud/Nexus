import Razorpay from "razorpay";

function getRazorpay() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error(
            "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. Add them to your .env file to enable billing features."
        );
    }

    return new Razorpay({
        key_id,
        key_secret,
    });
}

/** Lazy-initialised Razorpay instance — avoids crashing at import when keys are absent */
let _razorpay: Razorpay | null = null;
export function razorpay() {
    if (!_razorpay) _razorpay = getRazorpay();
    return _razorpay;
}

export async function createSubscription({
    planId,
    customerId,
}: {
    planId: string;
    customerId: string;
}) {
    // customer_id and customer_notify are valid Razorpay API params but missing from SDK types
    const params = {
        plan_id: planId,
        customer_id: customerId,
        total_count: 120, // max billing cycles (10 years for monthly)
        customer_notify: 1,
    };
    return razorpay().subscriptions.create(
        params as Parameters<ReturnType<typeof razorpay>["subscriptions"]["create"]>[0]
    );
}

export async function createCustomer(email: string, name: string) {
    return razorpay().customers.create({
        email,
        name,
        fail_existing: 0 // Returns the existing customer if email matches
    });
}

export async function getCustomerInvoices(customerId: string) {
    const invoices = await razorpay().invoices.all({
        customer_id: customerId,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return invoices.items.map((inv: any) => ({
        id: inv.id,
        number: inv.receipt || inv.id,
        amount: (inv.amount ?? 0) / 100, // Razorpay amounts are in paise
        currency: inv.currency,
        status: inv.status,
        date: inv.created_at ? new Date(inv.created_at * 1000).toISOString() : null,
        pdfUrl: inv.short_url,
        hostedUrl: inv.short_url,
    }));
}

export async function cancelSubscription(subscriptionId: string) {
    return razorpay().subscriptions.cancel(subscriptionId);
}
