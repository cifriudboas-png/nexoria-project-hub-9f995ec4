CREATE OR REPLACE FUNCTION public.admin_give_item(_player uuid, _item text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF public.catalog_price(_item) IS NULL THEN RAISE EXCEPTION 'unknown_item'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _player) THEN RAISE EXCEPTION 'player_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_items WHERE user_id = _player AND item_id = _item) THEN
    RAISE EXCEPTION 'already_owned';
  END IF;
  INSERT INTO public.inventory_items (user_id, item_id) VALUES (_player, _item);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_player_items(_player uuid)
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT item_id FROM public.inventory_items WHERE user_id = _player ORDER BY acquired_at;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_give_item(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_player_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_give_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_player_items(uuid) TO authenticated;