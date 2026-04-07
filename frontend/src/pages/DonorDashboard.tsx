import { Anchor, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const DonorDashboard = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-10 right-10 text-accent/20">
        <Leaf className="h-32 w-32 rotate-45" />
      </div>
      <div className="absolute bottom-10 left-10 text-lavender/20">
        <Leaf className="h-24 w-24 -rotate-12" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-warm-lg p-8"
      >
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6">
            <Anchor className="h-7 w-7 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Welcome to your Donor Portal
          </h1>
          <p className="text-muted-foreground text-sm mt-2 text-center">
            Your dashboard is ready. More features coming soon.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DonorDashboard;

