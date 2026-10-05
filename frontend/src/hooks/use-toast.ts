import { toast as toastManager } from "@/components/ui/toast";

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
};

export function useToast() {
  return {
    toast: (props: ToastProps) => {
      // Base UI toast manager supports calling it as a function or using methods
      // We adapt the old shadcn API to the new Base UI toast
      const options = {
        title: props.title,
        description: props.description,
        type: props.variant === "destructive" ? "error" : "success",
      };
      
      if (typeof (toastManager as any) === "function") {
        (toastManager as any)(options);
      } else if (typeof (toastManager as any).create === "function") {
        (toastManager as any).create(options);
      }
    },
    dismiss: (toastId?: string) => {
      // dismiss logic if needed
    },
  };
}
