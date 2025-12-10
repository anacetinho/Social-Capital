--
-- PostgreSQL database dump
--

\restrict GUj5rWfl9TPEVHACGyhhfCEh7nW3xV0lVbKGrea3fapX5eFsrkiTCFE3SYUKCLf

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_chats_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_chats_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_chats_updated_at() OWNER TO postgres;

--
-- Name: update_last_contact(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_last_contact() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update last_contact_date for all people who participated in this event
  UPDATE people
  SET last_contact_date = (
    SELECT MAX(e.date)
    FROM events e
    JOIN event_participants ep ON ep.event_id = e.id
    WHERE ep.person_id = people.id
  )
  WHERE id IN (
    SELECT person_id
    FROM event_participants
    WHERE event_id = NEW.event_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_contact() OWNER TO postgres;

--
-- Name: update_last_contact_on_event_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_last_contact_on_event_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update last_contact_date for all people who participated in this event
  UPDATE people
  SET last_contact_date = (
    SELECT MAX(e.date)
    FROM events e
    JOIN event_participants ep ON ep.event_id = e.id
    WHERE ep.person_id = people.id
  )
  WHERE id IN (
    SELECT person_id
    FROM event_participants
    WHERE event_id = NEW.id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_contact_on_event_change() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    asset_type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    availability character varying(100),
    estimated_value numeric(15,2),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    address text
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Name: COLUMN assets.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assets.address IS 'Physical address for property/real estate assets';


--
-- Name: biographies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biographies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    person_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    note_date date NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT biographies_note_check CHECK ((length(note) <= 5000))
);


ALTER TABLE public.biographies OWNER TO postgres;

--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    context jsonb
);


ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: TABLE chats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chats IS 'AI assistant conversation threads';


--
-- Name: COLUMN chats.context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chats.context IS 'Contextual information about the chat (e.g., current person being viewed)';


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.event_participants OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    location character varying(255),
    date timestamp without time zone NOT NULL,
    event_type character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: favors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    giver_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    description text NOT NULL,
    date timestamp without time zone NOT NULL,
    status character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    estimated_value numeric(15,2),
    time_commitment character varying(100),
    favor_type character varying(50) DEFAULT 'other'::character varying,
    CONSTRAINT favors_favor_type_check CHECK (((favor_type)::text = ANY ((ARRAY['personal'::character varying, 'professional'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT favors_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'declined'::character varying])::text[])))
);


ALTER TABLE public.favors OWNER TO postgres;

--
-- Name: COLUMN favors.estimated_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.favors.estimated_value IS 'Estimated monetary value of the favor';


--
-- Name: COLUMN favors.time_commitment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.favors.time_commitment IS 'Time commitment for the favor (e.g., "2 hours", "1 day")';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chat_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    tool_calls jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[])))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.messages IS 'Individual messages within AI assistant chats';


--
-- Name: COLUMN messages.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.role IS 'user or assistant';


--
-- Name: COLUMN messages.tool_calls; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.tool_calls IS 'Array of function calls made by the AI (JSON)';


--
-- Name: people; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.people (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    photo_url character varying(500),
    birthday date,
    notes text,
    importance integer,
    last_contact_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    address text,
    linkedin_url character varying(500),
    summary text,
    summary_generated_at timestamp without time zone,
    gender character varying(10) DEFAULT 'male'::character varying NOT NULL,
    CONSTRAINT people_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[]))),
    CONSTRAINT people_importance_check CHECK (((importance >= 1) AND (importance <= 5)))
);


ALTER TABLE public.people OWNER TO postgres;

--
-- Name: COLUMN people.summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.people.summary IS 'AI-generated comprehensive summary aggregating all person data (biographical, professional, relationships, events, favors, assets)';


--
-- Name: COLUMN people.summary_generated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.people.summary_generated_at IS 'Timestamp when summary was last generated or updated';


--
-- Name: COLUMN people.gender; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.people.gender IS 'Gender/sex of the person (male or female) - required field';


--
-- Name: professional_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.professional_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    company character varying(255) NOT NULL,
    "position" character varying(255),
    start_date date,
    end_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.professional_history OWNER TO postgres;

--
-- Name: relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.relationships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    person_a_id uuid NOT NULL,
    person_b_id uuid NOT NULL,
    relationship_type character varying(100),
    strength integer,
    context text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT different_people CHECK ((person_a_id <> person_b_id)),
    CONSTRAINT relationships_strength_check CHECK (((strength >= 1) AND (strength <= 5)))
);


ALTER TABLE public.relationships OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    preferences jsonb DEFAULT '{}'::jsonb,
    ai_assistant_enabled boolean DEFAULT false,
    local_llm_base_url character varying(255) DEFAULT 'http://localhost:1234'::character varying,
    local_llm_model character varying(255) DEFAULT 'llama-2-7b-chat'::character varying,
    ai_max_results integer DEFAULT 100,
    n8n_webhook_url text,
    ai_provider character varying(50) DEFAULT 'mock'::character varying,
    ai_model character varying(255) DEFAULT ''::character varying,
    ai_api_url character varying(500) DEFAULT ''::character varying,
    api_key character varying(500) DEFAULT ''::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.ai_assistant_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.ai_assistant_enabled IS 'Whether the AI assistant is enabled for this user';


--
-- Name: COLUMN users.local_llm_base_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.local_llm_base_url IS 'Base URL for local LLM server (e.g., LM Studio, Ollama)';


--
-- Name: COLUMN users.local_llm_model; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.local_llm_model IS 'Name of the LLM model to use';


--
-- Name: COLUMN users.ai_max_results; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.ai_max_results IS 'Maximum number of items to return in function responses';


--
-- Name: COLUMN users.n8n_webhook_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.n8n_webhook_url IS 'Custom N8N webhook URL for AI assistant. If NULL, uses global N8N_WEBHOOK_URL environment variable.';


--
-- Name: COLUMN users.ai_provider; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.ai_provider IS 'Unified AI provider for both Concordia and AI Assistant (mock, openai, local)';


--
-- Name: COLUMN users.ai_model; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.ai_model IS 'Unified AI model name for both Concordia and AI Assistant';


--
-- Name: COLUMN users.ai_api_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.ai_api_url IS 'Unified API URL for both Concordia and AI Assistant';


