import { z } from "zod";

const envSchema = z
    .object({
        DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

        // NextAuth v5 supports both AUTH_SECRET and NEXTAUTH_SECRET
        NEXTAUTH_SECRET: z.string().min(1).optional(),
        AUTH_SECRET: z.string().min(1).optional(),
        NEXTAUTH_URL: z.string().url().optional(),
        AUTH_URL: z.string().url().optional(),

        NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

        // Email — at least one of Resend or SMTP
        RESEND_API_KEY: z.string().optional(),
        SMTP_HOST: z.string().optional(),
        SMTP_PORT: z.string().optional(),
        SMTP_USER: z.string().optional(),
        SMTP_PASSWORD: z.string().optional(),
        SMTP_FROM: z.string().optional(),

        // Stripe
        STRIPE_SECRET_KEY: z.string().optional(),
        STRIPE_WEBHOOK_SECRET: z.string().optional(),
        STRIPE_PRO_PRICE_ID: z.string().optional(),
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

        // OAuth (optional)
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        GITHUB_CLIENT_ID: z.string().optional(),
        GITHUB_CLIENT_SECRET: z.string().optional(),

        // Legacy Razorpay (kept for backward compat)
        RAZORPAY_KEY_ID: z.string().optional(),
        RAZORPAY_KEY_SECRET: z.string().optional(),
        RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    })
    .refine((d) => d.NEXTAUTH_SECRET || d.AUTH_SECRET, {
        message: "Either NEXTAUTH_SECRET or AUTH_SECRET must be set",
        path: ["AUTH_SECRET"],
    })
    .refine((d) => d.NEXTAUTH_URL || d.AUTH_URL, {
        message: "Either NEXTAUTH_URL or AUTH_URL must be set",
        path: ["AUTH_URL"],
    });

function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        const missing = parsed.error.issues
            .map((i) => `  ✖ ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(
            `\n[Nexus] Missing or invalid environment variables:\n${missing}\n\nCheck your .env file.\n`
        );
    }

    const data = parsed.data;

    // Soft warnings for optional-but-needed features
    if (!data.RESEND_API_KEY && !data.SMTP_USER) {
        console.warn("[Nexus] No email provider configured (RESEND_API_KEY or SMTP_USER). Emails will not be sent.");
    }
    if (!data.STRIPE_SECRET_KEY) {
        console.warn("[Nexus] STRIPE_SECRET_KEY not set — billing features disabled.");
    }

    return data;
}

// Only validate at runtime (not during Edge middleware or build)
export const env =
    typeof window === "undefined"
        ? validateEnv()
        : ({} as ReturnType<typeof validateEnv>);
