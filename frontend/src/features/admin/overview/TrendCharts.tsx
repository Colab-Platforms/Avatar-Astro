import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bucketLabel, fmtRupees } from "./format";

const CHART_COLORS = { primary: "#803003", accent: "#E58A45", ink: "#33251D", grid: "#E8E3DC", good: "#2F7D5B", bad: "#B3261E" } as const;
type Bucket = "hour" | "day";

const axis = { fontSize: 11, fill: "#6B6259" } as const;
const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid #E8E3DC" } as const;

/** Fixed-height frame; the summary is the text alternative for the chart. */
function Frame({ summary, children, height = 210 }: { summary: string; children: ReactNode; height?: number }) {
  return <div role="img" aria-label={summary} style={{ height }} className="w-full">{children}</div>;
}

/** Few ticks on long ranges so the axis stays readable. */
const tickEvery = (n: number) => Math.max(0, Math.ceil(n / 7) - 1);

interface Point { t: string }

export function TrendArea<T extends Point>({ data, dataKey, name, bucket, color = CHART_COLORS.primary, summary }: { data: T[]; dataKey: keyof T & string; name: string; bucket: Bucket; color?: string; summary: string }) {
  return (
    <Frame summary={summary}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(k) => bucketLabel(k, bucket)} tick={axis} interval={tickEvery(data.length)} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(k) => bucketLabel(String(k), bucket)} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.14} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function RevenueBars({ data, bucket, summary }: { data: { t: string; paise: number }[]; bucket: Bucket; summary: string }) {
  return (
    <Frame summary={summary}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(k) => bucketLabel(k, bucket)} tick={axis} interval={tickEvery(data.length)} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(p) => fmtRupees(Number(p))} width={64} />
          <Tooltip labelFormatter={(k) => bucketLabel(String(k), bucket)} formatter={(v) => [fmtRupees(Number(v)), "Revenue"]} contentStyle={tooltipStyle} />
          <Bar dataKey="paise" name="Revenue" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function TransactionBars({ data, bucket, summary }: { data: { t: string; success: number; failed: number }[]; bucket: Bucket; summary: string }) {
  return (
    <Frame summary={summary}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(k) => bucketLabel(k, bucket)} tick={axis} interval={tickEvery(data.length)} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(k) => bucketLabel(String(k), bucket)} contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="success" name="Successful" stackId="tx" fill={CHART_COLORS.good} />
          <Bar dataKey="failed" name="Failed" stackId="tx" fill={CHART_COLORS.bad} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function ActivityLines({ data, bucket, summary }: { data: { t: string; activeCustomers: number; events: number }[]; bucket: Bucket; summary: string }) {
  return (
    <Frame summary={summary}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(k) => bucketLabel(k, bucket)} tick={axis} interval={tickEvery(data.length)} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(k) => bucketLabel(String(k), bucket)} contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="activeCustomers" name="Active customers" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="events" name="Recorded actions" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function ToolBars({ data, summary }: { data: { label: string; requests: number; errors: number }[]; summary: string }) {
  return (
    <Frame summary={summary} height={Math.max(210, data.length * 30 + 40)}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" tick={axis} width={150} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="requests" name="Requests" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} />
          <Bar dataKey="errors" name="Failed" fill={CHART_COLORS.bad} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