--
-- Name: COLUMN users.api_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.api_key IS 'API key for AI provider (encrypted at application layer)';


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assets (id, user_id, owner_id, asset_type, name, description, availability, estimated_value, notes, created_at, updated_at, address) FROM stdin;
44b88360-0c97-48ea-b7fc-102930c1b431	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	property	rental propiety	1 bedroom apartment in alges	by_request	220000.00		2025-11-04 21:45:07.385465	2025-11-04 21:45:07.385465	Rua eduardo augusto pedroso
3aa55e82-b932-444e-9610-5fe1de721529	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	property	Alges 	3 apartments (rental proprieties	by_request	300000.00	All currently rented out	2025-11-06 10:47:30.795019	2025-11-06 10:47:30.795019	Rua Eduardo Augusto Pedroso 9, Algés
77bbaddd-1ce3-40ab-88d1-f2e9541e8238	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	property	Casa Lourinha	Main Residence	always	299999.98	Built from scracth with sustainable materials	2025-11-06 10:57:38.660805	2025-11-06 10:57:38.660805	Moledo, Lourinha
79f2686e-2511-4aa6-bd1d-0957b6e691d8	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	property	Casa Trinas	2 bedroom luxury apartment in the center of lisbon. rental propriety generating income for ana roque	never	500000.00	ihnerited from her mother	2025-11-06 23:47:38.039057	2025-11-06 23:47:38.039057	Rua das trinas, Lisboa, Portugal
9f9b2009-b585-4399-b418-4086b406fd1f	a51ee058-d30a-4698-ac16-be45993882f0	748846b5-0244-45f7-b9d2-e8f1a831aeda	other	Miscelaneous 	No proprieties.\n2 motorcilces\nmoney	never	35000.00		2025-11-08 15:18:51.283563	2025-11-08 15:18:51.283563	
6288ebf5-9fd8-4b03-ae2d-682211cbaa89	a51ee058-d30a-4698-ac16-be45993882f0	6855ff5d-b807-47e6-9e36-d40ad7f5549b	other	Miscelaneous	No proprieties.\nmoney	never	80000.00		2025-11-08 15:19:51.160339	2025-11-08 15:19:51.160339	
ecb7b2de-cf47-4174-ab31-9b5c5664471a	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	property	Vacation house	Vacation house in Tavira 	always	750000.00	Could be generating a lot of money but Eduarda refuse to rent as it was her old family's house	2025-11-08 16:23:50.959132	2025-11-08 16:24:06.388933	Tavira, Portugal
7a53ed60-7b64-488f-b5b6-0e1fa60242a7	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	property	Manin residence	4 bedroom apartmenet in the city center/ business district	always	750000.00		2025-11-08 16:24:57.456306	2025-11-08 16:24:57.456306	Avenida João Crisostomo, Lisboa
0940aa53-a0d5-4e1c-b71b-fcd7374f419b	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	property	Rental Proprieties	1,5 apartment rented out in Algés	by_request	300000.00		2025-11-08 16:25:41.545435	2025-11-08 16:25:41.545435	Rua Eduardo Augusto Pedroso 9, Algés
25b60c86-fdc1-409b-a5be-4a238d9d3836	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	property	Quinta Ovar	4/6 of a farm house 	by_request	1000000.00	Money pit, but could be worth something if sold	2025-11-08 16:26:39.393955	2025-11-08 16:26:39.393955	Largo 1º de Dezembro, Ovar
9fd72de0-da2e-411e-b39c-c174c055f4ac	a51ee058-d30a-4698-ac16-be45993882f0	149cf7b9-160e-439f-b7d7-f823fb9def9a	property	Main residence	5 bedroom apartment with garage and garden in the center of lisbon	by_request	1350000.00	Gifted in part by his father in law	2025-11-08 16:35:22.827641	2025-11-08 16:35:22.827641	Rua das trinas 39, Lisboa
5e74e165-9f43-4128-ada7-a75254fea050	a51ee058-d30a-4698-ac16-be45993882f0	5cbc0107-4b6f-49e1-bd8a-29cc210ed5f7	property	Main Residence	4 bedroom apartment, with a pool a garage space	by_request	1450000.00		2025-11-08 17:30:00.139531	2025-11-08 17:30:00.139531	Rua de Santo antonio á estrela
\.


--
-- Data for Name: biographies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.biographies (id, user_id, person_id, title, note_date, note, created_at, updated_at) FROM stdin;
759ecc69-c64c-4cb2-9996-5301c9e63ace	6b80ed8c-a294-4227-833e-bf3d92b02b49	95dcb88c-1da8-4108-99eb-9e4b046de6b8	religious education and family	2021-01-01	All luisas family and her education is deeply rooted in christian tradition	2025-11-04 21:27:51.384095	2025-11-04 21:27:51.384095
cf8f721f-75dc-4c98-8e74-b4afbf98cf38	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	Lived in Mozambique	2013-01-13	Lived and worked in Mozambique for a year	2025-11-04 21:31:37.79957	2025-11-04 21:31:37.79957
deed55dc-532f-425c-b3e1-ac1fd8a727dd	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	Lived in Poland	2016-06-15	Lived and worked in poland for a year	2025-11-04 21:41:35.388884	2025-11-04 21:41:35.388884
6c1dadb0-8304-4c8c-881d-9f7f7b3cd08d	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	Lived in Switzerland	2022-01-01	Lived in switzerland for 2 years. was earning a lot of money (100k+) and came back to be with his family and children. took a severe pay cut when comming back to portugal	2025-11-04 21:44:27.36336	2025-11-04 21:44:27.36336
f9f68326-8e26-4f4e-9e87-33b85c50db29	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	72ec2b95-7b12-4ad7-8964-21de544dfe7a	Moved to switzerland	2018-11-01	Moved from spain to switzerland in search of better job oportunities	2025-11-05 12:36:22.366721	2025-11-05 12:36:22.366721
2d6d169a-4c1b-4431-8f9e-74c191cc3d7b	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	72ec2b95-7b12-4ad7-8964-21de544dfe7a	Layed off	2023-10-15	Was terminated from TAKEDA	2025-11-05 12:37:18.911286	2025-11-05 12:37:18.911286
d61e93a6-a1cd-4441-8291-7f8c05bc2466	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	2 children	2023-04-05	Has 2 children, they are very important to her. definitly a huge priority and her main concern in life, much more than her children	2025-11-05 12:40:47.148957	2025-11-05 12:40:47.148957
fac6ef45-0e00-43a7-a761-63092364275c	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	Personality trait - competitive and full of himself	2023-01-01	Dario is workaholic and very full of himself and competitive	2025-11-05 13:23:21.855711	2025-11-05 13:23:21.855711
fc1fcf51-2da1-4175-8845-9ec23d7fa4b7	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	life	2025-07-01	miguel has 2 children and a wife	2025-11-05 14:46:33.471808	2025-11-05 14:46:33.471808
b5d870e5-df0d-4ef0-858e-5f322f7b039d	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	2 children	2023-11-01	Ana has 2 children, 1 born in 2008 another in 2023, she is married to sinan who is swiss with egipcian ascent	2025-11-05 13:17:33.069952	2025-11-05 14:47:15.199
1a588f02-fc33-4c4e-8e5e-a70d3c7c70a6	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	unemployed	2015-01-07	Was unemployed for a year and a half from February 2014, to August 2015	2025-11-06 11:03:35.598216	2025-11-06 11:03:35.598216
35e4edad-94ac-46a9-9e9f-51addf195147	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	Marriage	2022-11-26	Mariage to Luisa Chaves	2025-11-06 11:04:09.867357	2025-11-06 11:04:09.867357
74930c3f-a854-46e6-9745-ffc021da088b	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	Started dating Luisa	2021-01-16	Met Luisa and started dating	2025-11-06 11:04:52.106147	2025-11-06 11:04:52.106147
7f178444-2b8e-4e4d-9f9a-8b9d0abedcc8	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	death of father	2016-07-21	His father died at 49 as a consequence of health issues i got from past addiction and drinking. Miguel inherited some proprieties in Alges after he died	2025-11-06 11:06:34.280759	2025-11-06 11:06:34.280759
848eb193-f3c7-4638-8967-6470579023a5	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	Worked in Switzerland	2022-01-01	Miguel unexpectedly got a job offer in switzerland and moved there even though he had a girlfriend in portugal.\nhe was earning a lot (130k euros) compared with salaries in his home country (portugal)	2025-11-06 11:08:17.974458	2025-11-06 11:08:17.974458
1b0ee3bc-9ffe-468b-8125-0b08a7a30825	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	Birth of first son	2023-10-10	Birth of his son Vicente	2025-11-06 11:08:47.980823	2025-11-06 11:08:47.980823
ae0468d8-5a34-48ef-8b8d-31f08888a083	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	birth of his second son	2025-05-12	Birth of his daughter Teresa	2025-11-06 11:09:15.088439	2025-11-06 11:09:15.088439
75f3d87c-8a9e-4779-9ad6-09898827a003	a51ee058-d30a-4698-ac16-be45993882f0	6855ff5d-b807-47e6-9e36-d40ad7f5549b	masters in scotland	2015-09-01	moved to scotland for her masters in islamic studies	2025-11-06 11:51:13.786889	2025-11-06 11:51:13.786889
84a91a05-9411-4586-ab2c-102b0f8e9efc	a51ee058-d30a-4698-ac16-be45993882f0	6855ff5d-b807-47e6-9e36-d40ad7f5549b	moved to switzerland	2020-09-01	Moved to switzerland for work	2025-11-06 11:52:20.125362	2025-11-06 11:52:20.125362
b9a5aab0-9479-4aac-b97a-94dee3ce9e8c	a51ee058-d30a-4698-ac16-be45993882f0	6855ff5d-b807-47e6-9e36-d40ad7f5549b	breakup with boyfriend	2025-03-01	sara broke up with her long term boyfriend with whom she planned to build a family with	2025-11-06 12:00:15.390114	2025-11-06 12:00:15.390114
e4f8a4b3-40a3-4db2-b9ad-371e34067009	a51ee058-d30a-4698-ac16-be45993882f0	748846b5-0244-45f7-b9d2-e8f1a831aeda	created a start up	2018-01-01	Created a gaming company , they tried to launch in Porto. it failed in 2021	2025-11-08 15:21:19.777628	2025-11-08 15:21:19.777628
e80baa8e-a558-440b-87eb-297fdcb59cab	a51ee058-d30a-4698-ac16-be45993882f0	748846b5-0244-45f7-b9d2-e8f1a831aeda	broke up with his girlfriend	2021-08-02	his girlfriend (bruna) broke up with him in 2021. since then he has been going on tinder on and off always with dates and hookups but never settling with a girl for more than a month up until today (10/11/2025)	2025-11-08 15:28:07.350568	2025-11-08 15:28:07.350568
d7a50b1d-a87f-4a94-a973-ed7bc854bd24	a51ee058-d30a-4698-ac16-be45993882f0	2341c5c7-adb8-4695-be60-7bdc2ba68557	Birth of her children	2023-10-27	Had 2 children (twins) Male	2025-11-08 15:32:58.448469	2025-11-08 15:32:58.448469
072510a7-9af0-4d23-8434-e91d8352c2d1	a51ee058-d30a-4698-ac16-be45993882f0	b777f217-a719-473e-8661-2ec3874ce3ca	Birth of Son	2015-04-03	Birth of her child (leonardo)	2025-11-08 15:36:10.912883	2025-11-08 15:36:20.495
571c6f79-f2e8-4c7a-93d4-f381f9033689	a51ee058-d30a-4698-ac16-be45993882f0	bbbfad67-f584-47a9-9ada-8781b266689e	Father died	2016-07-20	Her father died after a long decay due to liver problems that came as a consequence of drinking and past drug use	2025-11-08 15:41:53.472878	2025-11-08 15:41:53.472878
3515e4d9-db00-4810-a76e-816b40654074	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	Youth - Carnatian Revolution	1974-04-25	She lived in the US at the time jimmy carter was president.\ncame back to portugal after the carnation revolution and like the socialist party.\nwhen she came back to Portugal her father in law was attorney general of Portugal. i guess those were her golden years.	2025-11-08 15:53:43.266793	2025-11-08 15:53:43.266793
422d90aa-dc75-4a81-9b36-ec0b06daa236	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	died	2016-07-17	died of liver failure	2025-11-08 15:55:36.521141	2025-11-08 15:55:36.521141
e9cee2e4-9588-4d54-8f8d-473c1752f1ef	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	drug abuse	1992-03-01	did heroin an got hepatitis due to needle sharing	2025-11-08 15:56:23.170096	2025-11-08 15:56:23.170096
e05622f5-2f6f-47a3-9cc3-6499a0e3c610	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	DIvorce	2013-04-13	disvorced with no custody of daughter Ines	2025-11-08 15:56:58.692322	2025-11-08 15:56:58.692322
bb563552-3073-49c0-9a9b-03cdf8e8a2ef	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	alcoholism	2007-07-01	spiral deepered and deeper into alcoholism	2025-11-08 15:58:10.828198	2025-11-08 15:58:10.828198
fd312e20-bb3a-40de-a2fa-30fa6512892e	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	first son being born	1988-09-15	First son Miguel Born	2025-11-08 16:02:45.505289	2025-11-08 16:02:45.505289
7fdef62e-640a-49dc-9bac-488f6d996cfb	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	Second son Born	2004-12-09	Birth of daughter Inês	2025-11-08 16:04:44.678577	2025-11-08 16:04:44.678577
5035b649-df5f-4027-8301-984ed6930901	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	Birth of first son	1967-02-13	Birt of her Son RUI	2025-11-08 16:13:46.580958	2025-11-08 16:13:46.580958
6dd2b632-2ff4-4ef7-8cae-03d5cf845351	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	birth of secod son	1970-04-03	birth of second son Pedro	2025-11-08 16:14:29.411545	2025-11-08 16:14:29.411545
8108934e-d5b2-4a8d-a79e-d40135dda193	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	Married	1962-07-03	got married to her husband Mario	2025-11-08 16:15:09.696326	2025-11-08 16:15:09.696326
57b14a60-c7a0-4ec0-a3ce-f4b4a48a1669	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	death of son	2000-05-01	Her son Pedro unecpectadly died in a car crash in scotland where he was taking  his phd	2025-11-08 16:18:42.859171	2025-11-08 16:18:42.859171
e464798b-54ab-4127-a137-a313fcba3d6d	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	Death of husband	2001-05-03	Her husband died after a long battle with cancer	2025-11-08 16:19:19.543478	2025-11-08 16:19:19.543478
1a04cad7-5b9f-4e96-bdd1-3af492f871b8	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	Death of other son	2016-07-19	Her son Rui died after a long decay of his liver disease.	2025-11-08 16:20:03.922579	2025-11-08 16:20:03.922579
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chats (id, user_id, title, created_at, updated_at, context) FROM stdin;
\.


--
-- Data for Name: event_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_participants (id, event_id, person_id, created_at) FROM stdin;
d40eb22c-8f79-4e0f-8eb7-6e66122bb6e9	211b138f-03aa-43f3-89a9-fc5e4dcf4a91	95dcb88c-1da8-4108-99eb-9e4b046de6b8	2025-11-04 21:25:06.700759
46505fd8-2140-4770-aba7-90db83756573	211b138f-03aa-43f3-89a9-fc5e4dcf4a91	50fa52b0-670d-42f8-90d3-aa9042e85bc0	2025-11-04 21:25:06.700759
9bd84414-020d-403f-89f0-18ea7c150f96	c5332f2d-8823-46d0-997b-54efc80873a9	95dcb88c-1da8-4108-99eb-9e4b046de6b8	2025-11-04 21:25:42.306722
ea669382-bf9e-472d-bff1-2f8c335c31e3	c5332f2d-8823-46d0-997b-54efc80873a9	50fa52b0-670d-42f8-90d3-aa9042e85bc0	2025-11-04 21:25:42.306722
77c5032b-1c62-4f2c-8735-9dd798a705fc	af78b5fe-8946-4de8-a933-9ca09432449d	50fa52b0-670d-42f8-90d3-aa9042e85bc0	2025-11-04 21:30:44.358643
5c51fe1f-a95c-466a-9678-eff79f511c94	af78b5fe-8946-4de8-a933-9ca09432449d	95dcb88c-1da8-4108-99eb-9e4b046de6b8	2025-11-04 21:30:44.358643
3471130c-4726-4b84-b66f-2f0e0e303ef8	af78b5fe-8946-4de8-a933-9ca09432449d	fef0de35-80e0-48c4-9870-436f11b8333b	2025-11-04 21:30:44.358643
3652a348-f471-4488-9a38-8c4d90c4b3d0	c514e9ab-1633-4765-8577-13adb229c00d	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	2025-11-05 13:06:07.913722
cd959373-0a40-48a2-9580-ca1fdd6f5467	c514e9ab-1633-4765-8577-13adb229c00d	7a6b9ce8-e636-4e90-a3fa-192ce5810399	2025-11-05 13:06:07.913722
38b07847-96c2-487d-9ccf-a10fd6d3c3e0	c514e9ab-1633-4765-8577-13adb229c00d	a088d0b9-745d-4b5b-b08d-3765221ba02e	2025-11-05 13:06:07.913722
2dd51566-8daa-46e1-b621-d9751344528f	8e28f29a-0000-4f68-9c96-221cd30d3f3f	72ec2b95-7b12-4ad7-8964-21de544dfe7a	2025-11-05 13:08:32.066305
e5009224-78f0-4f65-ad25-518eb59bc048	8e28f29a-0000-4f68-9c96-221cd30d3f3f	bdfa084e-3026-4bfa-8ac3-fd8241ce5fa4	2025-11-05 13:08:32.066305
a75b136c-bec9-413e-8753-34916228dd10	8e28f29a-0000-4f68-9c96-221cd30d3f3f	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	2025-11-05 13:08:32.066305
876f16a2-4d7b-4a3f-9d33-54236601cbc7	8e28f29a-0000-4f68-9c96-221cd30d3f3f	49156c8a-ac11-436f-9b93-cb78ae1fa029	2025-11-05 13:08:32.066305
7f5076ae-5780-44d1-a10e-140c7960167e	8e28f29a-0000-4f68-9c96-221cd30d3f3f	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	2025-11-05 13:08:32.066305
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, user_id, title, description, location, date, event_type, notes, created_at, updated_at) FROM stdin;
211b138f-03aa-43f3-89a9-fc5e4dcf4a91	6b80ed8c-a294-4227-833e-bf3d92b02b49	Birth of 1st child	Male boy named vicente	\N	2023-10-10 00:00:00	personal	\N	2025-11-04 21:25:06.700759	2025-11-04 21:25:06.700759
c5332f2d-8823-46d0-997b-54efc80873a9	6b80ed8c-a294-4227-833e-bf3d92b02b49	Birth of 2nd child	Girl name Teresa	\N	2025-05-12 00:00:00	personal	\N	2025-11-04 21:25:42.306722	2025-11-04 21:25:42.306722
af78b5fe-8946-4de8-a933-9ca09432449d	6b80ed8c-a294-4227-833e-bf3d92b02b49	Wedding		\N	2022-11-26 00:00:00	social	\N	2025-11-04 21:24:19.367207	2025-11-04 21:30:44.358643
c514e9ab-1633-4765-8577-13adb229c00d	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Project rebuild	Fi process rework (7 months) billable\nFeedback from Guy toward isabel was negative\nFeedback from Guy towards João was positive	\N	2025-06-28 00:00:00	professional	\N	2025-11-05 13:02:25.770641	2025-11-05 13:06:07.913722
8e28f29a-0000-4f68-9c96-221cd30d3f3f	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	CSL Project Unify	Design phase for project Unify in CSL (9 months) billable\nFeedback from Manikumar towards Miguel was average\nFeedback from Manikumar towards robert was excelent\nFeedback from carolina towards miguel was good\nFeedback from Carolina towards robert was excelent.\nInternal feedback from robert towards miguel was good.\nfeedback towards ana from everyone was good.	\N	2025-11-05 00:00:00	professional	\N	2025-11-05 13:00:08.702674	2025-11-05 13:08:32.066305
\.


--
-- Data for Name: favors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.favors (id, user_id, giver_id, receiver_id, description, date, status, notes, created_at, updated_at, estimated_value, time_commitment, favor_type) FROM stdin;
e5ece6a7-b01d-4a79-901f-72b38b8ddad4	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	95dcb88c-1da8-4108-99eb-9e4b046de6b8	engagement ring	2022-04-11 00:00:00	completed		2025-11-04 21:26:53.560694	2025-11-04 21:26:53.560694	1500.00		personal
14a29dbf-8da7-4e99-af1b-6bf8b00f448f	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	a088d0b9-745d-4b5b-b08d-3765221ba02e	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	João refered miguel to PwC Bus	2023-11-05 00:00:00	completed		2025-11-05 13:11:14.091229	2025-11-05 13:11:14.091229	2999.98		professional
6651d9b5-c2d0-46fe-ba70-803afcf6eafd	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	5adec9c1-3a3c-451a-ab41-676342b91fac	Help when he was unemployed. and during his twentied	2015-06-01 00:00:00	completed	Eduarda gave miguel money when he was unemployed and let him live in her house after got angry with his mother	2025-11-08 16:28:37.979272	2025-11-08 16:28:37.979272	8000.00	1000 days	personal
29eb290f-f99d-42f9-a116-9db70af3025e	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	bbbfad67-f584-47a9-9ada-8781b266689e	help during her twenties	2025-11-08 00:00:00	completed	Generic help eduarda gave ines during her twenties and before	2025-11-08 16:29:30.676128	2025-11-08 16:29:30.676128	15000.00		personal
1fdcd511-0ae8-49e0-b239-8c6dd8385063	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	748846b5-0244-45f7-b9d2-e8f1a831aeda	Miguel gave bernardo his smartwatch	2022-03-20 00:00:00	completed		2025-11-08 16:30:11.047125	2025-11-08 16:30:11.047125	220.00		personal
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, chat_id, role, content, tool_calls, created_at) FROM stdin;
\.


