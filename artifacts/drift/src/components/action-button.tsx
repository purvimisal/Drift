import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  icon?: ReactNode;
}

export function ActionButton({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '',
  disabled,
  ...props 
}: ActionButtonProps) {
  
  const baseStyles = "relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-medium transition-all duration-300 outline-none overflow-hidden";
  
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60",
    ghost: "bg-transparent text-muted-foreground hover:bg-black/5 hover:text-foreground active:bg-black/10 border border-transparent hover:border-border/50",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed transform-none shadow-none' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin opacity-70" />
      ) : (
        <>
          {icon && <span className="opacity-80">{icon}</span>}
          <span>{children}</span>
        </>
      )}
      
      {/* Soft overlay effect on hover for primary */}
      {variant === 'primary' && !disabled && !isLoading && (
        <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
      )}
    </motion.button>
  );
}
