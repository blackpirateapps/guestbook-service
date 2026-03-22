import { useSearchParams } from "react-router-dom";

export default function Tabs({
  tabs,
  defaultTab,
  paramName = "tab",
  children,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramName) || defaultTab || tabs[0]?.id;

  const handleTabChange = (tabId) => {
    setSearchParams({ [paramName]: tabId });
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
