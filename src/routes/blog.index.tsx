import { createFileRoute, redirect } from "@tanstack/react-router";

// Blog moved to /ratgeber; keep old URLs working.
export const Route = createFileRoute("/blog/")({
  beforeLoad: () => { throw redirect({ to: "/ratgeber", statusCode: 301 }); },
});
