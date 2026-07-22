"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 8, ...props }, ref) => <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-100 shadow-2xl", className)} {...props} /></TooltipPrimitive.Portal>);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
