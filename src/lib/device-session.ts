import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "msp_device_id";

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android Device";
  if (/iPhone|iPad/i.test(ua)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
}

export async function registerDeviceSession(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  // Check if user is admin (admins bypass device limits)
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) {
    // Admin: just upsert session, no limits
    await supabase.from("device_sessions").upsert(
      { user_id: userId, device_id: deviceId, device_name: deviceName, is_active: true, is_approved: true, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,device_id" }
    );
    return { allowed: true };
  }

  // Check existing active sessions for this user on OTHER devices
  const { data: existingSessions } = await supabase
    .from("device_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .neq("device_id", deviceId);

  if (existingSessions && existingSessions.length > 0) {
    // Check if this device has an approved session
    const { data: thisDevice } = await supabase
      .from("device_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .single();

    if (thisDevice?.is_approved) {
      // This device was approved by admin, deactivate others
      await supabase
        .from("device_sessions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .neq("device_id", deviceId);
    } else {
      // Not approved - block login
      return { allowed: false, message: "You are already logged in on another device. Please ask your admin to approve this device." };
    }
  }

  // Register/update this device session
  await supabase.from("device_sessions").upsert(
    { user_id: userId, device_id: deviceId, device_name: deviceName, is_active: true, is_approved: true, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id,device_id" }
  );

  return { allowed: true };
}

export async function clearDeviceSession(userId: string) {
  const deviceId = getDeviceId();
  await supabase
    .from("device_sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("device_id", deviceId);
}
