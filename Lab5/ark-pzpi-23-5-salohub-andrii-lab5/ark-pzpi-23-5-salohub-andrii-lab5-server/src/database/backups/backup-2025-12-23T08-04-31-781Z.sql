--
-- PostgreSQL database dump
--

\restrict 90LENj2sLT3VzNODBHlyqBaUS2bxKSVxhBa3BIX5TMQgLQ1SZJ8DTO2WTwTNWmA

-- Dumped from database version 17.7 (bdc8956)
-- Dumped by pg_dump version 17.6 (Homebrew)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: car_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    severity character varying(20),
    description text,
    mileage integer,
    location character varying(255),
    cost numeric(10,2),
    verified_by_iot boolean DEFAULT false NOT NULL,
    document_url character varying(500),
    reported_by uuid,
    event_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: car_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_mileage integer,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    is_current boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vin character varying(17) NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    year integer NOT NULL,
    color character varying(50),
    engine_type character varying(50),
    transmission character varying(50),
    fuel_type character varying(50),
    current_mileage integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    ownership_document_url character varying(500),
    mileage_unit character varying(10) DEFAULT 'km'::character varying,
    description text,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    verified_at timestamp without time zone,
    verified_by uuid,
    verification_notes text
);


--
-- Name: iot_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iot_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    target_vin character varying(17) NOT NULL,
    active_interval integer DEFAULT 10000 NOT NULL,
    idle_interval integer DEFAULT 1800000 NOT NULL,
    battery_low_threshold integer DEFAULT 1150 NOT NULL,
    fuel_low_threshold integer DEFAULT 10 NOT NULL,
    humidity_high_threshold integer DEFAULT 80 NOT NULL,
    smoothing_alpha_fuel integer DEFAULT 10 NOT NULL,
    smoothing_alpha_battery integer DEFAULT 30 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_sync timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: iot_telemetry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iot_telemetry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    vin character varying(17) NOT NULL,
    mileage integer NOT NULL,
    fuel_level numeric(5,2),
    humidity numeric(5,2),
    battery_voltage numeric(4,2),
    engine_running boolean DEFAULT false NOT NULL,
    event_type character varying(20) DEFAULT 'periodic'::character varying NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    google_id character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicle_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    car_id uuid NOT NULL,
    check_type character varying(20) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    payment_status character varying(20) DEFAULT 'free'::character varying NOT NULL,
    report_url character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    vin character varying(17) NOT NULL
);


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: car_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.car_events (id, car_id, event_type, severity, description, mileage, location, cost, verified_by_iot, document_url, reported_by, event_date, created_at, updated_at) FROM stdin;
6587a873-6daf-47f7-bb90-eeb3bedd3808	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Regular oil change	85000	\N	\N	f	\N	\N	2023-01-15 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
e94a1ea1-7f51-4eaa-a695-7c7749fc0f73	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Tire rotation	95000	\N	\N	f	\N	\N	2023-05-20 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
2b4e4746-137b-4c1d-8aac-bbc7716baf46	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Brake inspection	105000	\N	\N	f	\N	\N	2023-09-10 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
92d41b95-ef8d-4cd6-a52a-2c9a4beee0ce	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Battery check	120000	\N	\N	f	\N	\N	2024-03-15 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
4a19a0f0-1b6c-4e62-876f-e69bd6e1c3e7	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	inspection	info	Annual inspection	130000	\N	\N	f	\N	\N	2024-06-20 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
f0e377f8-23f9-478e-aa63-398d71c432e9	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Regular service	123000	\N	\N	f	\N	\N	2024-10-15 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
e917314c-b0b5-4969-9c63-e32ad7971c17	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	service	info	Routine maintenance	136100	\N	\N	f	\N	\N	2024-11-01 00:00:00	2025-12-13 12:16:07.1753	2025-12-13 12:16:07.1753
\.


--
-- Data for Name: car_owners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.car_owners (id, car_id, user_id, started_mileage, started_at, ended_at, is_current, created_at) FROM stdin;
391d75ce-1616-49a5-8fb3-24ea68ffc665	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	574958bb-a762-478d-ae4f-c25e20e61978	136190	2025-11-25 14:48:19.980964	\N	t	2025-11-25 14:48:19.980964
cfc2f69c-d091-4c89-8499-20e238e27d51	af7c257a-e210-4c04-af40-e64c5abd9288	d39a47a7-dbb0-4c58-b73e-4bccdee3763a	98200	2025-12-16 19:54:18.087282	\N	t	2025-12-16 19:54:18.087282
\.


--
-- Data for Name: cars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cars (id, vin, make, model, year, color, engine_type, transmission, fuel_type, current_mileage, status, risk_score, risk_level, ownership_document_url, mileage_unit, description, is_verified, created_at, updated_at, verified_at, verified_by, verification_notes) FROM stdin;
af7c257a-e210-4c04-af40-e64c5abd9288	WAUZZZF50KA123456	AUDI	A4	2019	Black	2.0L TFSI	7-speed S tronic	Gasoline	98200	active	0	low	https://en.wikipedia.org/wiki/Audi_A4	km	Imported from Germany, fully serviced, no major accidents	f	2025-12-16 19:54:17.667157	2025-12-16 19:54:17.667157	\N	\N	\N
64a2b8d2-09b3-485f-b3f6-cc115ace9da0	ZACNJBBB1LPL49421	JEEP	RENEGADE	2020	Black	2.4L I4 gasoline	9-speed automatic	Gasoline	136100	active	40	medium	https://uk.wikipedia.org/wiki/%D0%93%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%B0_%D1%81%D1%82%D0%BE%D1%80%D1%96%D0%BD%D0%BA%D0%B0	km	Second owner, the car was bought at auction in America after an accident	t	2025-11-25 14:48:19.917552	2025-12-23 07:52:44.928	2025-12-17 06:14:47.389	a189253e-3644-49de-a543-08e48801ac8c	Some notes
\.


