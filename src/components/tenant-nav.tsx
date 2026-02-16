import Link from "next/link";

interface TenantNavProps {
  tenantSlug: string;
}

const NAV_LINKS = [
  { href: "", label: "Overview" },
  { href: "employees", label: "Employees" },
  { href: "lines", label: "Lines" },
  { href: "usage", label: "Usage" },
  { href: "spend", label: "Spend" },
  { href: "alerts", label: "Alerts" },
  { href: "settings", label: "Settings" },
];

export function TenantNav({ tenantSlug }: TenantNavProps) {
  return (
    <nav className="row wrap" style={{ rowGap: "0.3rem" }}>
      {NAV_LINKS.map((item) => (
        <Link key={item.label} href={`/t/${tenantSlug}/${item.href}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
