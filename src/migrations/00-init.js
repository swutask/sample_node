'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
    -- DROP TYPE public."enum_activities_type";
    CREATE TYPE public."enum_activities_type" AS ENUM('task', 'book');
    -- DROP TYPE public."enum_discounts_type";
    CREATE TYPE public."enum_discounts_type" AS ENUM('coupon', 'credit');
    -- DROP TYPE public."enum_inbox_activities_status";
    CREATE TYPE public."enum_inbox_activities_status" AS ENUM('read', 'unread');
    -- DROP TYPE public."enum_inbox_activities_type";
    CREATE TYPE public."enum_inbox_activities_type" AS ENUM('private', 'public');
    -- DROP TYPE public."enum_message_status_status";
    CREATE TYPE public."enum_message_status_status" AS ENUM('read', 'unread');
    -- DROP TYPE public."enum_notifications_category";
    CREATE TYPE public."enum_notifications_category" AS ENUM('personal', 'general');
    -- DROP TYPE public."enum_notifications_status";
    CREATE TYPE public."enum_notifications_status" AS ENUM('read', 'unread');
    -- DROP TYPE public."enum_share_links_mode";
    CREATE TYPE public."enum_share_links_mode" AS ENUM('read', 'write');
    -- DROP TYPE public."enum_tasks_position";
    CREATE TYPE public."enum_tasks_position" AS ENUM('0', '1', '2', '3');
    -- DROP TYPE public."enum_team_accesses_mode";
    CREATE TYPE public."enum_team_accesses_mode" AS ENUM('read', 'write');
    `);

    await queryInterface.sequelize.query(`
    -- public.app_versions definition
-- Drop table
-- DROP TABLE public.app_versions;
CREATE TABLE public.app_versions (
    id serial4 NOT NULL, windows int4 NULL, mac int4 NULL, iphone int4 NULL, android int4 NULL, CONSTRAINT app_versions_pkey PRIMARY KEY (id)
);

-- public.apple_pay_receipts definition

-- Drop table

-- DROP TABLE public.apple_pay_receipts;

CREATE TABLE public.apple_pay_receipts (
    id serial4 NOT NULL, "data" text NOT NULL, created_at timestamptz NOT NULL, CONSTRAINT apple_pay_receipts_pkey PRIMARY KEY (id)
);

-- public.apple_pay_webhooks definition

-- Drop table

-- DROP TABLE public.apple_pay_webhooks;

CREATE TABLE public.apple_pay_webhooks (
    id serial4 NOT NULL, "data" text NOT NULL, created_at timestamptz NOT NULL, CONSTRAINT apple_pay_webhooks_pkey PRIMARY KEY (id)
);

-- public."betaTests" definition

-- Drop table

-- DROP TABLE public."betaTests";

CREATE TABLE public."betaTests" (
    id serial4 NOT NULL, uuid uuid NOT NULL, "name" varchar(1024) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, CONSTRAINT "betaTests_pkey" PRIMARY KEY (id), CONSTRAINT "betaTests_uuid_key" UNIQUE (uuid), CONSTRAINT "betaTests_uuid_key1" UNIQUE (uuid)
);

-- public."plans" definition

-- Drop table

-- DROP TABLE public."plans";

CREATE TABLE public."plans" (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, provider varchar(255) NULL, "data" jsonb NULL, max_size int8 NOT NULL, max_books int4 NOT NULL, max_members int4 NULL, max_clients int4 NULL, max_projects int4 NOT NULL, recurring_period int2 NULL, recurring_per varchar(10) NULL, price numeric(10, 2) NOT NULL, price_per_month numeric(10, 2) NOT NULL, "version" int4 NULL, single_file_size int8 NOT NULL, max_tasks int4 NOT NULL, created_at timestamptz NOT NULL, CONSTRAINT plans_pkey PRIMARY KEY (id)
);

-- public.reactions definition

-- Drop table

-- DROP TABLE public.reactions;

CREATE TABLE public.reactions (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, CONSTRAINT reactions_pkey PRIMARY KEY (id)
);

-- public.roles definition

-- Drop table

-- DROP TABLE public.roles;

CREATE TABLE public.roles (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, CONSTRAINT roles_name_key UNIQUE (name), CONSTRAINT roles_name_key1 UNIQUE (name), CONSTRAINT roles_pkey PRIMARY KEY (id)
);

