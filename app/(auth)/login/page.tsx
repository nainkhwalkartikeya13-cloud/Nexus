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
