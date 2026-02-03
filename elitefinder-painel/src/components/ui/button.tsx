import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "default", size = "default", ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            default: "bg-emerald-600 text-white hover:bg-emerald-700",
            outline: "border border-gray-600 bg-transparent text-gray-300 hover:bg-white/10",
            ghost: "hover:bg-white/10 text-gray-300",
            destructive: "bg-red-600 text-white hover:bg-red-700"
        };

        const sizes = {
            default: "h-10 px-4 py-2 text-sm",
            sm: "h-8 px-3 text-xs",
            lg: "h-12 px-8 text-base",
            icon: "h-10 w-10"
        };

        return (
            <button
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