--
-- Data for Name: people; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.people (id, user_id, name, email, phone, photo_url, birthday, notes, importance, last_contact_date, created_at, updated_at, address, linkedin_url, summary, summary_generated_at, gender) FROM stdin;
49156c8a-ac11-436f-9b93-cb78ae1fa029	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Robert Orban	robert.orban@pwc.com	+34 56723411	\N	1982-11-24		\N	2025-11-05 00:00:00	2025-11-05 12:27:31.481131	2025-11-05 12:27:31.481131	Zurich, Switzerland		**1. Core Profile (≈120 words)**  \nRobert Orban is a 42‑year‑old professional whose most recent appointment is Senior Manager at PwC, a role he has held since 2023. Prior to joining PwC, he served as Sourcing Manager at Takeda from 2020 to 2023, where he was involved in procurement and sourcing functions. Orban’s LinkedIn profile lists him as a senior manager with a focus on business consulting and supply‑chain optimization. His current role places him within the professional services cluster of PwC, while his past experience anchors him in the pharmaceutical and life‑sciences sector. The data show no personal assets recorded; his influence appears to be primarily network‑based rather than asset‑driven.\n\n**2. Network Position (≈170 words)**  \nOrban’s first‑degree network consists of three direct contacts, all colleagues from PwC or Takeda: Dario Goette, Miguel Chaves, and Carolina Gonzales del Val. The average relationship strength among these ties is 3.0/5, indicating moderate familiarity but not deep collaboration beyond the workplace.  \n- **Dario Goette** (Partner at PwC Bus) brings four unique connections to Orban’s network, giving him an 80 % bridging potential.  \n- **Miguel Chaves** (Manager at PwC Bus) also supplies four unique links, translating to a 66.7 % bridging score.  \n- **Carolina Gonzales del Val** (Indirect Procurement Lead at CSL) contributes two unique connections, with a 66.7 % bridging potential.  \n\nThese figures suggest that Orban’s network is largely confined within the PwC cluster, but the presence of Dario and Miguel offers cross‑functional access to broader business units. Interaction data show that Orban has had one recorded interaction each with Miguel and Carolina (one event apiece) and no recorded favors exchanged. Thus, while his connections are structurally significant for bridging, actual engagement remains limited.\n\n**3. Professional Context (≈170 words)**  \nOrban’s career trajectory shows a clear shift from pharmaceutical sourcing to professional services consulting. At Takeda (2020‑2023), he managed sourcing activities and likely interacted with procurement leadership, including Carolina Gonzales del Val, who served as an Indirect Procurement Lead at CSL but was terminated from Takeda. This shared history explains the professional overlap noted in the data. In 2023, Orban transitioned to PwC as Senior Manager, a role that typically involves leading client engagements and managing project teams. His current position aligns with his prior experience in sourcing, suggesting a focus on supply‑chain advisory or procurement consulting within PwC’s business services practice. The overlap with Carolina indicates potential for re‑engagement opportunities should she re-enter the industry, while Dario and Miguel represent internal senior leaders who could facilitate cross‑departmental projects.\n\n**4. Interaction Patterns (≈170 words)**  \nOrban has attended a single professional event recorded in his network data. At this event he co‑attended with Ana Tiago Fernandes, Carolina Gonzales del Val, and an individual named Manikumar—no further details are available about these attendees. No favors have been given or received; the total favor value is €0. The interaction record shows that Orban’s engagement with Miguel Chaves consists of one event (the same as above) and no favors, indicating a low level of reciprocal exchange. Similarly, his interaction with Carolina also reflects a single event participation. These sparse interaction metrics suggest that Orban’s network activity is primarily passive or limited to occasional event attendance rather than frequent collaboration or support exchanges.\n\n**5. Assets & Resources (≈130 words)**  \nThe dataset indicates no personal assets recorded for Orban; thus, his value proposition appears to derive from professional expertise and network connections rather than tangible resources. Within his immediate network, Dario Goette, as a partner at PwC Bus, brings strategic leadership experience and access to high‑level client engagements. Miguel Chaves, a manager at PwC Bus with a family background (two children) that may influence work‑life balance perspectives, offers mid‑tier project management capabilities. Carolina Gonzales del Val’s experience in indirect procurement at CSL and her recent layoff from Takeda provide industry knowledge and potential for future collaborations if she re‑enters the market. Orban himself brings sourcing expertise from Takeda and consulting acumen from PwC, positioning him as a bridge between pharmaceutical procurement practices and professional services delivery.\n\n**6. Key Insights (≈120 words)**  \n- **Bridging Potential:** Dario Goette’s 80 % bridging score is the strongest indicator that Orban can access broader PwC business units through this connection.  \n- **Limited Engagement:** The single recorded event per contact and zero favor exchanges suggest low current interaction intensity; opportunities exist to deepen collaboration, particularly with Miguel who shares a recent project (“project unify”).  \n- **Professional Overlap:** Orban’s shared history with Carolina at Takeda implies potential for future joint initiatives in procurement consulting if she re‑enters the industry.  \n- **Predictive Outlook:** Given Orban’s senior managerial role and moderate relationship strength, he is likely to be approached for cross‑functional projects rather than direct favor requests. His network’s composition indicates a propensity for internal PwC collaborations over external client engagements at this stage.	2025-11-05 15:36:59.970526	male
4fc5b094-6406-4c2a-8ec8-6da5df7fe331	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Ana Tiago Fernandes	ana.tiago.fernandes@pwc.com	913452223	\N	1985-04-12		\N	2025-11-05 00:00:00	2025-11-05 12:25:25.546902	2025-11-05 12:25:25.546902	Alges, Portugal		**1. Core Profile (≈120 words)**  \nAna Tiago Fernandes, born 4 December 1985, is a 40‑year‑old Senior Manager at PwC Business Services (PwC Bus) as of 2023. She has two children—one born in 2008 and another in 2023—and is married to Sinan, who holds Swiss citizenship with Egyptian ancestry. Ana’s professional footprint is concentrated within PwC, where she reports to Partner Dario Goette and mentors Manager Miguel Chaves. Her current role places her at the intersection of client delivery and internal coaching, suggesting a blend of technical expertise and people‑management skills.\n\n---\n\n**2. Network Position (≈170 words)**  \nAna’s immediate network consists of two direct connections: Dario Goette and Miguel Chaves. Both are colleagues within PwC Bus, with Dario holding the senior Partner rank and Miguel occupying a managerial level. The average strength of these ties is 3.0/5, indicating moderate interaction intensity.\n\nBridging analysis shows that Ana connects to distinct clusters through both contacts:  \n- **Miguel Chaves** bridges five unique connections (83.3 % bridging potential).  \n- **Dario Goette** links four unique connections (80.0 % bridging potential).\n\nThese percentages reflect the proportion of each contact’s total ties that fall outside Ana’s immediate circle, underscoring their role as conduits to broader organizational networks. Interaction data reveal a single recorded event attended by Ana alongside Miguel Chaves, Carolina Gonzales del Val, and Manikumar. No favors have been exchanged, implying a purely professional engagement pattern so far.\n\n---\n\n**3. Professional Context (≈160 words)**  \nAna’s career trajectory is concise yet upward‑moving: Consultant at Roff from 2019 to 2023, followed by her current promotion to Senior Manager at PwC Bus in 2023. This transition coincides with her working relationship with Dario Goette (Partner) and Miguel Chaves (Manager), both of whom she has collaborated with on PwC projects. The overlap suggests that Ana’s advancement was likely supported by mentorship or sponsorship from these senior figures, a common pathway within consulting firms.\n\nHer role as a career coach to Miguel indicates an additional layer of influence—she not only delivers services but also shapes the professional development of peers. This dual function enhances her visibility and reinforces her position as both a service provider and talent developer within the firm.\n\n---\n\n**4. Interaction Patterns (≈170 words)**  \nEvent participation is limited: Ana has attended one professional event, where she co‑attended with Miguel Chaves, Carolina Gonzales del Val, and Manikumar. The absence of recorded favors—both given and received—suggests a nascent or purely transactional interaction phase. The single interaction with Miguel (one event, no favors) indicates that while Ana engages in shared professional activities, deeper reciprocal exchanges such as assistance requests have not yet materialized.\n\nGiven the low volume of interactions, it is difficult to infer habitual engagement frequency. However, the fact that all recorded activity involves Miguel implies that he may be Ana’s primary point of contact for collaborative or developmental opportunities within PwC Bus.\n\n---\n\n**5. Assets & Resources (≈120 words)**  \nNo personal assets are documented in the available data. Ana’s professional assets lie in her senior managerial role, which grants her access to client portfolios, project teams, and internal knowledge bases at PwC Bus. Her coaching capacity with Miguel adds a resource dimension—she can provide guidance on career progression, skill development, and performance management.\n\nFrom a network perspective, Dario Goette’s partner status offers Ana exposure to high‑level strategic initiatives and executive decision‑making processes. Miguel Chaves’ managerial position provides access to mid‑tier project teams and operational execution. Together, these connections afford Ana a balanced view of both top‑line strategy and ground‑level implementation within the firm.\n\n---\n\n**6. Key Insights (≈110 words)**  \nAna’s network is tightly focused on two high‑ranking PwC contacts, both serving as bridges to broader organizational clusters. The absence of favors or frequent interactions suggests that her relationship with Miguel is primarily professional and limited to event co‑attendance. Her recent promotion aligns temporally with these connections, indicating potential mentorship influence.\n\nPredictive observations:  \n- **Favor Requests:** Given the current reciprocity gap, Ana may be more likely to receive favor requests from Dario if he seeks operational support or project insights.  \n- **Event Responses:** Future events involving Miguel or Dario could yield increased engagement, especially if they align with Ana’s coaching mandate.  \n- **Collaboration Potential:** The dual role of coach and senior manager positions Ana as a valuable collaborator for cross‑functional initiatives that require both strategic oversight and talent development.\n\nOverall, Ana’s profile reflects a professional who has leveraged key internal relationships to advance her career while maintaining a focused yet underutilized interaction pattern within her immediate network.	2025-11-05 15:37:07.397388	female
72ec2b95-7b12-4ad7-8964-21de544dfe7a	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Carolina Gonzales del Val	carolinadelval@csl.com	+34 786 324 123	\N	1984-03-12		\N	2025-11-05 00:00:00	2025-11-05 12:33:11.101524	2025-11-05 12:33:11.101524	Zurich, Switzerland		**1. Core Profile (≈120 words)**  \nCarolina Gonzales del Val is a 41‑year‑old procurement professional who currently serves as Indirect Procurement Lead at CSL, a position she assumed in 2023 following her termination from Takeda on 15 October 2023. Prior to that, she held the same title at Takeda from 2019 until her layoff. Born on 12 March 1984, Carolina relocated from Spain to Switzerland on 1 November 2018 in pursuit of broader career opportunities, a move that positioned her within the Swiss pharmaceutical procurement ecosystem. Her career is characterized by steady advancement into senior sourcing roles and a focus on indirect spend management for large multinational biopharmaceutical firms.\n\n---\n\n**2. Network Position (≈170 words)**  \nCarolina’s first‑degree network comprises three direct contacts: two colleagues (Robert Orban, Manikumar) and one “other” connection (Miguel Chaves). The average tie strength is 2.5/5 for colleague links and 3.0/5 for the other link, indicating moderate familiarity but limited depth of interaction.  \n\nBridge analysis shows that Robert contributes two unique connections to Carolina’s network (66.7% bridging potential), Miguel offers four unique connections (also 66.7%), while Manikumar adds one unique connection (50%). These figures suggest that Miguel is the most structurally valuable bridge, linking Carolina to a broader cluster of professionals beyond her immediate circles.\n\nInteraction data are sparse: each contact has been involved in exactly one event with Carolina and no recorded favors exchanged. The sole shared professional event took place on an unspecified date, where Carolina co‑attended with Ana Tiago Fernandes, Manikumar, and Miguel. This limited interaction history points to a network that is largely static and primarily composed of past workplace associations rather than ongoing collaborative ties.\n\n---\n\n**3. Professional Context (≈170 words)**  \nCarolina’s career trajectory follows a clear path within the indirect procurement domain of large pharmaceutical companies. She held the Indirect Procurement Lead role at Takeda for four years, where she worked directly with Robert Orban—a sourcing manager who later transitioned to PwC as Senior Manager. This professional overlap indicates that Carolina’s expertise was aligned with Takeda’s strategic sourcing initiatives and that her network includes individuals who have moved into consulting roles.\n\nIn 2023, following her layoff from Takeda, Carolina joined CSL in the same capacity. The transition reflects a lateral move within the industry, maintaining continuity in responsibilities while potentially expanding her exposure to different supply chain frameworks. Her Swiss relocation in 2018 likely facilitated access to the European biopharma market and positioned her for these roles.\n\n---\n\n**4. Interaction Patterns (≈170 words)**  \nCarolina’s recorded event participation is limited to a single professional gathering where she interacted with Ana Tiago Fernandes, Manikumar, and Miguel Chaves. No favors have been given or received, indicating a neutral reciprocity level in her network. The frequency of interactions per contact is uniformly one, suggesting that Carolina has not cultivated deeper engagement beyond initial introductions.\n\nThe event’s co‑attendees include both colleagues (Manikumar) and former client-side collaborators (Miguel), implying that the gathering served as a bridge between internal procurement teams and external consulting partners. However, without subsequent recorded interactions or favors, it is unclear whether this event translated into ongoing collaboration or knowledge exchange.\n\n---\n\n**5. Assets & Resources (≈120 words)**  \nNo personal assets are documented for Carolina in the available data set. Her primary asset lies in her professional expertise: indirect spend strategy and procurement leadership within the biopharmaceutical sector. The network offers limited additional resources; the three contacts are primarily former colleagues or client-side collaborators without recorded material contributions. Consequently, Carolina’s immediate network does not provide substantial ancillary assets such as financial capital, specialized tools, or extensive industry contacts beyond those already reflected in her professional roles.\n\n---\n\n**6. Key Insights (≈120 words)**  \nThe data reveal a tightly knit but shallow network centered on past workplace associations. Miguel Chaves stands out as the most structurally valuable bridge due to his higher number of unique connections, yet interaction frequency remains low across all contacts. The absence of recorded favors suggests limited reciprocal support within this circle. Carolina’s recent layoff and swift transition to CSL indicate resilience and a strong professional reputation that facilitates rapid re‑engagement in senior procurement roles. Predictive observations: given her role continuity and industry focus, future collaboration opportunities are likely to emerge through formal procurement events or cross‑company initiatives rather than informal favor exchanges.	2025-11-05 15:37:14.631596	female
7a6b9ce8-e636-4e90-a3fa-192ce5810399	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	guy olderbrech	guy@client1.com	+34 764 22 33	\N	1988-09-01		\N	2025-06-28 00:00:00	2025-11-05 12:52:06.858927	2025-11-05 12:52:06.858927	basel, switzerland		**1. Core Profile (≈120 words)**  \nGuy Olderbrech is a 37‑year‑old professional whose public record contains only a single documented interaction with the broader network. He was born on September 1, 1988 and has no recorded employment history or personal assets in the available dataset. The sole connection identified is to Isabel Beate Paixão, an associate at PwC’s Business Consulting practice, through which Guy participated in a professional event titled “Rebuild.” No favors have been exchanged, and there are no other direct ties or roles listed for him.\n\n**2. Network Position (≈170 words)**  \nGuy maintains one first‑degree connection: Isabel Beate Paixão, with an interaction strength of 2 out of 5. This link is the only bridge between Guy’s personal network and any external clusters; it connects him to three distinct contacts—João Diogo Ferriera, Dario Goette, and himself—indicating that Isabel serves as a conduit to a small professional circle. The bridging potential is quantified at 100 % because all of Guy’s known connections are routed through Isabel. No other direct or indirect ties appear in the data set, so Guy’s network position is highly centralized around this single relationship.\n\n**3. Professional Context (≈170 words)**  \nGuy’s professional footprint is minimal: no job titles, company affiliations, or project histories are recorded beyond his participation in the “Rebuild” event with Isabel. The event itself is categorized as a professional engagement, suggesting that Guy was involved in a client‑side capacity on a consulting initiative. Isabel’s role at PwC and her involvement in the same project provide the only contextual clue to Guy’s occupational sphere—likely within a corporate or advisory environment—but no explicit position or responsibilities are documented. Consequently, any inference about career trajectory must rely solely on this one event, limiting the depth of professional analysis.\n\n**4. Interaction Patterns (≈170 words)**  \nGuy attended exactly one event, classified as professional. The event roster lists Isabel Beate Paixão and João Diogo Ferriera as co‑attendees; no other participants are recorded. There is a single interaction with Isabel: the “Rebuild” project collaboration, which constitutes 100 % of Guy’s documented engagement activity. No favors have been given or received (value €0), indicating a purely transactional or observational role rather than a reciprocal exchange. The frequency of interactions is thus very low—one event over an unspecified time span—suggesting limited network activity and potential under‑utilization of professional opportunities.\n\n**5. Assets & Resources (≈120 words)**  \nGuy’s personal assets are unreported; the dataset contains no financial, intellectual property, or material holdings attributed to him. The only resource he offers is his participation in a single professional event, which likely involved expertise or time allocation on the “Rebuild” project. Conversely, Isabel provides access to PwC’s consulting network and project infrastructure, as evidenced by her role and the shared event. Guy’s limited engagement suggests that he may be a peripheral contributor rather than a central resource within his immediate network.\n\n**6. Key Insights (≈120 words)**  \nThe evidence points to Guy Olderbrech being an almost dormant node in this social graph: one connection, one event, no favors exchanged. His sole bridge—Isabel—links him to a small cluster of professionals, but there is no reciprocal activity indicating strong collaboration or influence. Predictive observations are constrained by the paucity of data; however, the 100 % bridging role implies that any future engagement with Isabel could expand Guy’s reach. Given the absence of favor exchanges, it is unlikely he will request assistance unless a new project surfaces. The single professional event suggests potential for collaboration if he were to engage more actively or seek additional roles within the same client domain.	2025-11-05 15:37:20.614511	male
7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Dario Goette	Dario.Goette@pwc.ch	+34 589 543 234	\N	1984-08-02		\N	\N	2025-11-05 12:23:44.214045	2025-11-05 12:23:44.214045	Zurich, Switzerland		**1. Core Profile (≈120 words)**  \nDario Goette is a 41‑year‑old partner at PwC Business Services (PwC Bus), having joined the firm in 2023 after founding and leading Avoras from 2018 to 2023. Public biographical notes describe him as “workaholic, very full of himself and competitive” (recorded 1/1/2023). His professional footprint is concentrated at PwC, where he reports to senior managers such as Ana Tiago Fernandes and collaborates with colleagues Miguel Chaves, João Diogo Ferriera, and Isabel Beate Paixão. With no recorded personal assets or event participation, Dario’s influence appears to be confined to internal corporate networks rather than external engagements.\n\n**2. Network Position (≈170 words)**  \nDario maintains five direct connections, all colleagues within PwC Bus, with an average relationship strength of 2.8/5. The strongest ties are to Ana Tiago Fernandes and Robert Orban (strength 3/5), while Isabel Beate Paixão registers a lower strength of 2/5. Network bridge analysis identifies Robert Orban and Isabel Beate Paixão as the most valuable connectors, each linking Dario to two unique clusters (66.7% bridging potential). Ana Tiago Fernandes contributes one unique connection (50 % bridging potential). No recorded interactions (events or favors) exist among these ties, suggesting that relationship strength derives from structural positioning rather than active collaboration. The absence of external contacts indicates a tightly knit internal network with limited cross‑firm outreach.\n\n**3. Professional Context (≈170 words)**  \nDario’s career trajectory shows a clear shift from entrepreneurship to senior consulting leadership. As founder of Avoras (2018‑2023), he likely cultivated skills in business development and client management, which translated into his partner role at PwC Bus starting in 2023. Within PwC, he works alongside Ana Tiago Fernandes (Senior Manager), Miguel Chaves (Manager), and Isabel Beate Paixão (Associate). These overlaps suggest a hierarchical collaboration structure: Dario reports to senior managers while supervising mid‑level managers and associates. The network overlap is confined to the same practice area, reinforcing a vertical professional alignment rather than cross‑practice or cross‑firm engagement.\n\n**4. Interaction Patterns (≈170 words)**  \nRecorded interaction data are sparse: Dario has attended zero events, given zero favors, and received zero favors, all valued at €0. Consequently, there is no measurable reciprocity or engagement frequency with any of his five colleagues. The lack of observable activity implies that Dario’s influence within the firm may be exerted through formal leadership roles rather than informal social exchanges. In the absence of event participation, it is unlikely that he leverages networking events for collaboration or resource mobilization.\n\n**5. Assets & Resources (≈120 words)**  \nNo personal assets are listed in the dataset. Dario’s primary asset appears to be his position as a partner at PwC Bus, which grants him access to firm resources, client portfolios, and decision‑making authority. His network comprises colleagues who occupy senior, managerial, and associate roles; collectively they provide expertise across various business services functions but no direct evidence of shared tangible assets or joint ventures is present. Accessibility is limited to internal firm channels, with no external partnerships or public-facing assets recorded.\n\n**6. Key Insights (≈120 words)**  \nThe data reveal a highly structured, internally focused professional profile: Dario’s network consists solely of PwC colleagues, and his interactions are non‑existent in terms of events or favors. This suggests that collaboration potential may arise from formal project assignments rather than informal networking. The high bridging scores for Robert Orban and Isabel Beate Paixão indicate that any initiatives requiring cross‑cluster coordination would likely involve these individuals. Predictive observations point to a low probability of spontaneous favor requests or event invitations, given the zero activity record; instead, engagement is expected through scheduled firm meetings or project briefings.	2025-11-05 15:37:27.184136	male
fef0de35-80e0-48c4-9870-436f11b8333b	6b80ed8c-a294-4227-833e-bf3d92b02b49	Mafalda Lacerda	mafalda.lacerda@gmail.com		\N	1962-09-14		\N	2022-11-26 00:00:00	2025-11-04 21:29:22.052641	2025-11-04 21:29:22.052641	Rua das trinas 39		\N	\N	female
95dcb88c-1da8-4108-99eb-9e4b046de6b8	6b80ed8c-a294-4227-833e-bf3d92b02b49	Luisa Chaves	Luplacerda@gmail.com	914274878	\N	1992-11-06		\N	2025-05-12 00:00:00	2025-11-04 21:23:01.155694	2025-11-04 21:23:01.155694	Rua de São Ciro 21		\N	\N	female
50fa52b0-670d-42f8-90d3-aa9042e85bc0	6b80ed8c-a294-4227-833e-bf3d92b02b49	Miguel Chaves	miguel.rachaves@gmail.com	925341369	\N	1988-09-15		\N	2025-05-12 00:00:00	2025-11-04 21:21:50.596345	2025-11-04 21:30:58.212074	Rua de São Ciro		\N	\N	male
bdfa084e-3026-4bfa-8ac3-fd8241ce5fa4	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Manikumar	MK@csl.com	+1 88833225	\N	1973-04-17		\N	2025-11-05 00:00:00	2025-11-05 12:28:38.66293	2025-11-05 12:28:38.66293	Ohio , USA		**1. Core Profile (≈120 words)**  \nManikumar is a 52‑year‑old professional whose public record lists only one event attendance and two direct contacts. He has no documented employment history or personal assets in the dataset, suggesting either an early career stage, a private individual, or incomplete data capture. His sole recorded interaction was a professional event attended with Miguel Chaves (PwC) and Carolina Gonzales del Val (CSL). The absence of favor exchanges indicates a neutral transactional stance within his limited network.\n\n**2. Network Position (≈170 words)**  \nManikumar’s direct network consists of two contacts: Miguel Chaves, a manager at PwC Business Services, and Carolina Gonzales del Val, an indirect procurement lead at CSL. The strength ratings (3/5 for “other” and 2/5 for “colleague”) reflect moderate familiarity but lack depth. Bridging potential is quantified by unique connections: Miguel contributes five distinct contacts (83.3 % bridging), while Carolina adds two (66.7 %). These percentages imply that Manikumar’s link to Miguel provides greater cross‑cluster connectivity, potentially facilitating information flow between PwC and other client or project networks. Interaction frequency is minimal—each contact appears once in the interaction log—yet both are equally active in co‑attending a single professional event.\n\n**3. Professional Context (≈170 words)**  \nNo formal employment history is recorded for Manikumar, limiting analysis of career trajectory. However, his association with Miguel on “Project Unify” suggests involvement in client‑side operations or project management, likely within the consulting domain. Carolina’s role as an indirect procurement lead at CSL indicates a focus on supply‑chain and vendor relationships; her recent layoff from TAKEDA (10/15/2023) and relocation to Switzerland (11/1/2018) highlight mobility and resilience in the pharmaceutical sector. The overlap between Manikumar’s client‑side experience and Carolina’s procurement expertise hints at complementary skill sets, potentially positioning him for roles that bridge project execution with supply‑chain oversight.\n\n**4. Interaction Patterns (≈170 words)**  \nManikumar attended one professional event, co‑presented with Ana Tiago Fernandes, Carolina, and Miguel. No favors were exchanged—neither given nor received—indicating a neutral stance in reciprocal support. The event count is low but shows engagement across distinct clusters: PwC (Miguel), CSL (Carolina), and an unidentified participant (Ana). This single data point suggests either a nascent network or limited public activity. The lack of favor exchanges may reflect either a conservative approach to resource sharing or simply insufficient interaction history to capture such dynamics.\n\n**5. Assets & Resources (≈120 words)**  \nThe dataset records no personal assets for Manikumar, nor any explicit skill endorsements. His primary asset appears to be his network linkages: a bridge between PwC and CSL through Miguel and Carolina respectively. These connections provide access to consulting expertise and procurement operations, which could be leveraged for cross‑functional projects. The absence of recorded favors or monetary exchanges suggests that Manikumar’s value proposition lies more in relational connectivity than in tangible resource provision.\n\n**6. Key Insights (≈120 words)**  \nEvidence shows that Miguel Chaves is the most structurally valuable connection, offering the highest bridging potential (83.3 %) and a broader unique contact base. Carolina provides moderate bridging (66.7 %) but adds depth through her procurement role at CSL. The single event participation indicates low engagement frequency; however, the presence of both contacts in that event suggests potential for collaborative initiatives. Predictive observations: Manikumar is unlikely to request favors based on current data, yet his strong link to Miguel could facilitate future information or resource flow. Conversely, Carolina’s recent layoff and relocation may increase her openness to new opportunities, positioning Manikumar as a conduit between consulting and procurement spheres.	2025-11-05 15:37:39.911381	male
e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Miguel Chaves	miguel.arala.chaves@pwc.com	925341369	\N	1988-09-15		\N	2025-11-05 00:00:00	2025-11-05 12:22:27.168622	2025-11-05 12:22:27.168622	Rua de Sâo Ciro 21		**Core Profile (≈120 words)**  \nMiguel Chaves is a 37‑year‑old manager at PwC Business Services (PwC Bus), having assumed the role in 2024. Born on 15 September 1988, he balances professional responsibilities with family life; as of 1 July 2025 he reports having two children and a wife. His tenure at PwC is currently limited to this single managerial position, suggesting a recent promotion or lateral move within the firm. No personal assets are recorded in the dataset, indicating that his value proposition lies primarily in human capital and professional networks rather than material holdings.\n\n---\n\n**Network Position (≈170 words)**  \nMiguel maintains six direct first‑degree connections: three colleagues, one friend, and two “other” contacts from client engagements. The average tie strength across all relationships is 3.0/5, reflecting moderately strong but not exceptionally close bonds.  \n\n- **Colleagues**: Ana Tiago Fernandes (Career Coach), Dario Goette (Partner), Robert Orban (Senior Manager).  \n- **Friend**: João diogo Ferriera (University‑era friend and current colleague).  \n- **Others**: Carolina Gonzales del Val and Manikumar, both client‑side partners on Project Unify.  \n\nBridge analysis shows that João provides the highest bridging potential (66.7% unique connections), followed by Ana and Manikumar at 50% each. These figures indicate that Miguel’s network spans both internal PwC clusters and external client teams, positioning him as a conduit for cross‑functional information flow. Interaction data reveal one event attended with Ana, Carolina, and Manikumar; João appears only in a favor exchange (no events). Thus, while his formal collaborations are limited to a single project event, informal support flows exist through friendship ties.\n\n---\n\n**Professional Context (≈170 words)**  \nMiguel’s career timeline is concise: Manager at PwC Bus from 2024 to the present. His professional overlap with network contacts is concentrated within this role:\n\n- **Ana Tiago Fernandes**: Senior Manager and Miguel’s Career Coach, sharing a direct reporting or mentorship relationship.  \n- **Dario Goette**: Partner at PwC Bus, likely supervising or collaborating on high‑level client work.  \n\nBoth relationships suggest that Miguel operates in senior advisory capacities within the firm’s business services division. The absence of prior positions implies either a recent entry into PwC or an omission in the data; however, his current managerial title indicates responsibility for team leadership and project delivery.\n\n---\n\n**Interaction Patterns (≈170 words)**  \nMiguel has attended one professional event in 2025, co‑attended by Ana Tiago Fernandes, Carolina Gonzales del Val, and Manikumar. No events involve Dario or Robert, indicating limited cross‑team engagement beyond the single Project Unify gathering.\n\nFavors show a net receipt of €3,000 from João diogo Ferriera (one favor received, none given). The favor balance is 0.00, meaning Miguel neither lends nor borrows resources within his network. This asymmetry—receiving help without reciprocation—could reflect either a new entrant still building reciprocity or a relationship where the friend’s contribution outweighs Miguel’s.\n\n---\n\n**Assets & Resources (≈120 words)**  \nMiguel offers managerial expertise in business services, likely encompassing project oversight, client delivery, and team development. His network provides complementary assets: Ana brings coaching and senior management insight; Dario contributes partnership-level influence; Robert supplies senior‑managerial coordination; Carolina and Manikumar offer client‑side perspectives on Project Unify. The single favor exchange with João suggests that Miguel can mobilize informal support when needed, though he has not yet demonstrated a reciprocal giving pattern.\n\n---\n\n**Key Insights (≈120 words)**  \n1. **Bridging Potential**: João diogo Ferriera’s 66.7% bridging score positions Miguel as an intermediary between PwC internal teams and external client stakeholders, especially on Project Unify.  \n2. **Limited Event Exposure**: Participation in only one event limits visibility; increasing attendance could strengthen ties with Dario and Robert.  \n3. **Reciprocity Gap**: The net favor receipt indicates a need to balance give‑and‑take to solidify trust; proactive offering of favors may enhance collaboration prospects.  \n4. **Professional Overlap**: Close alignment with Ana and Dario suggests Miguel is embedded in senior advisory circles, potentially enabling rapid career progression if he leverages these relationships for high‑profile projects.\n\nThese observations are strictly derived from the provided data—dates, counts, and relationship descriptors—and avoid conjecture about motives or future outcomes.	2025-11-05 15:37:47.26946	male
32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	Isabel Beate Paixão	isabel.paixao@pwc.com	96 334 4546	\N	1990-12-08		\N	2025-06-28 00:00:00	2025-11-05 12:39:47.972815	2025-11-05 12:39:47.972815	estrada principal, viseu		**Core Profile (≈120 words)**  \nIsabel Beate Paixão is a 34‑year‑old associate at PwC’s Business Consulting practice, having joined the firm in 2023 after two years as an SAP finance end‑user at Paralel (2020–2022). Born on 12 August 1990, she balances her professional responsibilities with motherhood; she has two children born on 4 May 2023 and cites them as her primary life priority. Isabel’s profile reflects a young, career‑focused consultant who values family commitments highly, a trait that may influence her engagement patterns within the firm.\n\n**Network Position (≈170 words)**  \nIsabel maintains three direct first‑degree connections: two colleagues at PwC and one external client contact. The colleague ties—João Diogo Ferriera (Senior Manager, career coach) and Dario Goette (Partner, PwC Business)—have an average interaction strength of 2.5/5, while the client connection to Guy Olderbrech scores 2.0/5. In terms of bridging potential, Isabel’s link to Guy Olderbrech is a pure bridge (100 % unique connections), whereas her tie to Dario Goette bridges four distinct contacts (80 %) and João Diogo Ferriera bridges two (66.7 %). Interaction data show only one event attended with each of João and Guy; no favors have been exchanged. Thus, Isabel’s network is small but strategically positioned: she connects the internal PwC cluster to an external client cluster via Guy, and her partnership tie to Dario offers access to senior leadership within the firm.\n\n**Professional Context (≈170 words)**  \nIsabel’s career trajectory shows a clear shift from technical finance operations at Paralel to advisory consulting at PwC. The overlap with her network is most pronounced through her collaboration with Dario Goette, a partner in the same business unit where Isabel now works. This professional intersection suggests that Isabel has direct exposure to senior decision‑makers and high‑visibility projects within PwC. Her prior experience as an SAP finance end‑user provides domain expertise that can be leveraged in consulting engagements, particularly those involving ERP implementations or financial process optimization. The fact that she worked on the “Rebuild” project with Guy Olderbrech indicates hands‑on exposure to client‑side initiatives, further enriching her practical skill set.\n\n**Interaction Patterns (≈170 words)**  \nIsabel has attended one professional event in which both João Diogo Ferriera and Guy Olderbrech were co‑attendees. No favors have been given or received, indicating a nascent stage of reciprocal engagement. The interaction frequency is minimal: each key contact appears once in the interaction log. This limited data set suggests that Isabel’s current networking activity is modest, potentially reflecting her prioritization of family responsibilities over extensive professional outreach. However, the presence of high‑level contacts (partner and career coach) within her immediate circle provides a foundation for future engagement if she chooses to expand her participation in firm events or client projects.\n\n**Assets & Resources (≈120 words)**  \nNo personal assets are recorded for Isabel; her value proposition lies primarily in her professional competencies. As an associate with recent SAP finance experience, she brings technical knowledge and consulting acumen that can be mobilized on client engagements. Her network offers complementary resources: João Diogo Ferriera’s career coaching expertise could guide her advancement within PwC, while Dario Goette’s partnership status affords access to senior leadership and high‑profile projects. The external link to Guy Olderbrech provides a conduit to client organizations, potentially opening doors for cross‑functional collaborations or future consulting opportunities.\n\n**Key Insights (≈120 words)**  \nThe data reveal that Isabel occupies a strategically positioned but underutilized network niche: she bridges internal PwC leadership and an external client through limited yet high‑potential ties. Her professional overlap with Dario Goette indicates early exposure to senior decision‑making, which could accelerate her career trajectory if leveraged. The absence of favor exchanges and minimal event attendance suggest low current reciprocity; however, the presence of a career coach signals that Isabel is likely open to structured development plans. Predictive observations point to potential collaboration on client projects involving SAP finance, where Isabel’s technical background aligns with her consulting role. Future engagement metrics—such as increased event participation or favor exchanges—would validate the effectiveness of these network bridges.	2025-11-05 15:36:51.896796	female
a088d0b9-745d-4b5b-b08d-3765221ba02e	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	João diogo ferriera	Joaodff@pwc.com	917874523	\N	1990-12-07		\N	2025-06-28 00:00:00	2025-11-05 12:46:37.564213	2025-11-05 12:46:37.564213	portela, Portugal		**Core Profile (≈120 words)**  \nJoão Diogo Ferriera is a 34‑year‑old Senior Manager at PwC, having joined the firm in 2024. His professional footprint is confined to a single role, indicating a focused career path within one organization. João’s network consists of three first‑degree contacts: two colleagues (Dario Goette and Isabel Beate Paixão) and one friend from university (Miguel Chaves). All connections are rated at an average strength of 3/5, suggesting moderate but stable relationships. João’s role as a career coach for Isabel implies a mentorship dynamic, while his friendship with Miguel extends beyond the workplace into social activities.\n\n**Network Position (≈170 words)**  \nJoão maintains a tightly knit network of three direct contacts. Among these, Miguel Chaves emerges as the strongest bridge: he connects to five unique individuals outside João’s immediate circle, yielding an 83.3 % bridging potential. Isabel Beate Paixão bridges two distinct clusters (66.7 %), and Dario Goette links to three others (60 %). The network’s composition reflects a blend of professional and personal ties: both colleagues are senior staff at PwC Bus, while Miguel is a fellow manager and university friend. Interaction data show João has engaged once with each key contact—one event with Isabel and one favor request from Miguel. No reciprocal favors have been recorded, indicating an asymmetrical flow of support within the network. The limited number of interactions suggests João’s engagement is sporadic rather than routine.\n\n**Professional Context (≈170 words)**  \nJoão’s professional trajectory is currently at a single senior management position at PwC since 2024. His colleagues share overlapping roles: Dario Goette, a partner, and Isabel Beate Paixão, an associate, both operate within PwC Business Services. This alignment indicates that João’s daily work environment is heavily influenced by the same organizational culture and client portfolio as his direct contacts. The presence of Miguel Chaves—also a manager at PwC Bus—in João’s network reinforces intra‑firm collaboration potential. However, the data provide no evidence of past roles or external experience for João, limiting insight into career progression beyond the current role.\n\n**Interaction Patterns (≈170 words)**  \nJoão has attended one professional event, co‑presented with Isabel Beate Paixão and a third attendee named “guy olderbrech.” No other events are recorded. In terms of favors, João has given a single favor valued at €3,000 but has not received any favors to date. The sole favor was requested by Miguel Chaves, who also receives one favor from João (the same event). Interaction frequency is minimal: each key contact appears in only one interaction record. This sparse data set suggests João’s engagement with his network is occasional and possibly driven by specific needs rather than regular collaboration.\n\n**Assets & Resources (≈120 words)**  \nNo personal assets are recorded for João, indicating that his value to the network lies primarily in professional expertise and social capital. Within the network, Dario Goette brings partnership-level influence, Isabel Beate Paixão offers associate‑level insight, and Miguel Chaves provides managerial perspective. João’s role as a career coach for Isabel suggests he possesses mentorship skills that could be leveraged within the firm. The €3,000 favor given indicates access to substantial financial resources or budget authority, which may enhance his influence in facilitating projects or client engagements.\n\n**Key Insights (≈120 words)**  \nThe data reveal João operates within a highly concentrated professional network dominated by PwC colleagues. His strongest bridge is Miguel Chaves, who connects João to the widest external circle; this suggests potential for cross‑team collaboration if leveraged. João’s asymmetrical favor pattern—giving but not receiving—may indicate a willingness to support peers without immediate reciprocity, potentially positioning him as a dependable resource. The single event participation with Isabel highlights a shared professional interest that could be expanded into joint initiatives. Predictively, João is likely to continue engaging selectively with his network, focusing on high‑value interactions such as mentorship and financial facilitation rather than broad social outreach.	2025-11-05 15:37:33.72855	male
43f41e95-e8dd-4297-ab30-665aa259037b	a51ee058-d30a-4698-ac16-be45993882f0	Sofia Rego	spedrosarego@gmail.com		\N	1965-08-15		\N	\N	2025-11-08 16:10:15.387112	2025-11-08 16:10:15.387112	Av. Rio de Janeiro, Lisboa		\N	\N	female
4824cbf5-7f1f-41b3-9203-e5de6fad8171	a51ee058-d30a-4698-ac16-be45993882f0	Luisa Chaves	luplacerda@gmail.com	914274878	\N	1992-11-06		\N	\N	2025-11-06 10:51:07.483398	2025-11-06 10:51:07.483398	Rua de São Ciro 21, Lisboa	https://www.linkedin.com/in/lu%C3%ADsa-chaves-0208271aa/	\N	\N	female
5adec9c1-3a3c-451a-ab41-676342b91fac	a51ee058-d30a-4698-ac16-be45993882f0	Miguel Chaves	miguel.rachaves@gmail.com	925341369	\N	1988-09-15		\N	\N	2025-11-06 10:43:41.388055	2025-11-06 10:43:41.388055	Rua de São Ciro 21, Lisboa	https://www.linkedin.com/in/miguel-chaves-6b338b28/	\N	\N	male
149cf7b9-160e-439f-b7d7-f823fb9def9a	a51ee058-d30a-4698-ac16-be45993882f0	Antonio Pereira de Lacerda	aplacerda@gmail.com	918 696 962	\N	1957-01-07		\N	\N	2025-11-08 16:32:30.803651	2025-11-08 16:32:30.803651	Rua das trinas 39, Lisboa		\N	\N	male
2341c5c7-adb8-4695-be60-7bdc2ba68557	a51ee058-d30a-4698-ac16-be45993882f0	Catarina correia	catzuma90@gmail.com	912 670 705	\N	1991-09-30		\N	\N	2025-11-08 15:29:57.008757	2025-11-08 15:30:31.992333	Ajuda, Lisboa	https://www.linkedin.com/in/catarinamontezumacorreia/	**Comprehensive Summary of Catarina Correia**\n\n---\n\n**1. Core Profile (250 words max)**\n\nCatarina Correia, 34 years old (born September 30, 1991), is a recently expanded family unit, having welcomed twins on October 27, 2023 — both male. As of the data provided, she holds no personal assets, indicating either minimal financial accumulation or a focus on non-monetary priorities such as family. Her professional history is not recorded, suggesting either an absence of formal employment, a non-public profile, or a transition phase outside traditional career documentation. Her direct network consists of two individuals, both likely family members given the dominance of familial connections in her N2 layer (five second-degree connections, all classified as family). This suggests a tightly knit, possibly insular social circle centered around kinship. Notably, no professional role, title, or organizational affiliation is listed, which may imply she is either in a non-traditional career path, a student, or managing family responsibilities as her primary role. Her life events are anchored around childbirth, marking a significant personal milestone, and her network reflects a low-stakes, high-connection-density social structure with minimal external professional engagement.\n\n---\n\n**2. Overview of Network (150 words max)**\n\nCatarina Correia’s network is small but highly concentrated, with two direct connections (N1) and five second-degree connections (N2), all falling under the category of family. This indicates a network primarily built on kinship rather than professional or social affiliations. The most prominent high-potential connection is Bernardo Correia, who holds €35,000 in assets and has three connections — making him the only high-net-worth individual in her network. Bernardo serves as a key bridge, connecting Catarina to Miguel Chaves, and Rebeca Correia also acts as a bridge, linking to Catarina with 50% bridging potential. These bridging roles suggest Catarina may serve as a relational node between different family clusters — perhaps connecting younger or less connected family members to wealthier or more established relatives. The network’s structure implies limited external reach but strong internal cohesion, with Bernardo’s financial standing offering potential resource access.\n\n---\n\n**3. Professional Context (~120 words)**\n\nCatarina Correia has no recorded professional history, including no listed jobs, titles, or employment periods. This absence suggests either a non-traditional career path, a focus on family life, or a lack of public professional documentation. There is no overlap between her network and any professional roles — Bernardo Correia, the only professional individual in her network, is an Insurance Consultant at MetLife, two levels senior to her in the network hierarchy. This hierarchical gap implies potential mentorship opportunities, though no direct interaction or professional relationship is documented. The lack of professional context, combined with her recent childbirth, may indicate a career pause or transition, possibly toward family caregiving or part-time work not captured in formal records.\n\n---\n\n**4. Interaction Patterns (~170 words)**\n\nCatarina Correia has attended zero events, indicating either a low social engagement profile, a focus on private family life, or a lack of recorded social activity in the system. No favors have been given or received — both in quantity (0) and monetary value (€0), suggesting a non-transactional, non-commercial social dynamic. This aligns with her family-centered network and absence of professional interactions. Her lack of engagement with events or favor exchanges may reflect a deliberate choice to prioritize personal or familial commitments over social or economic reciprocity. There is no data on frequency of interaction — whether with family or otherwise — which makes it impossible to infer engagement patterns. However, the absence of any recorded activity suggests a low level of social or economic participation, possibly due to her recent life transition (childbirth) or a preference for minimal public or network-based interaction.\n\n---\n\n**5. Assets & Resources (~100 words)**\n\nCatarina Correia owns no personal assets, as confirmed by the data. Her financial standing is zero, creating a stark contrast with her network’s only high-net-worth individual, Bernardo Correia, who holds €35,000 in assets. While Bernardo offers “Miscelaneous” resources — a vague, non-specific category — this may include financial support, material goods, or services. There is no indication that Catarina has access to or utilizes these resources, nor is there any evidence of asset transfer or inheritance. The absence of personal assets, combined with her family-centered network, suggests she may be financially dependent on her network — particularly Bernardo — or that her priorities lie elsewhere, such as child-rearing or domestic life.\n\n---\n\n**6. Key Insights (~300 words)**\n\nCatarina Correia’s network reveals a deeply relational, family-centric structure with minimal professional or economic activity. The dominance of family connections (both direct and second-degree) suggests a social architecture prioritizing kinship over external networks. Her only high-net-worth connection, Bernardo Correia (€35,000), is also her most significant bridge — connecting her to Miguel Chaves and serving as a potential resource conduit. Rebeca Correia, another bridge, links to Catarina with 50% bridging potential, indicating a possible intermediary role in connecting Catarina to other clusters — perhaps her extended family or a professional circle. The wealth disparity between Bernardo (€35,000) and Catarina (€0) is infinite in the data set, highlighting a significant resource gap that may influence her access to opportunities, financial support, or mentorship.\n\nProfessionally, Catarina’s lack of history, combined with Bernardo’s position as a senior-level Insurance Consultant at MetLife, creates a clear hierarchical gap — two levels senior, with potential mentorship value. However, no professional overlap or interaction is documented, suggesting either a lack of engagement or a deliberate separation between personal and professional spheres. The absence of any recorded events, favors, or interactions further reinforces her low engagement profile, possibly due to her recent childbirth or a focus on domestic life.\n\nFamily dynamics appear to be the core of her network. The birth of twins in 2023, coupled with her lack of professional activity, suggests a life transition toward caregiving. While no marital or divorce history is recorded, the presence of multiple family connections (including Bernardo and Rebeca) implies a complex family structure. Bernardo’s asset value and professional role may indicate he is a key family provider, potentially offering financial or emotional support. The bridging potential of both Bernardo and Rebeca suggests Catarina may serve as a connector between different family branches — perhaps between her immediate family and extended relatives or between younger and older generations.\n\nTimeline correlations are limited but suggest potential alignment between life events and network dynamics. The twins’ birth in 2023 may coincide with a period of increased reliance on her network — particularly Bernardo — for resources or support. The absence of professional history may reflect a career pause or transition, possibly coinciding with her child-rearing responsibilities. No relocations or career moves are documented, but the network’s static nature suggests stability in her immediate environment — possibly her home or family residence.\n\nNon-obvious inferences emerge from combining data points. The lack of professional activity, coupled with her recent childbirth, may indicate a deliberate shift away from career pursuits toward family life. The wealth disparity with Bernardo may not be merely financial — it could reflect a power dynamic, where Catarina relies on Bernardo’s resources or social capital. The bridging roles of Bernardo and Rebeca suggest Catarina may be strategically positioned as a connector — perhaps facilitating communication or resource sharing between different family clusters. The absence of any recorded events or favors may not indicate disengagement but rather a deliberate choice to prioritize personal relationships over transactional or social obligations.\n\nIn summary, Catarina Correia’s profile is defined by family, recent life events, and minimal external engagement. Her network is small, tightly knit, and financially stratified, with Bernardo Correia as the primary resource node. Her professional context is absent, suggesting a life phase centered on personal or domestic priorities. The network’s structure, combined with her birth of twins, indicates a potential shift in focus — from career to caregiving — with her family serving as both support system and social anchor. While no direct mentorship or professional interaction is documented, the hierarchical positioning of Bernardo offers potential for future growth, should Catarina choose to re-engage professionally through her network.	2025-11-08 17:00:29.429567	female
6855ff5d-b807-47e6-9e36-d40ad7f5549b	a51ee058-d30a-4698-ac16-be45993882f0	Sara Dominguez	sara.echoes@gmail.com	936 686 633	\N	1993-09-02		\N	\N	2025-11-06 11:01:03.789899	2025-11-06 11:01:03.789899	Geneve, Switzerland	https://www.linkedin.com/in/srdominguez/	**Comprehensive Summary: Sara Dominguez**\n\n---\n\n**1. Core Profile (250 words max)**\n\nSara Dominguez, 32, born September 2, 1993, currently serves as Mena Advocacy Coordinator at Women International League, a position she has held since 2023. Her professional trajectory reflects a global, intellectually driven path: she relocated to Scotland in September 2015 to pursue a Master’s in Islamic Studies, a decision that likely influenced her later focus on international advocacy. In 2020, she moved to Switzerland for work, further demonstrating her adaptability across continents. In March 2025, she ended a long-term relationship with her boyfriend, a union she had envisioned as a foundation for family-building. Her personal asset portfolio consists of a single miscellaneous item valued at €80,000 — no property, no investments, no tangible assets beyond this. Her direct network includes three individuals, all of whom appear to be family members, indicating a tightly knit, possibly emotionally significant, personal circle. No professional or social engagements are recorded, and no favors have been exchanged — suggesting either minimal social interaction or a deliberate focus on professional work. Sara’s life trajectory, marked by academic mobility, international relocation, and recent personal transition, positions her as someone navigating significant life changes with a grounded, perhaps introspective, approach.\n\n---\n\n**2. Overview of Network (150 words max)**\n\nSara Dominguez maintains a small but strategically positioned network: three direct connections (N1) and 16 second-degree connections (N2). The most common connection type is family — all three N1 connections fall within this category, suggesting a core relational structure centered on kinship. Among her high-potential connections — those with significant net worth or strong network reach — are Ana Roque (€799,999.98, 5 connections) and Miguel Chaves (€300,000, 8 connections). These two individuals serve as critical nodes, connecting Sara to broader clusters of influence. Miguel Chaves, her half-brother (they grew up together for 20 years), bridges Sara to five other individuals, including Bernardo Correia, Eduarda Arala Chaves, Luisa Chaves, and Inês Chaves. Ana Roque similarly connects Sara to Luisa Chaves and Rui Chaves. Miguel Cuña, another network bridge, connects only to Sara, offering limited cross-cluster utility. The network’s structure suggests Sara’s personal and professional circles are anchored in familial ties, with potential access to high-net-worth individuals and their resources.\n\n---\n\n**3. Professional Context (~120 words)**\n\nSara Dominguez’s professional history is defined by a single role: Mena Advocacy Coordinator at Women International League (2023–2025). The title suggests a focus on gender equity, migration, or humanitarian advocacy — areas that may align with her academic background in Islamic Studies and her international experience. Her tenure coincides with a major personal transition — the breakup in March 2025 — indicating that her professional role may serve as a stabilizing force during personal upheaval. There is no evidence of overlap with her network’s professional spheres, suggesting her work is either independent or not yet integrated into the broader network’s professional ecosystem. Her role is likely non-executive, with limited hierarchical influence — consistent with her low engagement and lack of asset accumulation.\n\n---\n\n**4. Interaction Patterns (~170 words)**\n\nSara Dominguez has not attended any events, nor has she given or received any favors — zero monetary or relational exchanges are recorded. This absence of interaction data suggests either a low social engagement profile, a deliberate disengagement from social or professional networking, or a period of personal reflection following her breakup. Her lack of event participation may correlate with her recent personal transition, as well as her geographic mobility — relocating twice in her early career (Scotland, then Switzerland) — which may have limited opportunities for sustained social integration. The absence of favor exchange indicates no visible reciprocity or resource sharing within her immediate network. This could reflect her current life stage — focused on personal recovery and professional stability — or it could signal a broader pattern of minimal social investment. Her network’s resources (e.g., Casa Lourinha, Alges) are not accessible through her direct interactions, reinforcing her current position as a passive recipient rather than an active participant in network dynamics.\n\n---\n\n**5. Assets & Resources (~100 words)**\n\nSara Dominguez owns one personal asset — a miscellaneous item valued at €80,000 — with no further details provided. This asset is not tied to property, real estate, or financial instruments, suggesting limited tangible wealth accumulation. In contrast, her network offers access to two high-value resources: “Alges” from Miguel Chaves and “Casa Lourinha” from Ana Roque, collectively valued at €599,999.98. These resources are not owned by Sara but are available through her connections, indicating potential for future access or collaboration. However, her current lack of property assets and absence of favor exchanges suggest she has not yet leveraged these network resources. Her asset profile remains modest, while her network’s wealth and resource capacity are substantial — a disparity that may influence her future opportunities.\n\n---\n\n**6. Key Insights (~300 words)**\n\n**Family Dynamics Patterns:** Sara Dominguez’s personal life contrasts sharply with her half-brother Miguel Chaves. Miguel, who shares a 20-year upbringing with Sara, is married with children — a marker of relational and familial stability. In contrast, Sara recently ended a long-term relationship, suggesting a period of personal instability. This divergence may reflect differing life trajectories — Miguel’s stable family structure may have provided a foundation for financial accumulation, while Sara’s recent breakup may correlate with a period of emotional or financial recalibration. The sibling relationship, though half-blood, appears deeply rooted — a fact that may explain the high bridging potential of Miguel’s network, which includes multiple family members and key connections. Sara’s lack of children or marriage contrasts with Miguel’s family status, potentially indicating a different life philosophy or timing.\n\n**Timeline Correlations:** Sara’s academic and professional moves — Scotland (2015), Switzerland (2020) — align with periods of significant life transition. Her breakup in March 2025 occurs after a period of professional stability (2023–2025) and international relocation. This suggests her personal life may be undergoing a recalibration following professional consolidation. Miguel Chaves’ stability may have been established before Sara’s most recent transition, reinforcing the idea that family stability can serve as a buffer against personal upheaval — a buffer Sara may currently be lacking.\n\n**Wealth Disparities and Resource Access:** Sara’s personal assets (€80,000) are dwarfed by her network’s wealth — Ana Roque’s €799,999.98 and Miguel Chaves’ €300,000. The network’s resources — Casa Lourinha and Alges — are worth €599,999.98, yet Sara has not accessed them. This disparity may reflect her current position as a network node with limited leverage — her role as a coordinator may not grant her access to decision-making or resource allocation. The “infinityx difference” between Ana Roque and Miguel Cuña (€0) underscores the extreme wealth inequality in the network, which may influence Sara’s opportunities for collaboration or mentorship.\n\n**Professional Synergies and Mentorship Potential:** Sara’s role as an advocacy coordinator may align with Ana Roque’s position — though no professional overlap is recorded, Ana’s wealth and resource access may offer potential for future collaboration. Miguel Chaves, as a bridge to multiple high-value connections, may serve as a potential mentor or intermediary — though his role is not explicitly defined. Sara’s lack of professional experience beyond her current role limits her ability to leverage the network’s resources, but her international background and advocacy focus may position her as a future collaborator with Ana Roque or Miguel Chaves.\n\n**Non-Obvious Inferences:** The fact that Miguel Chaves is married with children, while Sara is navigating a breakup, may correlate with a broader pattern of relationship instability in the network — Miguel’s stability may contrast with Sara’s volatility, suggesting that family structure may be a predictor of personal resilience. The timing of Sara’s breakup (March 2025) coincides with the end of her professional tenure — this may indicate a period of transition where personal and professional life are being redefined. The absence of event participation and favor exchange may reflect a deliberate withdrawal from social networks — a strategy to focus on personal growth or professional development. The network’s wealth disparity may also reflect a generational or structural gap — Miguel Chaves’ €300,000 may represent the result of long-term stability, while Sara’s €80,000 may reflect a more transient accumulation. This may influence her future decisions — whether to pursue mentorship, collaboration, or financial growth through the network.\n\n---\n\n**Total Word Count: 980**	2025-11-08 17:16:27.031679	female
80eea854-5b55-459e-ae2a-cccec066e5ff	a51ee058-d30a-4698-ac16-be45993882f0	Rui Chaves	Na@notimportant.com	N/a	\N	1967-02-13	Died in 2016	\N	\N	2025-11-08 15:54:58.296389	2025-11-08 15:54:58.296389	N/A		\N	\N	male
bbbfad67-f584-47a9-9ada-8781b266689e	a51ee058-d30a-4698-ac16-be45993882f0	Inês Chaves	inesachaves@gmail.com	913 750 702	\N	2004-12-09		\N	\N	2025-11-08 15:39:40.134916	2025-11-08 15:39:40.134916	Av Rio de Janeiro, Lisboa	https://www.linkedin.com/in/in%C3%AAs-arala-chaves-26a477269/	\N	\N	female
c509941d-a95e-4e36-8c16-c74c2a5d8c54	a51ee058-d30a-4698-ac16-be45993882f0	Mafalda Pereira de Lacerda	mafplacerda@gmail.com	914018495	\N	1960-09-14		\N	\N	2025-11-08 16:34:23.034083	2025-11-08 16:34:23.034083	Rua das Trinas 39, Lisboa		\N	\N	female
eba906bd-2d44-4dab-b643-de6c8b25f5a7	a51ee058-d30a-4698-ac16-be45993882f0	Eduarda Arala Chaves	eduarda.dores@gmail.com	917246433	\N	1939-08-09		\N	\N	2025-11-08 15:45:20.429463	2025-11-08 15:45:20.429463	Av. João Crisostomo nº 4, 2º Esq		\N	\N	female
f475e1b5-d2d0-472d-9014-e02b75e14438	a51ee058-d30a-4698-ac16-be45993882f0	Ana Roque	ana.roque@yahoo.fr	917009170	\N	1965-04-05		\N	\N	2025-11-06 10:56:27.374857	2025-11-06 10:56:27.374857	Moledo, Lourinha	https://www.linkedin.com/in/ana-roque-8125554/	\N	\N	female
c4bb04e8-c88e-4936-a223-f763e1c815e6	a51ee058-d30a-4698-ac16-be45993882f0	Miguel Cuña	Mdominguezcunha@gmail.com	931675753	\N	1965-05-20		\N	\N	2025-11-06 11:35:41.179342	2025-11-06 11:35:41.179342	Coimbra, Portugal		\N	\N	male
b777f217-a719-473e-8661-2ec3874ce3ca	a51ee058-d30a-4698-ac16-be45993882f0	Rebeca Correia	rebeca.correia@gmail.com	91 000 00 00	\N	1986-03-02		\N	\N	2025-11-08 15:34:45.451714	2025-11-08 15:34:45.451714	Parceiros de Igreija, Portugal		**Comprehensive Summary of Rebeca Correia**\n\n---\n\n**1. Core Profile (250 words max)**\n\nRebeca Correia, born March 2, 1986, is 39 years old as of the current data point. Her most significant biographical event recorded is the birth of her son, Leonardo, on April 3, 2015 — a milestone marking a major life transition. No professional history or current role is documented in the available data, suggesting either a non-working status, absence of recorded employment, or lack of integration into professional networks. No personal assets are recorded, indicating either financial simplicity, lack of ownership documentation, or absence of material wealth in the system. Her direct network consists of two individuals — likely close family members given the context — and her second-degree connections total five, reinforcing a small, tightly-knit social circle. The most frequent type of connection is familial, suggesting that her primary social and relational anchors are within her immediate family unit. No formal affiliations, job titles, or career milestones are available, leaving her professional identity unclassified. The only verifiable personal event beyond birth is the arrival of her child, which may reflect a life stage shift toward family-centric priorities. No other biographical markers — such as education, relocation, or significant life transitions — are present in the dataset.\n\n---\n\n**2. Overview of Network (150 words max)**\n\nRebeca Correia’s network is small and tightly clustered, with two direct (N1) connections and five second-degree (N2) connections. The most common type of connection is family — two of her direct connections are likely family members, indicating a high degree of familial centrality in her social graph. Her network includes one high-potential connection by net worth: Bernardo Correia, who holds €35,000 in assets and has three connections, making him a key node in her network. Bernardo also serves as a bridge to two other individuals — Miguel Chaves and Rebeca herself — with a 66.7% bridging potential, suggesting he may act as a conduit between Rebeca and broader network clusters. Another bridge, Catarina Correia, connects Rebeca to the same cluster with 50% bridging potential. These bridges imply Rebeca’s network may be structurally anchored through familial ties, with Bernardo serving as a potential gateway to external opportunities or resources. The network’s structure is minimal but strategically positioned around family and one high-net-worth individual.\n\n---\n\n**3. Professional Context (~120 words)**\n\nRebeca Correia has no recorded professional history, including no job titles, employers, or career transitions. No employment timeline, industry affiliation, or skillset is documented. Her professional context remains undefined within the available data. However, her network includes Bernardo Correia, an Insurance Consultant at MetLife, who is two levels senior in the network hierarchy — suggesting potential mentorship or professional guidance opportunities. While no direct professional overlap is documented between Rebeca and Bernardo, the hierarchical gap and shared surname imply a familial or close-knit relationship that may facilitate informal mentorship. Without further data, Rebeca’s professional trajectory cannot be inferred, and no active or past employment is confirmed.\n\n---\n\n**4. Interaction Patterns (~170 words)**\n\nRebeca Correia has attended zero events, indicating minimal participation in social, professional, or community gatherings. No favors have been given or received — both in quantity and monetary value — suggesting a lack of transactional or reciprocal social exchange within her network. This absence of favor exchange or event attendance may reflect a low level of active engagement, either due to personal preference, limited social opportunities, or the small size of her network. The lack of interaction data across multiple dimensions — events, favors, and engagement frequency — indicates that Rebeca is not currently involved in dynamic social or professional activities. Her network’s limited size may also contribute to this low engagement, as there are few opportunities for interaction. The absence of any recorded interactions suggests a passive or non-active network position, with no evidence of recent social or professional activity.\n\n---\n\n**5. Assets & Resources (~100 words)**\n\nRebeca Correia owns no personal assets, as explicitly recorded in the dataset. There are no properties, vehicles, financial instruments, or material possessions attributed to her. However, through her direct connection, Bernardo Correia, she has access to network resources — specifically, “Miscelaneous” resources, which are not further defined. These resources may include informal support, shared services, or non-monetary assistance. The lack of personal assets, combined with the presence of a high-net-worth connection, creates a stark contrast in resource availability. While Rebeca has no material wealth, her network provides potential access to resources that may be leveraged for personal or professional development.\n\n---\n\n**6. Key Insights (~300 words)**\n\nThe available data reveals a stark contrast between Rebeca Correia’s personal wealth and her network’s resource distribution. She possesses no assets, while her direct connection, Bernardo Correia, holds €35,000 — an infinite wealth disparity in the dataset’s terms. This suggests Rebeca may be financially dependent on her network, particularly Bernardo, for access to resources or opportunities. Bernardo’s professional role as an Insurance Consultant at MetLife — two levels senior to Rebeca — implies a potential mentorship dynamic, even if no formal relationship is documented. His position as a bridge to Miguel Chaves and Rebeca herself (with 66.7% bridging potential) indicates he may serve as a key intermediary in expanding Rebeca’s reach within the network.\n\nThe network’s structure is heavily family-oriented, with two direct connections likely being family members. The presence of a second-degree connection, Catarina Correia, who also bridges to Rebeca, suggests a possible extended family or kinship network. The fact that Rebeca’s only recorded life event is the birth of her son in 2015 — and no other major life events such as marriage, divorce, or relocation — implies a stable, possibly domestic-focused life stage. The absence of professional activity or interaction patterns may reflect a deliberate withdrawal from public or professional life, or a lack of integration into broader social systems.\n\nThe lack of event participation and favor exchange suggests Rebeca may not be actively seeking or engaging in social or professional opportunities. This could be due to personal choice, limited network size, or a focus on family responsibilities — particularly given her child’s birth in 2015. The absence of any professional history may indicate either a career break, a non-traditional career path, or a lack of formal employment documentation.\n\nA non-obvious inference from the data is that Rebeca’s network may be structured around familial and financial support systems. Bernardo’s high net worth and professional status, combined with his bridging role, suggest he may be a central figure in providing both material and relational support to Rebeca. The wealth disparity between Rebeca (€0) and Bernardo (€35,000) is not just numerical — it reflects a structural inequality within her social network, where access to resources is not equally distributed. This may create opportunities for Rebeca to leverage Bernardo’s position for mentorship, career guidance, or resource access — even if no formal relationship is documented.\n\nThe absence of any recorded divorces, marriages, or relocations for Rebeca, combined with the presence of a child, suggests a stable family environment — contrasting with the potential instability implied by Bernardo’s professional role or the network’s small size. However, without further data, it is impossible to infer whether this stability is intentional or circumstantial.\n\nIn summary, Rebeca Correia’s profile is defined by minimal professional activity, no personal assets, and a network that is both small and resource-rich — but highly concentrated in one individual. Her potential for growth lies in leveraging Bernardo Correia’s position as a mentor and bridge to other network members. The data suggests a life stage focused on family, with limited engagement in external networks — a pattern that may be intentional or reflective of structural constraints. The network’s wealth disparity and hierarchical structure indicate that Rebeca’s access to resources is contingent on her connections — particularly Bernardo — and that her professional future may depend on her ability to engage with these relationships.	2025-11-08 17:03:32.963207	female
748846b5-0244-45f7-b9d2-e8f1a831aeda	a51ee058-d30a-4698-ac16-be45993882f0	Bernardo Correia	bernardo.mpbc@gmail.com	912690796	\N	1988-03-16		\N	\N	2025-11-08 15:08:41.694419	2025-11-08 15:08:41.694419	Costa da Caparica, Portugal	https://www.linkedin.com/in/bernardo-montezuma-correia/	**Bernardo Correia – Comprehensive Profile Summary (800–1000 words)**\n\n---\n\n**1. Core Profile (250 words)**\n\nBernardo Correia, 37, born March 16, 1988, is currently employed as an Insurance Consultant at MetLife, a position he assumed in 2024. His professional trajectory includes a brief stint in 2023 as a “walking backpag beer sales” representative at 2East festivals — a role that appears to have been short-term and possibly transitional. Prior to MetLife, Correia launched a gaming startup on January 1, 2018, based in Porto. The venture failed by 2021, marking a significant early entrepreneurial setback. In 2021, he experienced a personal rupture when his long-term girlfriend, Bruna, ended their relationship on August 2. Since then, Correia has been intermittently active on Tinder, engaging in casual dating and hookups, but has never maintained a committed relationship lasting more than one month as of October 11, 2025.\n\nHis personal asset portfolio is minimal: one miscellaneous item valued at €35,000 — no property, no vehicles, no real estate. His network includes three direct connections (N1) and twelve second-degree connections (N2), with family members constituting the most common type of connection (two out of three direct links). His closest ties appear to be familial, suggesting limited social expansion beyond kin. His most frequent interaction, though minimal, is with Miguel Chaves — a high-net-worth contact with €300,000 in assets — who has engaged with him once, offering access to “Alges,” a resource or location, though no event or favor was exchanged.\n\n---\n\n**2. Overview of Network (150 words)**\n\nBernardo Correia’s network is small but structurally anchored in familial relationships, with two of his three direct connections being family members. His N2 network expands to twelve individuals, indicating a modest but active social circle. The most influential node in his network is Miguel Chaves, who holds €300,000 in assets and eight connections — a stark contrast to others like Catarina Correia (€0) or Rebeca Correia (also €0). Miguel Chaves serves as a critical bridge, connecting Bernardo to six other individuals including Eduarda Arala Chaves, Luisa Chaves, Sara Dominguez, and Inês Chaves — suggesting he is a central hub in Bernardo’s social and possibly economic ecosystem. Catarina and Rebeca Correia, Bernardo’s relatives, also act as bridges — each connecting him to one person, though with only 50% bridging potential. The network’s structure indicates potential for upward mobility, but currently, Bernardo’s access to resources or opportunities is mediated through high-net-worth intermediaries.\n\n---\n\n**3. Professional Context (~120 words)**\n\nBernardo Correia’s professional history consists of two documented positions. His current role as an Insurance Consultant at MetLife (2024–Present) represents a stable, corporate trajectory. Prior to this, he held a temporary or event-based position in 2023 as a “walking backpag beer sales” representative at 2East festivals — a role that appears to have no direct professional relevance to his current insurance career. His entrepreneurial attempt — a gaming startup launched in Porto in 2018 — failed by 2021, coinciding with his personal breakup. There is no evidence of professional overlap between his network and his career, though Miguel Chaves, a high-net-worth contact, may offer access to resources like “Alges” — potentially useful for business or social expansion. His career trajectory suggests a pivot from entrepreneurial risk to corporate stability.\n\n---\n\n**4. Interaction Patterns (~170 words)**\n\nBernardo Correia has not attended any events, indicating low social engagement in structured or formal settings. His favor exchange history reveals a net receiver position: he has given zero favors (€0 value) and received one favor worth €220 — possibly a small monetary or service exchange. This suggests he is not actively contributing to the network’s reciprocity, though he benefits from a single transaction. The lack of event attendance and favor giving may reflect either low social initiative or a focus on casual, transactional interactions — such as Tinder dating — rather than deeper community or professional engagement. His only recorded interaction with Miguel Chaves was one, with no events or favors exchanged — indicating a passive or one-time connection. This pattern suggests limited network activation, despite the presence of high-value contacts. His network may be underutilized, with potential for deeper engagement through resource access or mentorship.\n\n---\n\n**5. Assets & Resources (~100 words)**\n\nBernardo Correia owns one miscellaneous asset valued at €35,000 — with no specific description or category provided. This asset is not tied to real estate, vehicles, or businesses, and appears to be a non-core, non-liquid item. His network, however, offers access to more substantial resources: Miguel Chaves provides access to “Alges,” which may represent a property, location, or service — valued at €300,000 in the network context. This creates a stark disparity: Bernardo’s personal assets are modest, while his network holds significant wealth and resources. He lacks property assets, unlike others in his network, which may limit his ability to leverage wealth or build equity. His access to resources is mediated through high-net-worth individuals, suggesting a dependency on intermediaries for economic or social mobility.\n\n---\n\n**6. Key Insights (300 words)**\n\nBernardo Correia’s life trajectory reveals a pattern of instability and transition — both personal and professional — that may be interconnected. His breakup with Bruna in August 2021 coincides with the failure of his gaming startup in the same year. This suggests a possible correlation between personal and professional setbacks — a common phenomenon in early-career entrepreneurs. His subsequent pattern of casual dating via Tinder, with no long-term relationships lasting more than a month, may reflect emotional or psychological instability following the breakup — or a deliberate avoidance of deeper commitments. His familial network (two out of three direct connections) suggests that his primary social support system is kin-based, possibly limiting exposure to broader professional or social networks.\n\nHis professional shift from a failed startup to a corporate role at MetLife indicates a strategic pivot — possibly motivated by the need for stability after personal and business failure. The 2023 “backpag beer sales” job at 2East appears to be a transitional role, perhaps a way to generate income while navigating personal or professional uncertainty. His lack of event attendance and favor reciprocity — despite having a high-net-worth contact — suggests he is not actively leveraging his network for professional or social advancement. This may be due to either low engagement, lack of initiative, or a preference for casual, transactional interactions.\n\nThe most significant insight lies in the wealth disparity within his network. Miguel Chaves, with €300,000 in assets, is the only high-net-worth individual in the network — a stark contrast to Catarina Correia and Rebeca Correia, both of whom have €0 assets. This disparity may reflect generational, educational, or opportunity gaps — or even a structural imbalance in how resources are distributed. Miguel Chaves’ role as a bridge to multiple people — including Bernardo’s family — suggests he may be a central figure in the network’s resource allocation. Bernardo’s access to “Alges” through Miguel may represent a potential opportunity for business, social, or personal growth — but only if he engages with the network more actively.\n\nThe absence of property assets in Bernardo’s portfolio — while others in the network own real estate or resources — indicates a gap in asset accumulation. This may be a result of his entrepreneurial failure, his current corporate role (which may not involve asset ownership), or his personal choices. His network offers access to resources worth €300,000 — but Bernardo’s own assets are only €35,000 — suggesting a potential for growth through collaboration or mentorship. His connection to Miguel Chaves, who offers “Alges,” may be a starting point for accessing wealth or opportunities — but only if Bernardo initiates deeper engagement.\n\nIn terms of family dynamics, Bernardo’s network includes two family members — suggesting that his primary social circle is kin-based. This may indicate a lack of social expansion or a preference for familial support. The fact that Miguel Chaves connects Bernardo to multiple family members — including Eduarda, Luisa, Sara, and Inês — suggests that Miguel may be a bridge between Bernardo’s personal and professional worlds — possibly even a mentor or sponsor. The absence of children or long-term relationships in Bernardo’s profile — combined with his recent breakup — may reflect a pattern of instability or a delay in personal milestones.\n\nIn summary, Bernardo Correia’s life is characterized by a series of transitions — personal, professional, and social — that may be interconnected. His network offers significant potential for growth, but his current engagement is minimal. His lack of assets, combined with his access to high-net-worth contacts, suggests a path toward upward mobility — but only if he actively leverages his network. His entrepreneurial failure, breakup, and casual dating pattern may reflect a need for stability — which he may be seeking through his corporate role at MetLife. The network	2025-11-08 17:07:01.945403	male
5cbc0107-4b6f-49e1-bd8a-29cc210ed5f7	a51ee058-d30a-4698-ac16-be45993882f0	João Alberto Pinto Basto	joalbepbasto@gmail.com	917 510 736	\N	1931-04-16		\N	\N	2025-11-08 17:29:06.305379	2025-11-08 17:29:06.305379	Rua de Santo Antonio á Estrela, Lisboa		\N	\N	male
\.


