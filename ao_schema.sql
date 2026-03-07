--
-- PostgreSQL database dump
--

\restrict ZbKdpb0sfxaC8sN8yfoXIHnMe1OBNq8CpXO33uh4wSgSkpyKDarFnEDNls8JpZB

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'viewer',
    'contributor',
    'editor',
    'moderator',
    'admin'
);


--
-- Name: get_next_revision_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_revision_number(p_beverage_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(MAX(revision_number), 0) + 1
  FROM public.beverage_revisions
  WHERE beverage_id = p_beverage_id;
$$;


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'viewer'::user_role
  );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    beverage_id uuid,
    beverage_name text,
    revision_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: beverage_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beverage_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    color text DEFAULT '#808080'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: beverage_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beverage_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beverage_id uuid NOT NULL,
    revision_number integer NOT NULL,
    data jsonb NOT NULL,
    edited_by uuid NOT NULL,
    edit_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_fields text[]
);


--
-- Name: beverages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beverages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "group" text NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    origin_region text,
    origin_country text,
    date_text text NOT NULL,
    date_year integer,
    parent_id text,
    description text,
    ingredients text[],
    production_method text,
    citation text,
    image_url text,
    current_revision_id uuid,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS ((((setweight(to_tsvector('english'::regconfig, COALESCE(name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(node_id, ''::text)), 'A'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(origin_region, ''::text)), 'C'::"char"))) STORED,
    is_locked boolean DEFAULT false NOT NULL,
    approval_status text DEFAULT 'approved'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    moderator_notes text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    role public.user_role DEFAULT 'viewer'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    banned_at timestamp with time zone,
    banned_reason text
);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: beverage_groups beverage_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_groups
    ADD CONSTRAINT beverage_groups_name_key UNIQUE (name);


--
-- Name: beverage_groups beverage_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_groups
    ADD CONSTRAINT beverage_groups_pkey PRIMARY KEY (id);


--
-- Name: beverage_revisions beverage_revisions_beverage_id_revision_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_revisions
    ADD CONSTRAINT beverage_revisions_beverage_id_revision_number_key UNIQUE (beverage_id, revision_number);


--
-- Name: beverage_revisions beverage_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_revisions
    ADD CONSTRAINT beverage_revisions_pkey PRIMARY KEY (id);


--
-- Name: beverages beverages_node_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_node_id_key UNIQUE (node_id);


--
-- Name: beverages beverages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_beverage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_beverage ON public.activity_log USING btree (beverage_id);


--
-- Name: idx_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_date ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);


--
-- Name: idx_beverage_groups_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverage_groups_sort ON public.beverage_groups USING btree (sort_order);


--
-- Name: idx_beverages_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_approval_status ON public.beverages USING btree (approval_status);


--
-- Name: idx_beverages_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_coords ON public.beverages USING btree (latitude, longitude);


--
-- Name: idx_beverages_date_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_date_year ON public.beverages USING btree (date_year);


--
-- Name: idx_beverages_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_group ON public.beverages USING btree ("group");


--
-- Name: idx_beverages_node_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_node_id ON public.beverages USING btree (node_id);


--
-- Name: idx_beverages_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_parent_id ON public.beverages USING btree (parent_id);


--
-- Name: idx_beverages_rejected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_rejected_by ON public.beverages USING btree (rejected_by);


--
-- Name: idx_beverages_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_search ON public.beverages USING gin (search_vector);


--
-- Name: idx_beverages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beverages_type ON public.beverages USING btree (type);


--
-- Name: idx_profiles_is_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_banned ON public.profiles USING btree (is_banned);


--
-- Name: idx_revisions_beverage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_beverage ON public.beverage_revisions USING btree (beverage_id, revision_number DESC);


--
-- Name: idx_revisions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_date ON public.beverage_revisions USING btree (created_at DESC);


--
-- Name: idx_revisions_editor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_editor ON public.beverage_revisions USING btree (edited_by);


--
-- Name: beverages beverages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER beverages_updated_at BEFORE UPDATE ON public.beverages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: activity_log activity_log_beverage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_beverage_id_fkey FOREIGN KEY (beverage_id) REFERENCES public.beverages(id) ON DELETE SET NULL;


