"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function Tabs({
  tabs,
  defaultTab,
  paramName = "tab",
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get(paramName) || defaultTab || tabs[0]?.id;

  const handleTabChange = (tabId) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set(paramName, tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeTabContent = children.find(
    (child) => child.props["data-tab"] === activeTab,
  );

  return (
    <div>
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-button${activeTab === tab.id ? " active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {activeTabContent}
      </div>
    </div>
  );
}

export function TabPanel({ children, "data-tab": dataTab }) {
  return <div data-tab={dataTab}>{children}</div>;
}