--
-- Data for Name: professional_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.professional_history (id, person_id, company, "position", start_date, end_date, notes, created_at) FROM stdin;
f5a13534-ea5f-4475-aed9-be816d833119	95dcb88c-1da8-4108-99eb-9e4b046de6b8	SAP	Consultant	2022-03-22	\N	Sucess factors consultant	2025-11-04 21:28:18.243373
5ccfae09-9640-43f7-942b-df3c127e8fac	72ec2b95-7b12-4ad7-8964-21de544dfe7a	CSL 	Indirect Procurement Lead	2023-11-01	\N	Indirect procurement lead in csl, in charge for all ariba related topics in csl	2025-11-05 12:34:45.131747
bb7b6678-b952-4f33-ac77-bceeb8b3ed85	72ec2b95-7b12-4ad7-8964-21de544dfe7a	Takeda	Indirect Procurement Lead	2019-01-01	2023-10-30	Indirect procurement lead in charge of all ariba stream	2025-11-05 12:35:31.558405
476e9178-48e4-45bb-897d-adc493179b59	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	paralel	finance sap end user	2020-02-01	2022-12-29	Worked with SAP FI, as an end user no really much consulting experience	2025-11-05 12:44:34.545975
2c5bcf53-d34b-4b6e-ad7e-d9ac026a84c0	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	PwC Bus	Associate	2023-01-01	\N	Consultant in SAP FI	2025-11-05 12:42:15.88796
82674fe1-02cf-4805-9dfb-c63d2a64efd0	a088d0b9-745d-4b5b-b08d-3765221ba02e	PwC	Senior Manager	2024-02-01	\N	\N	2025-11-05 12:47:28.641777
cf3f9e42-bc74-47a5-a908-09af8515612e	49156c8a-ac11-436f-9b93-cb78ae1fa029	PwC	Senior Manager	2023-08-10	2025-09-01	\N	2025-11-05 12:56:07.715473
92adc787-97f9-4554-8160-c1dc81d7f4ba	49156c8a-ac11-436f-9b93-cb78ae1fa029	Takeda	Sourcing manager	2020-09-01	2023-07-30	\N	2025-11-05 12:56:57.006168
622b6e8b-7144-46f4-9215-47d4b7cadae2	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	PwC Bus	Manager	2024-02-01	\N	manager in the procurement s2p area (sap mm and ariba)	2025-11-05 13:10:34.210883
2a7dc983-3d64-4252-9129-4b38b27941d4	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	Roff	Consultant	2019-09-12	2023-05-05	\N	2025-11-05 13:16:12.602945
141211f3-fd76-482f-8cc7-3b56bb4ac919	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	PwC Bus	Senior Manager	2023-05-15	\N	\N	2025-11-05 13:16:49.11689
88851b7d-9726-4c08-acd4-aacb88ebfa8d	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	PwC Bus	Partner	2023-10-01	\N	in charge on project aquisition and has final say in consultant evaluation	2025-11-05 13:18:42.042054
16d22ef1-7a59-4775-860f-e5df819df975	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	Avoras	Founder	2018-02-06	2023-09-30	Created consulting company avoras that was later (october 2023 , aquired by pwc)	2025-11-05 13:19:37.517665
8316e5ce-cbfe-4c47-9427-d9eb528eb2e7	5adec9c1-3a3c-451a-ab41-676342b91fac	Deloitte Switzerland	Senior Consultant	2022-01-01	2024-01-31	Procurement , P2P, PMO	2025-11-06 10:45:16.700449
d244b479-3c8e-4ca5-ad4d-2f259ac82e79	5adec9c1-3a3c-451a-ab41-676342b91fac	PwC BuS	Manager	2024-02-01	\N	\N	2025-11-06 10:46:22.86243
85e76d11-43f0-4d81-8dba-29945394e517	5adec9c1-3a3c-451a-ab41-676342b91fac	SAP	Consultant	2017-10-01	2021-11-15	Yearly Salary 25000 Eur/year	2025-11-06 10:44:18.559903
4fa8724e-946d-40b7-ac24-a75a0bef2cd9	6855ff5d-b807-47e6-9e36-d40ad7f5549b	Women International League	Mena Advocacy Coordinator 	2023-01-01	2025-11-06	Geneva Switzerland\nCoordinate international advocacy and MEL components across several projects and partnerships with women's rights organisations and WILPF sections in the MENA region and beyond.\n\nWas laid off in November 2025	2025-11-06 11:33:08.431293
5f64b221-67d2-4d57-9990-ad8451356870	748846b5-0244-45f7-b9d2-e8f1a831aeda	MetLife	Insurance Consultant	2024-04-01	\N	Took over his mother's (who was and insurance agent) client client list upon her death	2025-11-08 15:16:09.091794
3b2134a0-3ce4-4805-802b-6c24a7a0de0f	748846b5-0244-45f7-b9d2-e8f1a831aeda	2East	Walking backpag beer sales in festivals	2023-06-01	2023-09-25	Summer job seeling drinks at music festivals	2025-11-08 15:17:46.636172
dffe1727-b023-4d92-b66a-98e967524bdb	bbbfad67-f584-47a9-9ada-8781b266689e	Universidade Catolica	Student - social services bachelor	2022-09-19	2025-07-11	\N	2025-11-08 15:43:19.625738
0b51e259-e87c-48b5-96b2-daf1cbc67061	eba906bd-2d44-4dab-b643-de6c8b25f5a7	SNS- Service nacional de Saude - Hospital Julio de Matos	Physician - Psychiatry 	1976-02-06	2001-08-31	retired in 2001	2025-11-08 15:51:01.696925
\.


