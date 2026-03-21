"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, User, Building, Check } from "lucide-react";
import toast from "react-hot-toast";

import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  organizationName: z.string().min(2, "Workspace name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z.boolean().refine(v => v === true, {
    message: "You must agree to the Terms of Service",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", organizationName: "", email: "", password: "", terms: false },
  });

  const watchPassword = form.watch("password", "");

  /* ── Password Strength Logic ── */
  const strength = useMemo(() => {
    let score = 0;
    if (watchPassword.length >= 8) score++;
    if (/[A-Z]/.test(watchPassword)) score++;
    if (/[0-9]/.test(watchPassword)) score++;
    if (/[^A-Za-z0-9]/.test(watchPassword)) score++;
    return score;
  }, [watchPassword]);

  const strengthColor =
    strength <= 1 ? "bg-red-500" :
      strength === 2 ? "bg-orange-500" :
        strength === 3 ? "bg-yellow-500" :
          "bg-emerald-500";

  const strengthLabel =
    strength <= 1 ? "Weak" :
      strength === 2 ? "Fair" :
        strength === 3 ? "Good" :
          "Strong";


  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          orgName: data.organizationName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      // If registered via invite, accept the invite before logging in
      if (inviteToken) {
        // We log them in via credentials first to establish the session needed for the accept endpoint
        const signInRes = await signIn("credentials", {
          redirect: false,
          email: data.email,
          password: data.password,
        });

        if (signInRes?.ok && !signInRes.error) {
          const acceptReq = await fetch(`/api/invite/${inviteToken}`, { method: "POST" });
          if (!acceptReq.ok) {
            toast.error("Account created, but invite failed. Please contact admin.");
          } else {
            toast.success("Account created and organization joined!");
          }
          router.push("/dashboard");
          return;
        }
      }

      // Normal signup flow
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (signInRes?.error) {
        toast.error("Account created but failed to sign in");
      } else {
        toast.success("Workspace created successfully!");
        router.push("/dashboard");
        router.refresh();
      }

    } catch {
      toast.error("Something went wrong");
      setIsLoading(false);
    }
  };

  const containerMotion = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.05 } },
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
          Create workspace
        </h1>
        <p className="text-sm font-medium text-text-muted">Get started in 30 seconds</p>
      </motion.div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <motion.div variants={itemMotion} className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Input
              {...form.register("name")}
              placeholder="Full Name"
              icon={<User className="h-4 w-4" />}
              className={cn(
                "h-11 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
                form.formState.errors.name && "border-danger focus:ring-danger/20"
              )}
              disabled={isLoading}
            />
            <AnimatePresence>
              {form.formState.errors.name && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-semibold text-danger ml-1">
                  {form.formState.errors.name.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1.5">
            <Input
              {...form.register("organizationName")}
              placeholder="Workspace Name"
              icon={<Building className="h-4 w-4" />}
              className={cn(
                "h-11 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
                form.formState.errors.organizationName && "border-danger focus:ring-danger/20"
              )}
              disabled={isLoading}
            />
            <AnimatePresence>
              {form.formState.errors.organizationName && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-semibold text-danger ml-1">
                  {form.formState.errors.organizationName.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemMotion} className="space-y-1.5">
          <Input
            {...form.register("email")}
            type="email"
            placeholder="Work Email"
            icon={<Mail className="h-4 w-4" />}
            className={cn(
              "h-11 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
              form.formState.errors.email && "border-danger focus:ring-danger/20"
            )}
            disabled={isLoading}
          />
          <AnimatePresence>
            {form.formState.errors.email && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-semibold text-danger ml-1">
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
              placeholder="Create Password"
              icon={<Lock className="h-4 w-4" />}
              className={cn(
                "h-11 bg-bg-surface/50 backdrop-blur-sm border-border-default focus:ring-4 focus:ring-accent/10 focus:border-accent/40 shadow-sm transition-all text-text-primary placeholder:text-text-muted/60",
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

          {/* Password Strength Meter */}
          {watchPassword.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-2">
              <div className="flex gap-1 h-1 w-full bg-border-default/50 rounded-full overflow-hidden">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-full w-1/4 transition-all duration-300",
                      strength >= level ? strengthColor : "bg-transparent"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className={cn("font-bold uppercase tracking-wider", `text-${strengthColor.replace('bg-', '')}`)}>
                  {strengthLabel}
                </span>
                <div className="flex gap-2.5 text-text-muted font-medium">
                  <span className={cn("flex items-center gap-0.5", watchPassword.length >= 8 && "text-emerald-500")}>
                    <Check className="w-3 h-3" /> 8+ chars
                  </span>
                  <span className={cn("flex items-center gap-0.5", /[A-Z]/.test(watchPassword) && "text-emerald-500")}>
                    <Check className="w-3 h-3" /> uppercase
                  </span>
                  <span className={cn("flex items-center gap-0.5", /[0-9]/.test(watchPassword) && "text-emerald-500")}>
                    <Check className="w-3 h-3" /> number
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {form.formState.errors.password && !watchPassword.length && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-semibold text-danger ml-1">
                {form.formState.errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemMotion} className="pt-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={form.watch("terms")}
              onCheckedChange={(c: boolean | "indeterminate") => form.setValue("terms", c === true, { shouldValidate: true })}
              className="mt-1 border-border-default data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <label htmlFor="terms" className="text-xs font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-text-secondary cursor-pointer">
              I agree to the <span className="text-text-primary font-bold hover:text-accent transition-colors">Terms of Service</span> and <span className="text-text-primary font-bold hover:text-accent transition-colors">Privacy Policy</span>
            </label>
          </div>
          <AnimatePresence>
            {form.formState.errors.terms && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-semibold text-danger ml-6 mt-1">
                {form.formState.errors.terms.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemMotion} className="pt-3">
          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating workspace...
              </>
            ) : (
              "Create workspace \u2192"
            )}
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemMotion} className="mt-8 text-center text-sm font-medium">
        <span className="text-text-muted">Already have an account? </span>
        <Link
          href={`/login${inviteToken ? `?inviteToken=${inviteToken}` : ''}`}
          className="text-text-primary font-bold hover:text-accent transition-colors"
        >
          Sign in &rarr;
        </Link>
      </motion.div>
    </motion.div>
  );
}
