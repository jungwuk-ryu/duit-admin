import React, { useMemo, useState } from "react";
import { HostResponse } from "../api/types";

interface HostSearchSelectProps {
  hosts: HostResponse[];
  loading: boolean;
  value: number;
  onChange: (hostId: number) => void;
  searchPlaceholder?: string;
  selectPlaceholder?: string;
  disabled?: boolean;
}

export default function HostSearchSelect({
  hosts,
  loading,
  value,
  onChange,
  searchPlaceholder = "주최기관명을 검색하세요",
  selectPlaceholder = "주최기관을 선택하세요",
  disabled = false,
}: HostSearchSelectProps) {
  const [query, setQuery] = useState("");

  const selectedHost = useMemo(
    () => hosts.find(host => host.id === value) ?? null,
    [hosts, value]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredHosts = useMemo(() => {
    if (!normalizedQuery) {
      return hosts;
    }

    return hosts.filter(host => host.name.toLowerCase().includes(normalizedQuery));
  }, [hosts, normalizedQuery]);

  const visibleHosts = useMemo(() => {
    if (!selectedHost) {
      return filteredHosts;
    }

    const hasSelectedHost = filteredHosts.some(host => host.id === selectedHost.id);
    if (hasSelectedHost) {
      return filteredHosts;
    }

    return [selectedHost, ...filteredHosts];
  }, [filteredHosts, selectedHost]);

  const isDisabled = disabled || loading;
  const hasQuery = normalizedQuery.length > 0;
  const resultLabel = hasQuery
    ? `${filteredHosts.length}개의 검색 결과`
    : `${hosts.length}개의 주최기관`;

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        className="input"
        style={{ width: "100%", boxSizing: "border-box" }}
        placeholder={searchPlaceholder}
        disabled={isDisabled}
      />
      <select
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="select"
        style={{ width: "100%", boxSizing: "border-box" }}
        disabled={isDisabled}
        required
      >
        <option value={0}>{loading ? "로딩 중..." : selectPlaceholder}</option>
        {visibleHosts.map(host => (
          <option key={host.id} value={host.id}>
            {host.name}
          </option>
        ))}
      </select>
      <div style={{ fontSize: "12px", color: "#6b7280" }}>
        {loading
          ? "주최기관 목록을 불러오는 중입니다."
          : filteredHosts.length > 0
            ? resultLabel
            : "검색 결과가 없습니다."}
      </div>
    </div>
  );
}
