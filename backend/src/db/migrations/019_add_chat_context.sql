-- Migration 019: Add context to chats table
-- Created: 2025-10-21

-- Add context column to store contextual information about the chat
-- This will store JSONB data like: { personId, personName, personAddress, personGender }
ALTER TABLE chats
ADD COLUMN context JSONB;

COMMENT ON COLUMN chats.context IS 'Contextual information about the chat (e.g., current person being viewed)';
