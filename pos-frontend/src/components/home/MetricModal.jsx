import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Modal from "../shared/Modal";

const MetricModal = ({ isOpen, onClose, title, data, valuePrefix = "", valueSuffix = "" }) => {
  if (!isOpen || !data || data.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} - Last 7 Days`} dashboardVariant={true}>
      <div style={{ height: 350, width: "100%", padding: "10px 0" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dash-primary)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--dash-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: "var(--dash-muted)" }} tickLine={false} axisLine={false} />
            <YAxis 
              tick={{ fill: "var(--dash-muted)" }} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `${valuePrefix}${val}${valueSuffix}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 8, color: "var(--dash-text)" }}
              itemStyle={{ color: "var(--dash-text)" }}
              formatter={(value) => [`${valuePrefix}${value}${valueSuffix}`, title]}
            />
            <Area type="monotone" dataKey="value" stroke="var(--dash-primary)" fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Modal>
  );
};

export default MetricModal;
