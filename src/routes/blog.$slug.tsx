import { createFileRoute, redirect } from "@tanstack/react-router";

// Blog moved to /ratgeber; keep old URLs working.
export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/ratgeber/$slug", params: { slug: params.slug }, statusCode: 301 }); },
});
