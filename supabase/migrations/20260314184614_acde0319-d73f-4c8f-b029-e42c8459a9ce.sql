-- Ensure super_admin has the same access as admin in all RLS policies that currently check only admin
DO $$
DECLARE
  p RECORD;
  updated_qual TEXT;
  updated_with_check TEXT;
  roles_clause TEXT;
  create_sql TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') LIKE '%has_role(auth.uid(), ''admin''::app_role)%'
        OR COALESCE(with_check, '') LIKE '%has_role(auth.uid(), ''admin''::app_role)%'
      )
      AND COALESCE(qual, '') NOT LIKE '%super_admin%'
      AND COALESCE(with_check, '') NOT LIKE '%super_admin%'
  LOOP
    updated_qual := CASE
      WHEN p.qual IS NULL THEN NULL
      ELSE REPLACE(
        p.qual,
        'has_role(auth.uid(), ''admin''::app_role)',
        '(has_role(auth.uid(), ''admin''::app_role) OR has_role(auth.uid(), ''super_admin''::app_role))'
      )
    END;

    updated_with_check := CASE
      WHEN p.with_check IS NULL THEN NULL
      ELSE REPLACE(
        p.with_check,
        'has_role(auth.uid(), ''admin''::app_role)',
        '(has_role(auth.uid(), ''admin''::app_role) OR has_role(auth.uid(), ''super_admin''::app_role))'
      )
    END;

    SELECT STRING_AGG(QUOTE_IDENT(r), ', ')
      INTO roles_clause
    FROM UNNEST(p.roles) AS r;

    IF roles_clause IS NULL OR roles_clause = '' THEN
      roles_clause := 'public';
    END IF;

    EXECUTE FORMAT('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);

    create_sql := FORMAT(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      p.permissive,
      p.cmd,
      roles_clause
    );

    IF updated_qual IS NOT NULL THEN
      create_sql := create_sql || FORMAT(' USING (%s)', updated_qual);
    END IF;

    IF updated_with_check IS NOT NULL THEN
      create_sql := create_sql || FORMAT(' WITH CHECK (%s)', updated_with_check);
    END IF;

    EXECUTE create_sql;
  END LOOP;
END;
$$;