--
-- Name: activity_log activity_log_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.beverage_revisions(id) ON DELETE SET NULL;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: beverage_revisions beverage_revisions_beverage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_revisions
    ADD CONSTRAINT beverage_revisions_beverage_id_fkey FOREIGN KEY (beverage_id) REFERENCES public.beverages(id) ON DELETE CASCADE;


--
-- Name: beverage_revisions beverage_revisions_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverage_revisions
    ADD CONSTRAINT beverage_revisions_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.profiles(id);


--
-- Name: beverages beverages_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: beverages beverages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: beverages beverages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.beverages(node_id) ON DELETE SET NULL;


--
-- Name: beverages beverages_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles(id);


--
-- Name: beverages beverages_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beverages
    ADD CONSTRAINT beverages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: activity_log Activity log viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Activity log viewable by everyone" ON public.activity_log FOR SELECT USING (true);


--
-- Name: profiles Admins and moderators can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and moderators can update profiles" ON public.profiles FOR UPDATE USING (((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role, 'admin'::public.user_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.is_banned = true)))))));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (((public.get_user_role() = 'admin'::public.user_role) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.is_banned = true)))))));


--
-- Name: beverage_groups Anyone can view groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view groups" ON public.beverage_groups FOR SELECT USING (true);


--
-- Name: beverages Approved beverages are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved beverages are viewable by everyone" ON public.beverages FOR SELECT USING (((approval_status = 'approved'::text) OR (created_by = auth.uid()) OR (public.get_user_role() = ANY (ARRAY['editor'::public.user_role, 'moderator'::public.user_role, 'admin'::public.user_role]))));


--
-- Name: activity_log Authenticated users can insert activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert activity logs" ON public.activity_log FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_banned = true)))))));


--
-- Name: beverage_revisions Contributors can create revisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Contributors can create revisions" ON public.beverage_revisions FOR INSERT WITH CHECK (((public.get_user_role() = ANY (ARRAY['contributor'::public.user_role, 'editor'::public.user_role, 'moderator'::public.user_role, 'admin'::public.user_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_banned = true)))))));


--
-- Name: beverages Contributors can insert beverages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Contributors can insert beverages" ON public.beverages FOR INSERT WITH CHECK (((public.get_user_role() = ANY (ARRAY['contributor'::public.user_role, 'editor'::public.user_role, 'moderator'::public.user_role, 'admin'::public.user_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_banned = true)))))));


--
-- Name: beverages Contributors can update beverages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Contributors can update beverages" ON public.beverages FOR UPDATE USING (((public.get_user_role() = ANY (ARRAY['contributor'::public.user_role, 'editor'::public.user_role, 'moderator'::public.user_role, 'admin'::public.user_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_banned = true)))))));


--
-- Name: beverages Editors, moderators, and admins can delete beverages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors, moderators, and admins can delete beverages" ON public.beverages FOR DELETE USING (((public.get_user_role() = ANY (ARRAY['editor'::public.user_role, 'moderator'::public.user_role, 'admin'::public.user_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_banned = true)))))));


--
-- Name: beverage_groups Moderators and admins can insert groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators and admins can insert groups" ON public.beverage_groups FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['moderator'::public.user_role, 'admin'::public.user_role])) AND (profiles.is_banned = false)))));


--
-- Name: beverage_groups Moderators and admins can update groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators and admins can update groups" ON public.beverage_groups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['moderator'::public.user_role, 'admin'::public.user_role])) AND (profiles.is_banned = false)))));


--
-- Name: beverage_groups Only admins can delete groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete groups" ON public.beverage_groups FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role) AND (profiles.is_banned = false)))));


--
-- Name: profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: beverage_revisions Revisions are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Revisions are viewable by everyone" ON public.beverage_revisions FOR SELECT USING (true);


--
-- Name: profiles Users can update own profile (non-role fields); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile (non-role fields)" ON public.profiles FOR UPDATE USING (((auth.uid() = id) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.is_banned = true))))))) WITH CHECK (((auth.uid() = id) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.is_banned = true)))))));


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: beverage_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beverage_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: beverage_revisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beverage_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: beverages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beverages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ZbKdpb0sfxaC8sN8yfoXIHnMe1OBNq8CpXO33uh4wSgSkpyKDarFnEDNls8JpZB