--
-- Data for Name: iot_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.iot_config (id, car_id, target_vin, active_interval, idle_interval, battery_low_threshold, fuel_low_threshold, humidity_high_threshold, smoothing_alpha_fuel, smoothing_alpha_battery, enabled, last_sync, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iot_telemetry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.iot_telemetry (id, car_id, vin, mileage, fuel_level, humidity, battery_voltage, engine_running, event_type, "timestamp", created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, google_id, first_name, last_name, role, is_blocked, email_verified, created_at, updated_at) FROM stdin;
574958bb-a762-478d-ae4f-c25e20e61978	facyar1@gmail.com	$2b$10$gnqZ/5v/j8vE12HMBGihbOBq5/IIxK9xLTjZ14b9cAXREs8BBwgni	\N	Andrii	Salohub	user	f	t	2025-11-25 14:47:34.022788	2025-12-07 20:27:16.096
a189253e-3644-49de-a543-08e48801ac8c	admin@gmail.com	$2b$10$HNRGdFHO0m/NkmC9OEpOfeoOJxBmrGhd4CijwKuU516NqT1DHdtRa	\N	Andrii	Salohub	admin	f	t	2025-11-30 18:58:16.104319	2025-11-30 18:58:51.404
d39a47a7-dbb0-4c58-b73e-4bccdee3763a	andrii.salohub@nure.ua	$2b$10$HNRGdFHO0m/NkmC9OEpOfeoOJxBmrGhd4CijwKuU516NqT1DHdtRa	\N	Andrii	Salohub	user	f	t	2025-11-26 07:17:16.894392	2025-11-26 07:17:56.177
2230db4d-4b99-49e4-934b-90c01c2a6abd	andrejsalogub3@gmail.com	$2b$10$/bAvv9oW9OJPEiSvNEQ4puKwj1R4Dg9vcoi8jus3pcq.i1vUIB94C	\N	Andrii	Salohub	admin	f	t	2025-11-30 18:58:16.104319	2025-11-30 18:58:51.404
\.


--
-- Data for Name: vehicle_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_checks (id, user_id, car_id, check_type, price, payment_status, report_url, created_at, vin) FROM stdin;
684b20b6-9b5d-44ae-a240-8c465eaad285	574958bb-a762-478d-ae4f-c25e20e61978	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	basic	0.00	free	\N	2025-11-25 16:24:29.12	ZACNJBBB1LPL49421
7f84130d-9fda-49be-856e-5049fd43e1a8	574958bb-a762-478d-ae4f-c25e20e61978	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	extended	0.00	free	\N	2025-11-25 16:25:02.983	ZACNJBBB1LPL49421
816c14f3-16d5-4d97-a22b-56da35f5c859	574958bb-a762-478d-ae4f-c25e20e61978	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	extended	0.00	free	\N	2025-11-25 16:27:00.844	ZACNJBBB1LPL49421
bec0a13f-3e33-4d8d-9629-c733a88502a3	574958bb-a762-478d-ae4f-c25e20e61978	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	extended	0.00	free	\N	2025-11-25 16:27:50.904766	ZACNJBBB1LPL49421
037e80b8-5fc6-431a-b645-52f212218575	574958bb-a762-478d-ae4f-c25e20e61978	64a2b8d2-09b3-485f-b3f6-cc115ace9da0	extended	0.00	free	\N	2025-11-26 06:31:22.423123	ZACNJBBB1LPL49421
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_codes (id, user_id, code, expires_at, created_at) FROM stdin;
\.


--
-- Name: car_events car_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_events
    ADD CONSTRAINT car_events_pkey PRIMARY KEY (id);


--
-- Name: car_owners car_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_owners
    ADD CONSTRAINT car_owners_pkey PRIMARY KEY (id);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: cars cars_vin_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_vin_unique UNIQUE (vin);


--
-- Name: iot_config iot_config_car_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_config
    ADD CONSTRAINT iot_config_car_id_unique UNIQUE (car_id);


--
-- Name: iot_config iot_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_config
    ADD CONSTRAINT iot_config_pkey PRIMARY KEY (id);


--
-- Name: iot_telemetry iot_telemetry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_telemetry
    ADD CONSTRAINT iot_telemetry_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_checks vehicle_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_unique UNIQUE (user_id);


--
-- Name: car_events car_events_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_events
    ADD CONSTRAINT car_events_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: car_events car_events_reported_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_events
    ADD CONSTRAINT car_events_reported_by_users_id_fk FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: car_owners car_owners_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_owners
    ADD CONSTRAINT car_owners_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: car_owners car_owners_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_owners
    ADD CONSTRAINT car_owners_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cars cars_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: iot_config iot_config_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_config
    ADD CONSTRAINT iot_config_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: iot_telemetry iot_telemetry_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_telemetry
    ADD CONSTRAINT iot_telemetry_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: vehicle_checks vehicle_checks_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: vehicle_checks vehicle_checks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: verification_codes verification_codes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 90LENj2sLT3VzNODBHlyqBaUS2bxKSVxhBa3BIX5TMQgLQ1SZJ8DTO2WTwTNWmA

