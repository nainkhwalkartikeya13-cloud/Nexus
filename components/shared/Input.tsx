"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, icon, className, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="w-full space-y-1.5">
                <div className="relative">
                    {/* Left icon */}
                    {icon && (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            {icon}
                        </span>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        placeholder={props.placeholder || " "}
                        className={cn(
                            // base
                            "peer w-full rounded-lg bg-bg-base text-text-primary",
                            "border border-border placeholder:text-text-subtle",
                            "text-sm transition-all duration-200 outline-none",
                            // placeholder visibility
                            "placeholder:opacity-0 focus:placeholder:opacity-100",
                            // padding — adjust for icon / label
                            icon ? "pl-10 pr-4" : "px-4",
                            label ? "pt-5 pb-2" : "py-2.5",
                            // focus ring
                            "focus:border-accent focus:ring-4 focus:ring-accent/5",
                            // error
                            error &&
                            "border-danger focus:border-danger focus:ring-danger/5",
                            className
                        )}
                        {...props}
                    />

                    {/* Floating label */}
                    {label && (
                        <label
                            htmlFor={inputId}
                            className={cn(
                                "pointer-events-none absolute left-4 transition-all duration-200 text-text-secondary select-none font-bold",
                                "top-1/2 -translate-y-1/2 text-sm",
                                icon && "left-10",
                                // Floating states using peer utilities
                                "peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-accent peer-focus:font-extrabold peer-focus:uppercase peer-focus:tracking-tight peer-focus:translate-y-0",
                                "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-accent peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-tight peer-[:not(:placeholder-shown)]:translate-y-0"
                            )}
                        >
                            {label}
                        </label>
                    )}
                </div>

                {/* Error message */}
                {error && (
                    <p className="text-xs text-danger flex items-center gap-1">
                        <span>⚠</span>
                        {error}
                    </p>
                )}

                {/* Hint */}
                {!error && hint && (
                    <p className="text-xs text-text-muted">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
