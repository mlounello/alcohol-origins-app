-- Migration: Add moderator to user_role enum
-- ============================================
-- NOTE: This must be run FIRST and committed before 003_moderator_policies.sql
-- PostgreSQL requires new enum values to be committed before they can be used

-- Add 'moderator' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator' BEFORE 'admin';
