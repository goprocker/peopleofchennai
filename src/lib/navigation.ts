export interface NavItem {
  href: string;
  label: string;
}

export const primaryNav: NavItem[] = [
  { href: "/people", label: "People" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
  { href: "/nominate", label: "Nominate" },
];

export const submitCta: NavItem = { href: "/submit", label: "Share your story" };

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Explore",
    items: [
      { href: "/people", label: "People" },
      { href: "/stories", label: "Stories" },
      { href: "/about", label: "About the project" },
    ],
  },
  {
    heading: "Take part",
    items: [
      { href: "/submit", label: "Share your story" },
      { href: "/nominate", label: "Nominate someone" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    heading: "The fine print",
    items: [
      { href: "/editorial-policy", label: "Editorial policy" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

/** True when `pathname` is `href` or a page beneath it. */
export const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
