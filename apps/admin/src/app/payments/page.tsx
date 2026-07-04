"use client";

import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div>
      <div className="card">
        <div className="empty-state">
          <CreditCard size={48} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "1rem 0 0.5rem", color: "#374151" }}>
            支付与订单模块
          </h3>
          <p style={{ fontSize: "0.875rem" }}>此模块计划在 MVP 之后开发（P1）</p>
          <p style={{ fontSize: "0.875rem" }}>将包含：支付记录查询、订单管理、Creem 退款、收入概览</p>
        </div>
      </div>
    </div>
  );
}
