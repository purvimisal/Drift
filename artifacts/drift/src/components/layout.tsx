import { ReactNode } from "react";
import { motion } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Abstract gentle background element */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/drift-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content wrapper */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
