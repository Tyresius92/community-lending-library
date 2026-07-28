import type { MetaFunction } from "react-router";

import { Link } from "~/components/link/link";
import { useOptionalUser } from "~/utils";

export const meta: MetaFunction = () => [
  { title: "Community Lending Library" },
];

export default function Index() {
  const user = useOptionalUser();

  return (
    <main>
      <h1>Community Lending Library</h1>
      <p>Share tools and gear with your community, and borrow what you need.</p>

      <div>
        <Link to="/communities">Browse communities</Link>
      </div>
      <div>
        <Link to="/communities/new">Start a community</Link>
      </div>

      {user ? null : (
        <div>
          <Link to="/login">Log in</Link>
        </div>
      )}
    </main>
  );
}
