import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAppSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 30000,
  });

  const isEnabled = (key: string, defaultValue = true) => {
    if (!settings) return defaultValue;
    return settings[key] !== "false";
  };

  const getValue = (key: string, defaultValue = "") => {
    return settings?.[key] || defaultValue;
  };

  return { settings, isLoading, isEnabled, getValue };
}