--
-- Data for Name: relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.relationships (id, user_id, person_a_id, person_b_id, relationship_type, strength, context, created_at, updated_at) FROM stdin;
6936494b-38e4-46b0-b848-59c16e27b503	6b80ed8c-a294-4227-833e-bf3d92b02b49	50fa52b0-670d-42f8-90d3-aa9042e85bc0	95dcb88c-1da8-4108-99eb-9e4b046de6b8	family	5	Husband and Wife	2025-11-04 21:23:44.668067	2025-11-04 21:23:44.668067
d39819a8-63c5-4062-87c8-68f7b43e0235	6b80ed8c-a294-4227-833e-bf3d92b02b49	fef0de35-80e0-48c4-9870-436f11b8333b	95dcb88c-1da8-4108-99eb-9e4b046de6b8	family	5	Mother and Daughter	2025-11-04 21:29:40.352248	2025-11-04 21:29:40.352248
f57a6f1f-5686-40fd-855b-55808f36ecd2	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	colleague	3	Ana is Miguel's Career Coach at PwC	2025-11-05 12:45:42.690361	2025-11-05 12:45:42.690361
2e4b3b10-c364-418f-901c-3576c90be301	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	a088d0b9-745d-4b5b-b08d-3765221ba02e	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	colleague	3	João Is Isabel's Career Coach	2025-11-05 12:48:00.0184	2025-11-05 12:48:00.0184
1ceb1ecf-2eb2-41cf-bb37-61972ced9280	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	a088d0b9-745d-4b5b-b08d-3765221ba02e	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	friend	3	Miguel and João are Friends from University, and work colleagues, they hang out outside work	2025-11-05 12:48:53.764556	2025-11-05 12:48:53.764556
32d26849-7c1a-4239-b802-f0e8d12196cb	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	4fc5b094-6406-4c2a-8ec8-6da5df7fe331	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	colleague	3	Dario is a Partner at pwc where Ana works	2025-11-05 12:52:56.193448	2025-11-05 12:52:56.193448
7fdc6c7b-c4f5-4e8c-9075-acbe7370959d	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	a088d0b9-745d-4b5b-b08d-3765221ba02e	colleague	3	Dario is a partner at pwc where joão works	2025-11-05 12:53:22.007691	2025-11-05 12:53:22.007691
29975ac9-db47-4bba-a817-7c5bdcc721a3	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	colleague	2	Dario is a partner at pwc where isabel works	2025-11-05 12:53:46.434805	2025-11-05 12:53:46.434805
89dea8e5-7f63-443b-933a-4b2b0372bba3	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	colleague	3	Dario is a partner at pwc where miguel works	2025-11-05 12:54:14.239587	2025-11-05 12:54:14.239587
aa2ad5bb-5ecd-4b3f-ba29-c6502d22a8cf	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	49156c8a-ac11-436f-9b93-cb78ae1fa029	72ec2b95-7b12-4ad7-8964-21de544dfe7a	colleague	3	Colleagues at Takeda	2025-11-05 12:57:47.916882	2025-11-05 12:57:47.916882
ad231c60-48bb-4c55-9c0b-782dafcb5a89	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	bdfa084e-3026-4bfa-8ac3-fd8241ce5fa4	72ec2b95-7b12-4ad7-8964-21de544dfe7a	colleague	2	Colleagues at CSL	2025-11-05 12:57:28.906063	2025-11-05 12:57:52.914291
7808bd2c-cfd5-4823-84a4-146f74ec5539	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7cff920b-6dbb-4ac6-9d7b-5a95e1f55e1d	49156c8a-ac11-436f-9b93-cb78ae1fa029	colleague	3	Colleagues at PwC	2025-11-05 12:58:36.406985	2025-11-05 12:58:36.406985
e82661e9-1ca7-4158-b37d-d140cd86c967	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	7a6b9ce8-e636-4e90-a3fa-192ce5810399	32e5910f-c631-4b17-ac3c-f76f8d3cb4c1	other	2	Worked from client side with Isabel on project Rebuild	2025-11-05 13:03:37.511861	2025-11-05 13:03:37.511861
3391315e-13d3-45c2-bc2f-6568c03e6fb8	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	bdfa084e-3026-4bfa-8ac3-fd8241ce5fa4	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	other	3	Worked with Miguel from client side on Project Unify	2025-11-05 13:04:21.580163	2025-11-05 13:04:21.580163
9950cb39-6add-41b2-98cf-be308efa2e80	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	72ec2b95-7b12-4ad7-8964-21de544dfe7a	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	other	3	Worked with Miguel on the client side of Project unify	2025-11-05 13:04:02.106123	2025-11-05 13:04:38.654736
e94bad64-2766-4a2e-84b4-ba438a0288f7	76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	e08a2dd1-80a6-4614-a4f1-a83d4cc03bf9	49156c8a-ac11-436f-9b93-cb78ae1fa029	colleague	3	Colleagues at PwC, worked together on project unify	2025-11-05 12:58:12.724474	2025-11-05 13:04:51.479729
f27a413b-0883-40c5-be18-3417ba57600c	a51ee058-d30a-4698-ac16-be45993882f0	5adec9c1-3a3c-451a-ab41-676342b91fac	4824cbf5-7f1f-41b3-9203-e5de6fad8171	family	5	Husband and Wife	2025-11-06 10:51:31.478487	2025-11-06 10:51:31.478487
14b4d018-d749-4075-bbdb-1ead1e551e00	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	5adec9c1-3a3c-451a-ab41-676342b91fac	family	2	Mother and Son. Strained relationship, Miguel resents his mother	2025-11-06 10:58:17.928812	2025-11-06 10:58:17.928812
c94f507a-2d3d-4f1a-a29a-a30e6ee9bd3d	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	4824cbf5-7f1f-41b3-9203-e5de6fad8171	extended_family	2	Ana is Mother in Law to Luisa	2025-11-06 10:59:08.945003	2025-11-06 10:59:08.945003
57e91dca-5730-4ebd-98f4-0d9016cdbd91	a51ee058-d30a-4698-ac16-be45993882f0	6855ff5d-b807-47e6-9e36-d40ad7f5549b	5adec9c1-3a3c-451a-ab41-676342b91fac	family	4	Sara and Miguel are Half-brother but grew up together for 20 years	2025-11-06 11:02:05.587819	2025-11-06 11:02:05.587819
664d11a0-f1a6-4c52-9a05-e99fb692ecc0	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	6855ff5d-b807-47e6-9e36-d40ad7f5549b	family	4	Mother and Daughter	2025-11-06 11:12:40.607604	2025-11-06 11:12:40.607604
576d95c1-6de1-4ac9-9bb1-744ba0243e13	a51ee058-d30a-4698-ac16-be45993882f0	c4bb04e8-c88e-4936-a223-f763e1c815e6	6855ff5d-b807-47e6-9e36-d40ad7f5549b	family	4	Father and Daughter	2025-11-06 11:36:05.430361	2025-11-06 11:36:05.430361
f4144d04-a306-41f8-8c75-c12fddfa0290	a51ee058-d30a-4698-ac16-be45993882f0	c4bb04e8-c88e-4936-a223-f763e1c815e6	5adec9c1-3a3c-451a-ab41-676342b91fac	acquaintance	2	Miguel Cuña was married to Miguel Chaves Mother from 1992 to 2012. 	2025-11-06 11:38:26.515242	2025-11-06 11:38:26.515242
920c1333-a74c-4222-99b3-f9e2c992533b	a51ee058-d30a-4698-ac16-be45993882f0	2341c5c7-adb8-4695-be60-7bdc2ba68557	748846b5-0244-45f7-b9d2-e8f1a831aeda	family	3	Siblings, bernardo is Catarina's Brother	2025-11-08 15:33:12.703629	2025-11-08 15:33:47.375154
d6d83079-9b7f-4524-8edd-9381bb805e58	a51ee058-d30a-4698-ac16-be45993882f0	748846b5-0244-45f7-b9d2-e8f1a831aeda	b777f217-a719-473e-8661-2ec3874ce3ca	family	2	Siblings, Bernardo is Rebeca's Brother	2025-11-08 15:36:52.201568	2025-11-08 15:36:52.201568
f17bf8aa-a048-4089-a441-5a95c35cf6e2	a51ee058-d30a-4698-ac16-be45993882f0	2341c5c7-adb8-4695-be60-7bdc2ba68557	b777f217-a719-473e-8661-2ec3874ce3ca	family	4	Siblings, Catarina and Rebeca are Sisters	2025-11-08 15:37:17.189972	2025-11-08 15:37:17.189972
e06c7a58-1c87-4152-9eb2-5bbd493f23d1	a51ee058-d30a-4698-ac16-be45993882f0	bbbfad67-f584-47a9-9ada-8781b266689e	5adec9c1-3a3c-451a-ab41-676342b91fac	family	2	Half - Brothers (sharing the same father)	2025-11-08 15:44:04.577883	2025-11-08 15:44:04.577883
28faf2fe-c01c-4fb5-b39b-dfda039ace15	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	bbbfad67-f584-47a9-9ada-8781b266689e	family	2	Rui was Inês Father	2025-11-08 16:05:14.351111	2025-11-08 16:05:14.351111
e7739f2d-5c73-423d-8c56-99c069428ca4	a51ee058-d30a-4698-ac16-be45993882f0	80eea854-5b55-459e-ae2a-cccec066e5ff	5adec9c1-3a3c-451a-ab41-676342b91fac	family	2	Rui was Miguel's Father	2025-11-08 16:05:29.480859	2025-11-08 16:05:29.480859
59aa768c-0d87-414e-ad5d-7d5a3d3edea7	a51ee058-d30a-4698-ac16-be45993882f0	f475e1b5-d2d0-472d-9014-e02b75e14438	80eea854-5b55-459e-ae2a-cccec066e5ff	acquaintance	2	Rui had a relationship with Ana, they have one son together, Miguel	2025-11-08 16:06:05.561344	2025-11-08 16:06:05.561344
7196a2c8-2f0b-428f-9e55-97a2ecdc40a2	a51ee058-d30a-4698-ac16-be45993882f0	43f41e95-e8dd-4297-ab30-665aa259037b	bbbfad67-f584-47a9-9ada-8781b266689e	family	4	Sofia is Inês Mother	2025-11-08 16:10:34.512301	2025-11-08 16:10:34.512301
2e95a730-34cb-4757-8b2f-b4cb70ae37d1	a51ee058-d30a-4698-ac16-be45993882f0	43f41e95-e8dd-4297-ab30-665aa259037b	80eea854-5b55-459e-ae2a-cccec066e5ff	extended_family	3	They were Married from 2004 up until 2013	2025-11-08 16:11:26.678387	2025-11-08 16:11:26.678387
87142e98-9909-4a99-aae7-955bf00494b5	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	5adec9c1-3a3c-451a-ab41-676342b91fac	family	5	Eduarda Is Miguel's Grandmother	2025-11-08 16:12:13.320741	2025-11-08 16:12:13.320741
b7b37809-7cc2-4ab7-b595-966e50c94e10	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	bbbfad67-f584-47a9-9ada-8781b266689e	family	5	Eduarda is Inês Grandmother	2025-11-08 16:12:36.630399	2025-11-08 16:12:36.630399
b724f50d-2554-41e2-994d-6cf6c81f119a	a51ee058-d30a-4698-ac16-be45993882f0	eba906bd-2d44-4dab-b643-de6c8b25f5a7	80eea854-5b55-459e-ae2a-cccec066e5ff	family	4	Eduarda Was Rui's Mother	2025-11-08 16:13:00.107268	2025-11-08 16:13:00.107268
5b303148-7459-4f5b-a922-1610c9917da6	a51ee058-d30a-4698-ac16-be45993882f0	43f41e95-e8dd-4297-ab30-665aa259037b	eba906bd-2d44-4dab-b643-de6c8b25f5a7	extended_family	3	Eduarda was Sofia's mother in Law	2025-11-08 16:20:49.253009	2025-11-08 16:20:49.253009
2abbbb4d-d620-4bd9-b4cb-1a8ebd2ca144	a51ee058-d30a-4698-ac16-be45993882f0	748846b5-0244-45f7-b9d2-e8f1a831aeda	5adec9c1-3a3c-451a-ab41-676342b91fac	friend	5	Bernardo was miguel's best friend from highschool. they still keep in touch	2025-11-08 16:22:22.936149	2025-11-08 16:22:22.936149
d7632818-cbe1-4a4d-bb59-c79593f29f1a	a51ee058-d30a-4698-ac16-be45993882f0	149cf7b9-160e-439f-b7d7-f823fb9def9a	c509941d-a95e-4e36-8c16-c74c2a5d8c54	family	5	Husband and wife	2025-11-08 16:35:42.565875	2025-11-08 16:35:42.565875
5489e780-12d6-4468-92d3-2bc424455fe8	a51ee058-d30a-4698-ac16-be45993882f0	149cf7b9-160e-439f-b7d7-f823fb9def9a	4824cbf5-7f1f-41b3-9203-e5de6fad8171	family	5	Father and Daugher	2025-11-08 16:36:06.205953	2025-11-08 16:36:06.205953
04684caf-925c-45e6-acf8-8096bb8ac40e	a51ee058-d30a-4698-ac16-be45993882f0	c509941d-a95e-4e36-8c16-c74c2a5d8c54	4824cbf5-7f1f-41b3-9203-e5de6fad8171	family	5	Mother and Daugher	2025-11-08 16:36:33.596891	2025-11-08 16:36:33.596891
e17c5fa4-9546-4307-ad3d-48e4fee9654c	a51ee058-d30a-4698-ac16-be45993882f0	c4bb04e8-c88e-4936-a223-f763e1c815e6	f475e1b5-d2d0-472d-9014-e02b75e14438	acquaintance	4	Miguel Cuña and Ana Roque were married for 20 years, divorced in 2012	2025-11-06 11:37:22.195653	2025-11-08 16:46:23.280709
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, created_at, preferences, ai_assistant_enabled, local_llm_base_url, local_llm_model, ai_max_results, n8n_webhook_url, ai_provider, ai_model, ai_api_url, api_key) FROM stdin;
6b80ed8c-a294-4227-833e-bf3d92b02b49	demo@socialcapital.local	$2a$10$YvlJS1fom72KDydWuiHYnOajg4Je2iY4/RNhCeXSCLmHYpFmlE2ne	2025-11-04 21:19:46.965418	{}	t	http://192.168.1.165:1234	openai/gpt-oss-20b	100	\N	local	openai/gpt-oss-20b	http://192.168.1.165:1234	
76cf5b7a-f85e-49d3-8dfc-9cf2f2df4a5e	pwc@avoras.com	$2a$10$.TH8/jreVm8ywQybghZqouW9/tlTMnkGQAu4SbisX28Qy6XcWR1TK	2025-11-05 12:20:34.51474	{}	t	http://localhost:1234	llama-2-7b-chat	100	\N	local	openai/gpt-oss-20b	http://192.168.1.165:1234	
7d3365ef-f704-4990-8678-7edee07f29a6	eduardadores@gmail.com	$2a$10$bZBRrEz9xtYw3UZ8kpBtaeleQnOJOApadt7REvOxVbGuxJDQ50kCi	2025-11-05 21:34:30.412192	{}	f	http://localhost:1234	llama-2-7b-chat	100	\N	mock			
a51ee058-d30a-4698-ac16-be45993882f0	miguel.rachaves@gmail.com	$2a$10$lesNP1ZzfQOtJiHRSrPUmetqMSW5cmXQvisShPYfTTY1exORQZ.Nu	2025-11-05 21:38:03.571121	{}	t	http://localhost:1234	llama-2-7b-chat	100	\N	local	qwen/qwen3-vl-8b	http://192.168.1.165:1234	
\.


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: biographies biographies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_event_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_person_id_key UNIQUE (event_id, person_id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: favors favors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favors
    ADD CONSTRAINT favors_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: professional_history professional_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professional_history
    ADD CONSTRAINT professional_history_pkey PRIMARY KEY (id);


--
-- Name: relationships relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_assets_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_owner_id ON public.assets USING btree (owner_id);


--
-- Name: idx_assets_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_type ON public.assets USING btree (asset_type);


--
-- Name: idx_assets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assets_user_id ON public.assets USING btree (user_id);


--
-- Name: idx_biographies_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biographies_date ON public.biographies USING btree (note_date);


--
-- Name: idx_biographies_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biographies_person_id ON public.biographies USING btree (person_id);


--
-- Name: idx_biographies_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biographies_user_id ON public.biographies USING btree (user_id);


--
-- Name: idx_chats_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_created_at ON public.chats USING btree (created_at DESC);


--
-- Name: idx_chats_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_user_created ON public.chats USING btree (user_id, created_at DESC);


--
-- Name: idx_chats_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_user_id ON public.chats USING btree (user_id);


--
-- Name: idx_event_participants_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_participants_event_id ON public.event_participants USING btree (event_id);


--
-- Name: idx_event_participants_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_participants_person_id ON public.event_participants USING btree (person_id);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_date ON public.events USING btree (date);


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_type ON public.events USING btree (event_type);


--
-- Name: idx_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_user_id ON public.events USING btree (user_id);


--
-- Name: idx_favors_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_date ON public.favors USING btree (date);


--
-- Name: idx_favors_favor_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_favor_type ON public.favors USING btree (favor_type);


--
-- Name: idx_favors_giver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_giver_id ON public.favors USING btree (giver_id);


--
-- Name: idx_favors_receiver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_receiver_id ON public.favors USING btree (receiver_id);


--
-- Name: idx_favors_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_status ON public.favors USING btree (status);


--
-- Name: idx_favors_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favors_user_id ON public.favors USING btree (user_id);


--
-- Name: idx_messages_chat_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_created ON public.messages USING btree (chat_id, created_at);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_people_importance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_people_importance ON public.people USING btree (importance);


--
-- Name: idx_people_last_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_people_last_contact ON public.people USING btree (last_contact_date);


--
-- Name: idx_people_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_people_name ON public.people USING btree (name);


--
-- Name: idx_people_summary_generated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_people_summary_generated_at ON public.people USING btree (summary_generated_at);


--
-- Name: idx_people_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_people_user_id ON public.people USING btree (user_id);


--
-- Name: idx_professional_history_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_professional_history_company ON public.professional_history USING btree (company);


--
-- Name: idx_professional_history_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_professional_history_dates ON public.professional_history USING btree (start_date, end_date);


--
-- Name: idx_professional_history_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_professional_history_person_id ON public.professional_history USING btree (person_id);


--
-- Name: idx_relationships_person_a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relationships_person_a ON public.relationships USING btree (person_a_id);


--
-- Name: idx_relationships_person_b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relationships_person_b ON public.relationships USING btree (person_b_id);


--
-- Name: idx_relationships_strength; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relationships_strength ON public.relationships USING btree (strength);


--
-- Name: idx_relationships_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relationships_user_id ON public.relationships USING btree (user_id);


--
-- Name: idx_users_ai_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_ai_enabled ON public.users USING btree (ai_assistant_enabled) WHERE (ai_assistant_enabled = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: chats trigger_update_chats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_chats_updated_at();


--
-- Name: event_participants trigger_update_last_contact; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_last_contact AFTER INSERT OR UPDATE ON public.event_participants FOR EACH ROW EXECUTE FUNCTION public.update_last_contact();


--
-- Name: events trigger_update_last_contact_on_event; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_last_contact_on_event AFTER UPDATE OF date ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_last_contact_on_event_change();


--
-- Name: assets assets_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: assets assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: biographies biographies_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: biographies biographies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chats chats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favors favors_giver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favors
    ADD CONSTRAINT favors_giver_id_fkey FOREIGN KEY (giver_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: favors favors_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favors
    ADD CONSTRAINT favors_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: favors favors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favors
    ADD CONSTRAINT favors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: people people_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: professional_history professional_history_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professional_history
    ADD CONSTRAINT professional_history_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: relationships relationships_person_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_person_a_id_fkey FOREIGN KEY (person_a_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: relationships relationships_person_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_person_b_id_fkey FOREIGN KEY (person_b_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: relationships relationships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: assets assets_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assets_isolation ON public.assets USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: chats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

--
-- Name: chats chats_user_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY chats_user_isolation ON public.chats USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: event_participants event_participants_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY event_participants_isolation ON public.event_participants USING ((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = (current_setting('app.current_user_id'::text))::uuid))));


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY events_isolation ON public.events USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: favors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.favors ENABLE ROW LEVEL SECURITY;

--
-- Name: favors favors_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY favors_isolation ON public.favors USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_user_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY messages_user_isolation ON public.messages USING ((chat_id IN ( SELECT chats.id
   FROM public.chats
  WHERE (chats.user_id = (current_setting('app.current_user_id'::text))::uuid))));


--
-- Name: people; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

--
-- Name: people people_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY people_isolation ON public.people USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: professional_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.professional_history ENABLE ROW LEVEL SECURITY;

--
-- Name: professional_history professional_history_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY professional_history_isolation ON public.professional_history USING ((person_id IN ( SELECT people.id
   FROM public.people
  WHERE (people.user_id = (current_setting('app.current_user_id'::text))::uuid))));


--
-- Name: relationships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: relationships relationships_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY relationships_isolation ON public.relationships USING ((user_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- PostgreSQL database dump complete
--

\unrestrict GUj5rWfl9TPEVHACGyhhfCEh7nW3xV0lVbKGrea3fapX5eFsrkiTCFE3SYUKCLf

