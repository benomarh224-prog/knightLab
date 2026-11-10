-- Managed Neon Auth stores branch configuration beside identities. Keep all
-- existing domains and settings; add only this application's canonical origin.
update neon_auth.project_config
set trusted_origins = coalesce(trusted_origins, '[]'::jsonb)
      || '["https://knightlab.vercel.app"]'::jsonb,
    updated_at = now()
where name = 'roqvyn-accounts'
  and not coalesce(trusted_origins, '[]'::jsonb)
    @> '["https://knightlab.vercel.app"]'::jsonb;
