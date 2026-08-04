import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Community Lending Library" },
];

export default function Index() {
  return (
    <main>
      <h1>Community Lending Library</h1>
      <p>Share tools and gear with your community, and borrow what you need.</p>
    </main>
  );
}
