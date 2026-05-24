-- ============================================================
-- 0022 — Security definer functions for post/comment deletion
-- Bypasses RLS entirely; all permission logic lives in SQL.
-- ============================================================

-- 1) Delete post (author or admin)
create or replace function public.delete_post(post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_author_id uuid;
  v_post_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception '请先登录';
  end if;

  select coalesce(is_admin, false) into v_is_admin
  from profiles where id = v_user_id;

  select author_id into v_author_id
  from posts where id = post_id;

  if v_author_id is null then
    raise exception '帖子不存在';
  end if;

  if v_user_id != v_author_id and not v_is_admin then
    raise exception '无权限';
  end if;

  update posts
  set is_deleted = true,
      deleted_by = v_user_id,
      deleted_at = now(),
      updated_at = now()
  where id = post_id;
end;
$$;

grant execute on function public.delete_post(uuid) to authenticated;

-- 2) Delete comment (author or admin)
create or replace function public.delete_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_author_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception '请先登录';
  end if;

  select coalesce(is_admin, false) into v_is_admin
  from profiles where id = v_user_id;

  select author_id into v_author_id
  from comments where id = comment_id;

  if v_author_id is null then
    raise exception '评论不存在';
  end if;

  if v_user_id != v_author_id and not v_is_admin then
    raise exception '无权限';
  end if;

  update comments
  set is_deleted = true,
      deleted_by = v_user_id,
      deleted_at = now(),
      updated_at = now()
  where id = comment_id;
end;
$$;

grant execute on function public.delete_comment(uuid) to authenticated;

-- 3) Batch delete user content (admin only)
create or replace function public.admin_delete_user_content(target_user_id uuid)
returns table(posts_count bigint, comments_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_posts_count bigint;
  v_comments_count bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception '请先登录';
  end if;

  select coalesce(is_admin, false) into v_is_admin
  from profiles where id = v_user_id;

  if not v_is_admin then
    raise exception '无权限';
  end if;

  update posts
  set is_deleted = true,
      deleted_by = v_user_id,
      deleted_at = now(),
      updated_at = now()
  where author_id = target_user_id and is_deleted = false;
  get diagnostics v_posts_count = row_count;

  update comments
  set is_deleted = true,
      deleted_by = v_user_id,
      deleted_at = now(),
      updated_at = now()
  where author_id = target_user_id and is_deleted = false;
  get diagnostics v_comments_count = row_count;

  return query select v_posts_count, v_comments_count;
end;
$$;

grant execute on function public.admin_delete_user_content(uuid) to authenticated;
