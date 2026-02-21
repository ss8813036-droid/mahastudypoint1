
-- Add chat_enabled column to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
