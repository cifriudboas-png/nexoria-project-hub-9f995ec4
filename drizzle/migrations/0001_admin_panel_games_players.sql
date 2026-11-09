-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "select_own_roles" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- The account named "nexoria" is the admin.
CREATE OR REPLACE FUNCTION public.grant_nexoria_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username = 'nexoria' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_nexoria_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_profile_created_grant_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_nexoria_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.profiles WHERE username = 'nexoria'
ON CONFLICT (user_id, role) DO NOTHING;

-- Banned players
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- Games
CREATE TABLE public.games (
  id text PRIMARY KEY,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'box',
  theme text NOT NULL DEFAULT 'emerald',
  is_private boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_reads_public_games" ON public.games FOR SELECT
  TO anon, authenticated USING (is_private = false);

CREATE POLICY "admins_read_all_games" ON public.games FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.games (id, title, icon, theme, sort_order) VALUES
  ('pizza_tycoon', 'Pizza Tycoon', 'pizza', 'pizza', 1),
  ('bomb_survival', 'Bomb Survival', 'bomb', 'bomb', 2),
  ('video_factory', 'Video Factory', 'youtube', 'video', 3),
  ('ride_the_box', 'Ride the Box', 'box', 'box', 4);

-- Admin commands
CREATE OR REPLACE FUNCTION public.admin_delete_game(_game text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.games WHERE id = _game;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_game_private(_game text, _private boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.games SET is_private = _private WHERE id = _game;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_players(_search text)
RETURNS TABLE (
  id uuid,
  username text,
  account_number bigint,
  created_at timestamptz,
  nexos bigint,
  banned boolean,
  is_admin boolean,
  equipped_shirt text,
  equipped_hair text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.username, p.account_number, p.created_at, p.nexos, p.banned,
           public.has_role(p.id, 'admin'), p.equipped_shirt, p.equipped_hair
    FROM public.profiles p
    WHERE coalesce(_search, '') = '' OR p.username ILIKE '%' || _search || '%'
    ORDER BY p.account_number
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_give_nexos(_player uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 1000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  UPDATE public.profiles SET nexos = nexos + _amount WHERE id = _player;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_banned(_player uuid, _banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF public.has_role(_player, 'admin') THEN RAISE EXCEPTION 'cannot_ban_admin'; END IF;
  UPDATE public.profiles SET banned = _banned WHERE id = _player;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_game(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_game_private(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_players(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_give_nexos(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_banned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_game(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_game_private(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_players(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_give_nexos(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) TO authenticated;