-- public.stripe_webhooks definition

-- Drop table

-- DROP TABLE public.stripe_webhooks;

CREATE TABLE public.stripe_webhooks (
    id serial4 NOT NULL, "data" text NOT NULL, created_at timestamptz NOT NULL, CONSTRAINT stripe_webhooks_pkey PRIMARY KEY (id)
);

-- public.team_roles definition

-- Drop table

-- DROP TABLE public.team_roles;

CREATE TABLE public.team_roles (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, CONSTRAINT team_roles_name_key UNIQUE (name), CONSTRAINT team_roles_name_key1 UNIQUE (name), CONSTRAINT team_roles_pkey PRIMARY KEY (id)
);

-- public.team_verifications definition

-- Drop table

-- DROP TABLE public.team_verifications;

CREATE TABLE public.team_verifications (
    id serial4 NOT NULL, email varchar(255) NOT NULL, code int4 NOT NULL, expire_at timestamptz NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, CONSTRAINT team_verifications_pkey PRIMARY KEY (id)
);

-- public."betaTesters" definition

-- Drop table

-- DROP TABLE public."betaTesters";

CREATE TABLE public."betaTesters" (
    id serial4 NOT NULL, email varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, beta_test_id int4 NULL, CONSTRAINT "betaTesters_pkey" PRIMARY KEY (id), CONSTRAINT "betaTesters_beta_test_id_fkey" FOREIGN KEY (beta_test_id) REFERENCES public."betaTests" (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
    id serial4 NOT NULL, email varchar(255) NOT NULL, "password" varchar(255) NOT NULL, email_confirmed_at timestamptz NULL, is_password bool NULL DEFAULT true, is_client bool NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, role_id int4 NULL, CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_email_key1 UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (id), CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.activities definition

-- Drop table

-- DROP TABLE public.activities;

CREATE TABLE public.activities (
    id serial4 NOT NULL, "data" jsonb NOT NULL, "type" public."enum_activities_type" NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, creator_id int4 NULL, related_user_id int4 NULL, CONSTRAINT activities_pkey PRIMARY KEY (id), CONSTRAINT activities_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT activities_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.avatars definition

-- Drop table

-- DROP TABLE public.avatars;

CREATE TABLE public.avatars (
    id serial4 NOT NULL, "size" int4 NOT NULL, mime_type varchar(255) NOT NULL, "key" varchar(255) NOT NULL, url varchar(255) NOT NULL, created_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT avatars_pkey PRIMARY KEY (id), CONSTRAINT avatars_url_key UNIQUE (url), CONSTRAINT avatars_url_key1 UNIQUE (url), CONSTRAINT avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.clients definition

-- Drop table

-- DROP TABLE public.clients;

CREATE TABLE public.clients (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT clients_pkey PRIMARY KEY (id), CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.facebook_users definition

-- Drop table

-- DROP TABLE public.facebook_users;

CREATE TABLE public.facebook_users (
    id varchar(255) NOT NULL, profile jsonb NOT NULL, refresh_token varchar(255) NULL, access_token varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT facebook_users_pkey PRIMARY KEY (id), CONSTRAINT facebook_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.google_calendar_users definition

-- Drop table

-- DROP TABLE public.google_calendar_users;

CREATE TABLE public.google_calendar_users (
    id serial4 NOT NULL, refresh_token varchar(255) NULL, access_token varchar(255) NOT NULL, channel_id varchar(255) NULL, resource_id varchar(255) NULL, active bool NULL DEFAULT true, add_to_google bool NULL DEFAULT true, email varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT google_calendar_users_pkey PRIMARY KEY (id), CONSTRAINT google_calendar_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.google_users definition

-- Drop table

-- DROP TABLE public.google_users;

CREATE TABLE public.google_users (
    id varchar(255) NOT NULL, profile jsonb NOT NULL, refresh_token varchar(255) NULL, access_token varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT google_users_pkey PRIMARY KEY (id), CONSTRAINT google_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.onboardings definition

-- Drop table

-- DROP TABLE public.onboardings;

CREATE TABLE public.onboardings (
    id serial4 NOT NULL, show_book_onboarding bool NOT NULL DEFAULT true, show_project_onboarding bool NOT NULL DEFAULT true, show_task_onboarding bool NOT NULL DEFAULT true, show_week_planner_onboarding bool NOT NULL DEFAULT true, show_chat_onboarding bool NOT NULL DEFAULT true, show_file_onboarding bool NOT NULL DEFAULT true, show_team_dashboard_onboarding bool NOT NULL DEFAULT true, show_post_onboarding bool NOT NULL DEFAULT true, show_overview_onboarding bool NOT NULL DEFAULT true, show_calendar_onboarding bool NOT NULL DEFAULT true, show_timeline_onboarding bool NOT NULL DEFAULT true, show_new_look_onboarding bool NOT NULL DEFAULT true, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT onboardings_pkey PRIMARY KEY (id), CONSTRAINT onboardings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.profiles definition

-- Drop table

-- DROP TABLE public.profiles;

CREATE TABLE public.profiles (
    id serial4 NOT NULL, user_name varchar(255) NULL, first_name varchar(255) NULL, last_name varchar(255) NULL, show_book_onboarding bool NOT NULL DEFAULT false, show_project_onboarding bool NOT NULL DEFAULT false, show_upgrade_to_pro int4 NOT NULL DEFAULT 0, has_personal bool NOT NULL DEFAULT true, color varchar(255) NULL, "location" varchar(255) NULL, timezone varchar(255) NULL, timezone_name varchar(255) NULL, "position" varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT profiles_pkey PRIMARY KEY (id), CONSTRAINT profiles_user_name_key UNIQUE (user_name), CONSTRAINT profiles_user_name_key1 UNIQUE (user_name), CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX profiles_user_id ON public.profiles USING btree (user_id);

-- public.reaction_to_messages definition

-- Drop table

-- DROP TABLE public.reaction_to_messages;

CREATE TABLE public.reaction_to_messages (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, reaction_id int4 NULL, CONSTRAINT reaction_to_messages_pkey PRIMARY KEY (id), CONSTRAINT reaction_to_messages_reaction_id_fkey FOREIGN KEY (reaction_id) REFERENCES public.reactions (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT reaction_to_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.settings definition

-- Drop table

-- DROP TABLE public.settings;

CREATE TABLE public.settings (
    id serial4 NOT NULL, "mode" varchar(255) NOT NULL DEFAULT 'Paperless'::character varying, column_width varchar(255) NOT NULL DEFAULT 'Normal'::character varying, font_size varchar(255) NOT NULL DEFAULT 'Large'::character varying, font_family varchar(255) NOT NULL DEFAULT 'Inter'::character varying, theme varchar(255) NOT NULL DEFAULT 'Magenta'::character varying, book_view varchar(255) NOT NULL DEFAULT 'Card'::character varying, line_height varchar(255) NOT NULL DEFAULT '1.6'::character varying, grammar_check bool NOT NULL DEFAULT false, task_ordering bool NOT NULL DEFAULT false, task_full_screen bool NOT NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT settings_pkey PRIMARY KEY (id), CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX settings_user_id ON public.settings USING btree (user_id);

-- public.teams definition

-- Drop table

-- DROP TABLE public.teams;

CREATE TABLE public.teams (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, info varchar(255) NULL, link varchar(255) NOT NULL, invite_link varchar(255) NULL, "size" int4 NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, CONSTRAINT teams_invite_link_key UNIQUE (invite_link), CONSTRAINT teams_invite_link_key1 UNIQUE (invite_link), CONSTRAINT teams_link_key UNIQUE (link), CONSTRAINT teams_link_key1 UNIQUE (link), CONSTRAINT teams_pkey PRIMARY KEY (id), CONSTRAINT teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.templates definition

-- Drop table

-- DROP TABLE public.templates;

CREATE TABLE public.templates (
    id serial4 NOT NULL, title varchar(255) NOT NULL, project_title varchar(255) NOT NULL, "content" text NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, CONSTRAINT templates_pkey PRIMARY KEY (id), CONSTRAINT templates_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.temporary_clients definition

-- Drop table

-- DROP TABLE public.temporary_clients;

CREATE TABLE public.temporary_clients (
    id serial4 NOT NULL, email varchar(255) NOT NULL, book_ids varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, CONSTRAINT temporary_clients_pkey PRIMARY KEY (id), CONSTRAINT temporary_clients_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.temporary_members definition

-- Drop table

-- DROP TABLE public.temporary_members;

CREATE TABLE public.temporary_members (
    id serial4 NOT NULL, email varchar(255) NOT NULL, book_ids varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, team_role_id int4 NULL, CONSTRAINT temporary_members_pkey PRIMARY KEY (id), CONSTRAINT temporary_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT temporary_members_team_role_id_fkey FOREIGN KEY (team_role_id) REFERENCES public.team_roles (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.announcements definition

-- Drop table

-- DROP TABLE public.announcements;

CREATE TABLE public.announcements (
    id serial4 NOT NULL, title varchar(40) NOT NULL, sub_title varchar(140) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, CONSTRAINT announcements_pkey PRIMARY KEY (id), CONSTRAINT announcements_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.book_folders definition

-- Drop table

-- DROP TABLE public.book_folders;

CREATE TABLE public.book_folders (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, favorite bool NOT NULL DEFAULT false, icon varchar(255) NULL, archived_at timestamptz NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, CONSTRAINT book_folders_pkey PRIMARY KEY (id), CONSTRAINT book_folders_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.books definition

-- Drop table

-- DROP TABLE public.books;

CREATE TABLE public.books (
    id serial4 NOT NULL, title varchar(1024) NOT NULL, sub_title text NULL, color varchar(255) NULL, is_section bool NOT NULL DEFAULT false, is_sample bool NOT NULL DEFAULT false, archived_at timestamptz NULL, favorite bool NOT NULL DEFAULT false, icon varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, book_folder_id int4 NULL, CONSTRAINT books_pkey PRIMARY KEY (id), CONSTRAINT books_book_folder_id_fkey FOREIGN KEY (book_folder_id) REFERENCES public.book_folders (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT books_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT books_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.calendars definition

-- Drop table

-- DROP TABLE public.calendars;

CREATE TABLE public.calendars (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, CONSTRAINT calendars_pkey PRIMARY KEY (id), CONSTRAINT calendars_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT calendars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.client_to_teams definition

-- Drop table

-- DROP TABLE public.client_to_teams;

CREATE TABLE public.client_to_teams (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, client_id int4 NULL, team_id int4 NULL, CONSTRAINT client_to_teams_client_id_team_id_key UNIQUE (client_id, team_id), CONSTRAINT client_to_teams_pkey PRIMARY KEY (id), CONSTRAINT client_to_teams_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients (id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT client_to_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- public.discounts definition

-- Drop table

-- DROP TABLE public.discounts;

CREATE TABLE public.discounts (
    id serial4 NOT NULL, "type" public."enum_discounts_type" NOT NULL, amount int4 NOT NULL, external_id varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, CONSTRAINT discounts_pkey PRIMARY KEY (id), CONSTRAINT discounts_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.filters definition

-- Drop table

-- DROP TABLE public.filters;

CREATE TABLE public.filters (
    id serial4 NOT NULL, task text NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, user_id int4 NULL, CONSTRAINT filters_pkey PRIMARY KEY (id), CONSTRAINT filters_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.inboxes definition

-- Drop table

-- DROP TABLE public.inboxes;

CREATE TABLE public.inboxes (
    id serial4 NOT NULL, muted_until timestamptz NULL, receive_email_notifications bool NULL, receive_weekly_personal_email_notifications bool NULL, receive_weekly_general_email_notifications bool NULL, receive_task_deadline_notifications bool NULL, email_project_invite bool NULL, email_role_change bool NULL, email_task_assign bool NULL, email_task_unassign bool NULL, email_task_change bool NULL, email_task_comment_add bool NULL, email_task_completed bool NULL, email_chat_message_receive bool NULL, email_mention_create bool NULL, push_project_invite bool NULL, push_role_change bool NULL, push_task_assign bool NULL, push_task_unassign bool NULL, push_task_change bool NULL, push_task_comment_add bool NULL, push_task_completed bool NULL, push_chat_message_receive bool NULL, push_mention_create bool NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, CONSTRAINT inboxes_pkey PRIMARY KEY (id), CONSTRAINT inboxes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT inboxes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.logs definition

-- Drop table

-- DROP TABLE public.logs;

CREATE TABLE public.logs (
    id serial4 NOT NULL, code int4 NULL, message varchar(255) NULL, stack text NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, CONSTRAINT logs_pkey PRIMARY KEY (id), CONSTRAINT logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.onboarding_task_settings definition

-- Drop table

-- DROP TABLE public.onboarding_task_settings;

CREATE TABLE public.onboarding_task_settings (
    id serial4 NOT NULL, is_closed bool NOT NULL DEFAULT false, completed_tasks_count int2 NOT NULL DEFAULT 0, video_watched bool NOT NULL DEFAULT false, project_created bool NOT NULL DEFAULT false, tasks_created bool NOT NULL DEFAULT false, tasks_grouped bool NOT NULL DEFAULT false, profile_completed bool NOT NULL DEFAULT false, team_member_invited bool NOT NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, CONSTRAINT onboarding_task_settings_pkey PRIMARY KEY (id), CONSTRAINT onboarding_task_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.projects definition

-- Drop table

-- DROP TABLE public.projects;

CREATE TABLE public.projects (
    id serial4 NOT NULL, title text NOT NULL, body text NULL, "document" json NULL, "order" int4 NOT NULL DEFAULT 9999, is_locked bool NULL DEFAULT false, state text NULL, icon varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, user_id int4 NULL, parent_id int4 NULL, CONSTRAINT projects_pkey PRIMARY KEY (id), CONSTRAINT projects_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT projects_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.share_links definition

-- Drop table

-- DROP TABLE public.share_links;

CREATE TABLE public.share_links (
    id varchar(255) NOT NULL, is_active bool NULL DEFAULT true, "mode" public."enum_share_links_mode" NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, project_id int4 NULL, CONSTRAINT share_links_pkey PRIMARY KEY (id), CONSTRAINT share_links_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT share_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX share_links_project_id ON public.share_links USING btree (project_id);

-- public.stripe_users definition

-- Drop table

-- DROP TABLE public.stripe_users;

CREATE TABLE public.stripe_users (
    id serial4 NOT NULL, stripe_id varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, CONSTRAINT stripe_users_pkey PRIMARY KEY (id), CONSTRAINT stripe_users_stripe_id_key UNIQUE (stripe_id), CONSTRAINT stripe_users_stripe_id_key1 UNIQUE (stripe_id), CONSTRAINT stripe_users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT stripe_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX stripe_users_user_id ON public.stripe_users USING btree (user_id);

-- public.subscriptions definition

-- Drop table

-- DROP TABLE public.subscriptions;

CREATE TABLE public.subscriptions (
    id serial4 NOT NULL, "data" jsonb NOT NULL, is_cancelled bool NULL DEFAULT false, is_active bool NULL DEFAULT true, expire_at timestamptz NULL, "version" int4 NOT NULL DEFAULT 2, extendable bool NULL DEFAULT true, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, plan_id int4 NULL, team_id int4 NULL, CONSTRAINT subscriptions_pkey PRIMARY KEY (id), CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans" (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT subscriptions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.task_rows definition

-- Drop table

-- DROP TABLE public.task_rows;

CREATE TABLE public.task_rows (
    id serial4 NOT NULL, title varchar(255) NOT NULL, color int4 NULL, "order" int4 NOT NULL DEFAULT 9999, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, book_id int4 NULL, CONSTRAINT task_rows_pkey PRIMARY KEY (id), CONSTRAINT task_rows_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_rows_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_rows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.task_tags definition

-- Drop table

-- DROP TABLE public.task_tags;

CREATE TABLE public.task_tags (
    id serial4 NOT NULL, "name" varchar(255) NULL, color int4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, CONSTRAINT task_tags_pkey PRIMARY KEY (id), CONSTRAINT task_tags_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.tasks definition

-- Drop table

-- DROP TABLE public.tasks;

CREATE TABLE public.tasks (
    id serial4 NOT NULL, title text NOT NULL, sub_title text NULL, additional_info text NULL, is_sample bool NOT NULL DEFAULT false, is_urgent bool NOT NULL DEFAULT false, is_today bool NOT NULL DEFAULT false, urgent_status int4 NULL, story_points int2 NULL, completed_at timestamptz NULL, "position" public."enum_tasks_position" NOT NULL DEFAULT '0'::enum_tasks_position, "order" int4 NOT NULL DEFAULT 9999, end_date date NULL, start_date date NULL, external_id varchar(255) NULL, rrule varchar(255) NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, team_id int4 NULL, book_id int4 NULL, project_id int4 NULL, task_row_id int4 NULL, parent_id int4 NULL, moved_from_task_id int4 NULL, CONSTRAINT tasks_pkey PRIMARY KEY (id), CONSTRAINT tasks_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_moved_from_task_id_fkey FOREIGN KEY (moved_from_task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_task_row_id_fkey FOREIGN KEY (task_row_id) REFERENCES public.task_rows (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.team_accesses definition

-- Drop table

-- DROP TABLE public.team_accesses;

CREATE TABLE public.team_accesses (
    id serial4 NOT NULL, "mode" public."enum_team_accesses_mode" NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, other_team_id int4 NULL, team_id int4 NULL, project_id int4 NULL, user_id int4 NULL, CONSTRAINT team_accesses_other_team_id_team_id_key UNIQUE (other_team_id, team_id), CONSTRAINT team_accesses_pkey PRIMARY KEY (id), CONSTRAINT team_accesses_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT team_accesses_other_team_id_fkey FOREIGN KEY (other_team_id) REFERENCES public.users (id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT team_accesses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT team_accesses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT team_accesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.team_logos definition

-- Drop table

-- DROP TABLE public.team_logos;

CREATE TABLE public.team_logos (
    id serial4 NOT NULL, "size" int4 NOT NULL, mime_type varchar(255) NOT NULL, "key" varchar(255) NOT NULL, url varchar(255) NOT NULL, created_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, user_id int4 NULL, CONSTRAINT team_logos_pkey PRIMARY KEY (id), CONSTRAINT team_logos_url_key UNIQUE (url), CONSTRAINT team_logos_url_key1 UNIQUE (url), CONSTRAINT team_logos_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT team_logos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.team_members definition

-- Drop table

-- DROP TABLE public.team_members;

CREATE TABLE public.team_members (
    id serial4 NOT NULL, has_billing_access bool NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, team_id int4 NULL, user_id int4 NULL, team_role_id int4 NULL, CONSTRAINT team_members_pkey PRIMARY KEY (id), CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT team_members_team_role_id_fkey FOREIGN KEY (team_role_id) REFERENCES public.team_roles (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public."templateAttachments" definition

-- Drop table

-- DROP TABLE public."templateAttachments";

CREATE TABLE public."templateAttachments" (
    id serial4 NOT NULL, "key" varchar(255) NOT NULL, is_thumbnail bool NOT NULL DEFAULT false, url varchar(255) NOT NULL, created_at timestamptz NOT NULL, deleted_at timestamptz NULL, template_id int4 NULL, user_id int4 NULL, CONSTRAINT "templateAttachments_pkey" PRIMARY KEY (id), CONSTRAINT "templateAttachments_url_key" UNIQUE (url), CONSTRAINT "templateAttachments_url_key1" UNIQUE (url), CONSTRAINT "templateAttachments_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "templateAttachments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.template_orders definition

-- Drop table

-- DROP TABLE public.template_orders;

CREATE TABLE public.template_orders (
    id serial4 NOT NULL, "order" int4 NOT NULL DEFAULT 9999, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, template_id int4 NULL, user_id int4 NULL, CONSTRAINT template_orders_pkey PRIMARY KEY (id), CONSTRAINT template_orders_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT template_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.book_activities definition

-- Drop table

-- DROP TABLE public.book_activities;

CREATE TABLE public.book_activities (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, activity_id int4 NULL, book_id int4 NULL, team_id int4 NULL, CONSTRAINT book_activities_pkey PRIMARY KEY (id), CONSTRAINT book_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT book_activities_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT book_activities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.book_links definition

-- Drop table

-- DROP TABLE public.book_links;

CREATE TABLE public.book_links (
    id serial4 NOT NULL, "name" varchar(255) NOT NULL, description varchar(255) NULL, url varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, CONSTRAINT book_links_pkey PRIMARY KEY (id), CONSTRAINT book_links_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.book_orders definition

-- Drop table

-- DROP TABLE public.book_orders;

CREATE TABLE public.book_orders (
    id serial4 NOT NULL, "order" int4 NOT NULL DEFAULT 9999, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, book_folder_id int4 NULL, user_id int4 NULL, CONSTRAINT book_orders_pkey PRIMARY KEY (id), CONSTRAINT book_orders_book_folder_id_fkey FOREIGN KEY (book_folder_id) REFERENCES public.book_folders (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT book_orders_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT book_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX book_orders_user_id_book_folder_id ON public.book_orders USING btree (user_id, book_folder_id);

CREATE UNIQUE INDEX book_orders_user_id_book_id ON public.book_orders USING btree (user_id, book_id);

-- public."comments" definition

-- Drop table

-- DROP TABLE public."comments";

CREATE TABLE public."comments" (
    id serial4 NOT NULL, body varchar(255) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, project_id int4 NULL, user_id int4 NULL, parent_id int4 NULL, CONSTRAINT comments_pkey PRIMARY KEY (id), CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public."comments" (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT comments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.inbox_activities definition

-- Drop table

-- DROP TABLE public.inbox_activities;

CREATE TABLE public.inbox_activities (
    id serial4 NOT NULL, status public."enum_inbox_activities_status" NOT NULL DEFAULT 'unread'::enum_inbox_activities_status, "type" public."enum_inbox_activities_type" NOT NULL DEFAULT 'public'::enum_inbox_activities_type, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, activity_id int4 NULL, inbox_id int4 NULL, team_id int4 NULL, task_id int4 NULL, CONSTRAINT inbox_activities_pkey PRIMARY KEY (id), CONSTRAINT inbox_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT inbox_activities_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.inboxes (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT inbox_activities_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT inbox_activities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.tag_to_tasks definition

-- Drop table

-- DROP TABLE public.tag_to_tasks;

CREATE TABLE public.tag_to_tasks (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, task_id int4 NULL, tag_id int4 NULL, CONSTRAINT tag_to_tasks_pkey PRIMARY KEY (id), CONSTRAINT tag_to_tasks_task_id_tag_id_key UNIQUE (task_id, tag_id), CONSTRAINT tag_to_tasks_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.task_tags (id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT tag_to_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.task_activities definition

-- Drop table

-- DROP TABLE public.task_activities;

CREATE TABLE public.task_activities (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, activity_id int4 NULL, task_id int4 NULL, team_id int4 NULL, CONSTRAINT task_activities_pkey PRIMARY KEY (id), CONSTRAINT task_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_activities_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_activities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- public.task_subscriptions definition

-- Drop table

-- DROP TABLE public.task_subscriptions;

CREATE TABLE public.task_subscriptions (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, task_id int4 NULL, user_id int4 NULL, CONSTRAINT task_subscriptions_pkey PRIMARY KEY (id), CONSTRAINT task_subscriptions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX task_subscriptions_task_id_user_id ON public.task_subscriptions USING btree (task_id, user_id);

-- public.task_to_members definition

-- Drop table

-- DROP TABLE public.task_to_members;

CREATE TABLE public.task_to_members (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, task_id int4 NULL, team_member_id int4 NULL, CONSTRAINT task_to_members_pkey PRIMARY KEY (id), CONSTRAINT task_to_members_task_id_team_member_id_key UNIQUE (task_id, team_member_id), CONSTRAINT task_to_members_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT task_to_members_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- public.annotations definition

-- Drop table

-- DROP TABLE public.annotations;

CREATE TABLE public.annotations (
    id serial4 NOT NULL, "text" text NOT NULL, x int8 NOT NULL, y int8 NOT NULL, resolved_at timestamptz NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, attachment_id int4 NULL, team_id int4 NULL, message_id int4 NULL, CONSTRAINT annotations_pkey PRIMARY KEY (id)
);

-- public.attachments definition

-- Drop table

-- DROP TABLE public.attachments;

CREATE TABLE public.attachments (
    id serial4 NOT NULL, "size" int4 NOT NULL, mime_type varchar(255) NOT NULL, "key" varchar(255) NOT NULL, url varchar(255) NULL, "name" varchar(255) NULL, is_task_thumbnail bool NOT NULL DEFAULT false, show_in_modal bool NOT NULL DEFAULT false, show_in_card bool NOT NULL DEFAULT false, "order" int2 NOT NULL DEFAULT 999, external_version varchar(255) NULL, "version" int2 NULL DEFAULT 1, status int2 NULL, created_at timestamptz NOT NULL, deleted_at timestamptz NULL, user_id int4 NULL, book_id int4 NULL, team_id int4 NULL, project_id int4 NULL, task_id int4 NULL, message_id int4 NULL, original_id int4 NULL, CONSTRAINT attachments_pkey PRIMARY KEY (id), CONSTRAINT attachments_url_key UNIQUE (url), CONSTRAINT attachments_url_key1 UNIQUE (url)
);

-- public.chat_settings definition

-- Drop table

-- DROP TABLE public.chat_settings;

CREATE TABLE public.chat_settings (
    id serial4 NOT NULL, muted_at timestamptz NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, chat_id int4 NULL, user_id int4 NULL, CONSTRAINT chat_settings_pkey PRIMARY KEY (id)
);

-- public.chats definition

-- Drop table

-- DROP TABLE public.chats;

CREATE TABLE public.chats (
    id serial4 NOT NULL, is_main bool NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, attachment_id int4 NULL, book_id int4 NULL, team_id int4 NULL, task_id int4 NULL, CONSTRAINT chats_pkey PRIMARY KEY (id)
);

-- public.message_status definition

-- Drop table

-- DROP TABLE public.message_status;

CREATE TABLE public.message_status (
    id serial4 NOT NULL, status public."enum_message_status_status" NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, chat_id int4 NULL, message_id int4 NULL, user_id int4 NULL, CONSTRAINT message_status_pkey PRIMARY KEY (id)
);

-- public.messages definition

-- Drop table

-- DROP TABLE public.messages;

CREATE TABLE public.messages (
    id serial4 NOT NULL, "text" text NOT NULL, resolved_at timestamptz NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, chat_id int4 NULL, user_id int4 NULL, thread_id int4 NULL, reply_id int4 NULL, CONSTRAINT messages_pkey PRIMARY KEY (id)
);

-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications (
    id serial4 NOT NULL, title int4 NOT NULL, category public."enum_notifications_category" NOT NULL DEFAULT 'general'::enum_notifications_category, old_book_title varchar(255) NULL, message varchar(255) NULL, status public."enum_notifications_status" NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, book_id int4 NULL, chat_id int4 NULL, comment_id int4 NULL, inbox_id int4 NULL, user_id int4 NULL, team_id int4 NULL, team_member_id int4 NULL, project_id int4 NULL, attachment_id int4 NULL, task_id int4 NULL, chat_message_id int4 NULL, CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- public.private_chat definition

-- Drop table

-- DROP TABLE public.private_chat;

CREATE TABLE public.private_chat (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, chat_id int4 NULL, creator_id int4 NULL, member_id int4 NULL, CONSTRAINT private_chat_pkey PRIMARY KEY (id)
);

-- public.reaction_to_chat_message definition

-- Drop table

-- DROP TABLE public.reaction_to_chat_message;

CREATE TABLE public.reaction_to_chat_message (
    id serial4 NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz NULL, message_id int4 NULL, reaction_id int4 NULL, user_id int4 NULL, CONSTRAINT reaction_to_chat_message_pkey PRIMARY KEY (id)
);

-- public.annotations foreign keys

ALTER TABLE public.annotations
ADD CONSTRAINT annotations_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.annotations
ADD CONSTRAINT annotations_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.annotations
ADD CONSTRAINT annotations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.attachments foreign keys

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_original_id_fkey FOREIGN KEY (original_id) REFERENCES public.attachments (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.chat_settings foreign keys

ALTER TABLE public.chat_settings
ADD CONSTRAINT chat_settings_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.chat_settings
ADD CONSTRAINT chat_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.chats foreign keys

ALTER TABLE public.chats
ADD CONSTRAINT chats_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.chats
ADD CONSTRAINT chats_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.chats
ADD CONSTRAINT chats_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.chats
ADD CONSTRAINT chats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.message_status foreign keys

ALTER TABLE public.message_status
ADD CONSTRAINT message_status_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.message_status
ADD CONSTRAINT message_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.message_status
ADD CONSTRAINT message_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.messages foreign keys

ALTER TABLE public.messages
ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT messages_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.messages (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.messages (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.notifications foreign keys

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_chat_message_id_fkey FOREIGN KEY (chat_message_id) REFERENCES public.messages (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public."comments" (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.inboxes (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.private_chat foreign keys

ALTER TABLE public.private_chat
ADD CONSTRAINT private_chat_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.private_chat
ADD CONSTRAINT private_chat_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.private_chat
ADD CONSTRAINT private_chat_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- public.reaction_to_chat_message foreign keys

ALTER TABLE public.reaction_to_chat_message
ADD CONSTRAINT reaction_to_chat_message_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.reaction_to_chat_message
ADD CONSTRAINT reaction_to_chat_message_reaction_id_fkey FOREIGN KEY (reaction_id) REFERENCES public.reactions (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.reaction_to_chat_message
ADD CONSTRAINT reaction_to_chat_message_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL ON UPDATE CASCADE;
    `);
  }
};
