<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Every server route under src/routes/api/public/* must call guardPublicRoute() (src/lib/public-route-guard.server.ts) before any work — these routes bypass auth, so signature/token check and DB-backed rate limiting are the only protection.
- eSIM activation columns are not granted to client roles; read them only server-side after verifying ownership — prevents leaking installable eSIMs.
