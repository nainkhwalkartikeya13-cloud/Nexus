"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const inviteToken = searchParams.get("inviteToken");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.error) {
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      // If logging in via invite accept screen
      if (inviteToken) {
        const acceptReq = await fetch(`/api/invite/${inviteToken}`, { method: "POST" });
        if (acceptReq.ok) {
          toast.success("Joined organization successfully!");
          router.push("/dashboard");
          return;
        }
      }

      toast.success("Welcome back!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
      setIsLoading(false);
    }
  };

  const containerMotion = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      },
    },
  };

  const itemMotion = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerMotion}
      initial="hidden"
      animate="visible"
      className="glass-card p-8 sm:p-10 rounded-[2rem] border border-border-default w-full bg-surface/50 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <motion.div variants={itemMotion} className="mb-10 text-center">
        <h1 className="text-3xl font-display font-black text-text-primary mb-2 tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm font-medium text-text-muted">Sign in to your workspace</p>
      </motion.div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <motion.div variants={itemMotion} className="space-y-1.5">
          <Input
            {...form.register("email")}
            type="email"
            placeholder="name@company.com"
            icon={<Mail className="h-4 w-4" />}
            className={cn(
              "h-12 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
              form.formState.errors.email && "border-danger focus:ring-danger/20"
            )}
            disabled={isLoading}
          />
          <AnimatePresence>
            {form.formState.errors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-semibold text-danger ml-1"
              >
                {form.formState.errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemMotion} className="space-y-1.5">
          <div className="relative">
            <Input
              {...form.register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              className={cn(
                "h-12 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
                form.formState.errors.password && "border-danger focus:ring-danger/20"
              )}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <AnimatePresence>
            {form.formState.errors.password && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-semibold text-danger ml-1"
              >
                {form.formState.errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-accent hover:text-accent-text transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemMotion} className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemMotion}>
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-default"></div>
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider text-text-muted">
            <span className="bg-surface px-4 py-1 rounded-full border border-border-default shadow-sm">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" type="button" className="h-11 bg-surface border-border-default hover:bg-bg-hover shadow-sm text-text-secondary font-semibold">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
          <Button variant="secondary" type="button" className="h-11 bg-surface border-border-default hover:bg-bg-hover shadow-sm text-text-secondary font-semibold">
            <svg className="w-4 h-4 mr-2 text-text-primary fill-current" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemMotion} className="mt-8 text-center text-sm font-medium">
        <span className="text-text-muted">Don&apos;t have an account? </span>
        <Link
          href={`/register${inviteToken ? `?inviteToken=${inviteToken}` : ''}`}
          className="text-text-primary font-bold hover:text-accent transition-colors"
        >
          Create workspace &rarr;
        </Link>
      </motion.div>
    </motion.div>
  );
}
