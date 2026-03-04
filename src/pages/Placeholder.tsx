import { Construction } from "lucide-react";
import { motion } from "framer-motion";

const Placeholder = ({ title }: { title: string }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-md">
        Esta secção está em desenvolvimento. Em breve poderá aceder a todas as funcionalidades.
      </p>
    </motion.div>
  );
};

export default Placeholder;
